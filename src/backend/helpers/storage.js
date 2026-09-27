/* Supabase Storage (S3-compatible) — upload / delete images.
 *
 * Supabase exposes two different paths on the same host:
 *   …/storage/v1/s3            → the S3 API. Every read needs a SigV4 signature.
 *   …/storage/v1/object/public → anonymous reads, for a bucket marked public.
 *
 * ENDPOINT_URL points at the first one (that is what the SDK must talk to), so
 * an <img src> built from it answers 403 AccessDenied. publicUrl() rewrites the
 * host path to the second form — that is the only URL worth storing in Mongo.
 *
 * Everything that lands in the bucket is re-encoded to JPEG, whatever came in:
 * iPhone HEIC, PNG with alpha, WebP, TIFF, an animated GIF's first frame. sharp
 * decoding the buffer *is* the "is this really an image?" check — the browser's
 * Content-Type is a claim, not evidence (iOS often sends HEIC photos as
 * application/octet-stream).
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const multer = require('multer');

const ENDPOINT = String(process.env.ENDPOINT_URL || '').replace(/\/+$/, '');
const BUCKET = process.env.STORAGE_BUCKET || 'bucketsupa';

// Strip a trailing /storage/v1/s3 (or /s3) to get back to the project host.
const HOST = ENDPOINT.replace(/\/storage\/v1\/s3$/, '').replace(/\/s3$/, '');
const PUBLIC_BASE = `${HOST}/storage/v1/object/public`;

const s3 = new S3Client({
    region: process.env.REGION || 'us-east-1',
    endpoint: ENDPOINT,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    },
    forcePathStyle: true,
});

/** Anonymous-read URL for a stored object. Safe to put in an <img src>. */
function publicUrl(key) {
    if (!key) return '';
    if (/^https?:\/\//i.test(key)) return normalizeUrl(key);
    return `${PUBLIC_BASE}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** Repair a URL that was stored with the signed-only /storage/v1/s3 path. */
function normalizeUrl(url) {
    if (!url) return '';
    return String(url).replace('/storage/v1/s3/', '/storage/v1/object/public/');
}

/** Object key back out of a public URL — for deleting rows that predate imageKey. */
function keyFromUrl(url) {
    if (!url) return '';
    const m = String(url).match(/\/storage\/v1\/(?:object\/public|s3)\/[^/]+\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : '';
}

/* ── image processing ───────────────────────────────────────────────────────── */

const MAX_EDGE = 2000; // nothing in this app needs more than this

/**
 * Decode anything sharp understands and re-encode it as JPEG.
 * Throws a 415 if the buffer is not a decodable image.
 *
 * `width`/`height` both set → hard crop to that box (fit: cover, centred).
 * Neither set → keep the natural ratio, capped at MAX_EDGE on the long side.
 */
async function toJpeg(buffer, { width = null, height = null, quality = 86 } = {}) {
    let meta;
    try {
        meta = await sharp(buffer).metadata();
    } catch {
        const err = new Error('El archivo no es una imagen válida.');
        err.status = 415;
        throw err;
    }
    if (!meta.width || !meta.height) {
        const err = new Error('El archivo no es una imagen válida.');
        err.status = 415;
        throw err;
    }

    // .rotate() with no argument applies the EXIF orientation tag, which is how
    // iPhone photos encode "this was shot in portrait". Without it they upload
    // sideways.
    const pipeline = sharp(buffer, { animated: false }).rotate();

    if (width && height) {
        pipeline.resize(Math.round(width), Math.round(height), { fit: 'cover', position: 'center' });
    } else {
        pipeline.resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true });
    }

    // flatten() drops alpha onto white — JPEG has no transparency, and without
    // this a transparent PNG comes out with a black background.
    const out = await pipeline
        .flatten({ background: '#ffffff' })
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
        .toBuffer({ resolveWithObject: true });

    return { buffer: out.data, width: out.info.width, height: out.info.height, bytes: out.data.length };
}

/**
 * Re-encode to JPEG and store it. Always writes a .jpg object.
 *
 * Legacy positional form `uploadImage(buf, folder, 800, 800)` still works; the
 * options form `uploadImage(buf, folder, { width, height, quality })` is preferred.
 */
async function uploadImage(buffer, folder, opts = {}, legacyHeight) {
    const options = typeof opts === 'number' ? { width: opts, height: legacyHeight } : opts;

    const img = await toJpeg(buffer, options);
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: img.buffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    return { url: publicUrl(key), key, width: img.width, height: img.height, bytes: img.bytes };
}

async function deleteImage(key) {
    if (!key) return;
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
        // A missing object should never block deleting the row that pointed at it.
        console.error('Error deleting image:', e.message);
    }
}

/* ── upload middleware ──────────────────────────────────────────────────────── */

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp|tiff?)$/i;

/**
 * multer.single() for one image, with its errors translated into HTTP statuses
 * the central error handler understands (raw MulterErrors carry no .status and
 * would surface as a 500).
 *
 * The filter here is deliberately loose — it only rejects things that clearly
 * are not images. toJpeg() is the real gate.
 */
function imageUpload({ field = 'image', maxMb = 25 } = {}) {
    const mw = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
        fileFilter: (req, file, cb) => {
            const mime = String(file.mimetype || '');
            const looksLikeImage = mime.startsWith('image/')
                || mime === 'application/octet-stream'   // iOS sends HEIC like this
                || IMAGE_EXT.test(file.originalname || '');
            if (!looksLikeImage) {
                const err = new Error('Solo se permiten imágenes.');
                err.status = 415;
                return cb(err);
            }
            cb(null, true);
        },
    }).single(field);

    return function (req, res, next) {
        mw(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                err.status = 413;
                err.message = `La imagen supera el límite de ${maxMb} MB.`;
            } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                err.status = 400;
                err.message = 'Se esperaba un solo archivo de imagen.';
            } else if (!err.status) {
                err.status = 400;
            }
            next(err);
        });
    };
}

module.exports = {
    uploadImage,
    deleteImage,
    toJpeg,
    publicUrl,
    normalizeUrl,
    keyFromUrl,
    imageUpload,
    BUCKET,
    PUBLIC_BASE,
};

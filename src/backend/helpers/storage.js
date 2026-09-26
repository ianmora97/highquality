const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({
    region: process.env.REGION || 'us-east-1',
    endpoint: process.env.ENDPOINT_URL,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.STORAGE_BUCKET || 'bucketsupa';

async function uploadImage(buffer, folder, width = 800, height = 800) {
    const optimized = await sharp(buffer)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: optimized,
        ContentType: 'image/webp',
        ACL: 'public-read',
    }));

    const url = `${process.env.ENDPOINT_URL}/${BUCKET}/${key}`;
    return { url, key };
}

async function deleteImage(key) {
    if (!key) return;
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
        console.error('Error deleting image:', e.message);
    }
}

module.exports = { uploadImage, deleteImage };

/* Crop presets offered by the gallery uploader.
 *
 * Source of truth for the server. The same table is mirrored client-side in
 * `src/public/js/admin/galeria.js` (GALLERY_ASPECTS) so Cropper can lock the
 * selection box before anything is uploaded — keep the two in sync.
 *
 * The output box is what gets stored; the client crop is only a preview of it.
 * `ratio: null` ("Libre") keeps whatever the user framed, capped by storage.js.
 */

const ASPECTS = {
    '1:1':   { label: 'Cuadrado',  ratio: 1,       width: 1440, height: 1440 },
    '4:5':   { label: 'Retrato',   ratio: 4 / 5,   width: 1280, height: 1600 },
    '4:3':   { label: 'Clásico',   ratio: 4 / 3,   width: 1600, height: 1200 },
    '3:4':   { label: 'Vertical',  ratio: 3 / 4,   width: 1200, height: 1600 },
    '16:9':  { label: 'Panorámica', ratio: 16 / 9, width: 1920, height: 1080 },
    'libre': { label: 'Libre',     ratio: null,    width: null, height: null },
};

const DEFAULT_ASPECT = '4:5';

/** Normalize whatever the client sent into a known key. */
function resolveAspect(key) {
    return ASPECTS[key] ? key : DEFAULT_ASPECT;
}

/** Output box for a key — `{ width: null, height: null }` means "keep the ratio". */
function boxFor(key) {
    const a = ASPECTS[resolveAspect(key)];
    return { width: a.width, height: a.height };
}

module.exports = { ASPECTS, DEFAULT_ASPECT, resolveAspect, boxFor };

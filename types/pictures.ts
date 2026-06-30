/**
 * A pair of image URLs for a logo / avatar. Values are stored-file URLs of the
 * form `/api/uploads/<hash>.webp` (see `pictureStorage.server.ts`); legacy rows
 * may still hold base64 data-URLs until the backfill migration has run.
 * - `fullPicture`: the complete uploaded image (resized down for storage),
 *   shown when previewing at large size.
 * - `croppedPicture`: a square crop chosen by the user, shown wherever a
 *   round/square thumbnail is rendered.
 */
export interface PicturePair {
  fullPicture: string;
  croppedPicture: string;
}

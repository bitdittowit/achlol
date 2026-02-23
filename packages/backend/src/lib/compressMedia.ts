import sharp from "sharp";

const MAX_SIDE = 1024;
const JPEG_QUALITY = 80;

/**
 * Resize image for prank media: max 1024px on longer side, JPEG quality 80%.
 * PNG is resized but kept as PNG (no re-encode).
 */
export async function compressMediaImage(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; ext: string }> {
  const isPng = mimetype === "image/png";
  const pipeline = sharp(buffer)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true });

  if (isPng) {
    const out = await pipeline.png().toBuffer();
    return { buffer: out, ext: ".png" };
  }
  const out = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
  return { buffer: out, ext: ".jpg" };
}

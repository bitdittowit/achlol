import sharp from "sharp";
import { getStorageAdapter } from "../lib/adapters/index.js";
import { iconRelativePath, uniqueFilename } from "../lib/storage.js";

const SIZE = 128;

function hashToRgb(str: string): [number, number, number] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & 0xffffff;
  }
  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;
  return [r, g, b];
}

/**
 * Generate a circular icon with the first letter of the title and a background color from title hash.
 * Saves to uploads/icons/<uuid>.png and returns the relative path.
 */
export async function generateIconFromTitle(title: string): Promise<string> {
  const letter = (title.trim().charAt(0) || "?").toUpperCase();
  const [r, g, b] = hashToRgb(title);
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  const textColor = (r * 0.299 + g * 0.587 + b * 0.114) > 140 ? "#1a1a1a" : "#ffffff";

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  /* dy: librsvg often ignores dominant-baseline; shift baseline down so capital letter is visually centered */
  const svg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cx}" cy="${cy}" r="${cx}" fill="${hex}"/>
  <text
    x="${cx}"
    y="${cy}"
    dy="0.4em"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="56"
    font-weight="bold"
    fill="${textColor}"
  >${escapeXml(letter)}</text>
</svg>`;

  const filename = uniqueFilename(".png");
  const relativePath = iconRelativePath(filename);
  const buffer = await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toBuffer();
  await getStorageAdapter().upload(relativePath, buffer, "image/png");
  return relativePath;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Crop uploaded image to circle and save. Returns relative path.
 */
export async function processUploadedIcon(buffer: Buffer, mime: string): Promise<string> {
  const ext = mime === "image/png" ? ".png" : ".jpg";
  const filename = uniqueFilename(ext);
  const relativePath = iconRelativePath(filename);

  const half = SIZE / 2;
  const circleSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${half}" cy="${half}" r="${half}" fill="black"/>
</svg>`;

  const outBuffer = await sharp(buffer)
    .resize(SIZE, SIZE)
    .composite([{ input: Buffer.from(circleSvg), blend: "dest-in" }])
    .png()
    .toBuffer();
  await getStorageAdapter().upload(relativePath, outBuffer, "image/png");
  return relativePath;
}

import path from "node:path";
import sharp from "sharp";
import { iconRelativePath, uniqueFilename, fullPath } from "../lib/storage.js";

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

  const svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="${hex}"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="56"
    font-weight="bold"
    fill="${textColor}"
  >${escapeXml(letter)}</text>
</svg>`;

  const filename = uniqueFilename(".png");
  const relativePath = iconRelativePath(filename);
  const outputPath = fullPath(relativePath);

  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(outputPath);

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
  const outputPath = fullPath(relativePath);

  const half = SIZE / 2;
  const circleSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${half}" cy="${half}" r="${half}" fill="black"/>
</svg>`;

  await sharp(buffer)
    .resize(SIZE, SIZE)
    .composite([{ input: Buffer.from(circleSvg), blend: "dest-in" }])
    .png()
    .toFile(outputPath);

  return relativePath;
}

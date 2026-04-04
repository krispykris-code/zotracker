import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/logo.svg');
const svg = readFileSync(svgPath);

async function generate() {
  await sharp(svg, { density: 300 })
    .resize(192, 192)
    .png()
    .toFile(resolve(__dirname, '../public/icon-192.png'));
  console.log('✅ icon-192.png generated');

  await sharp(svg, { density: 300 })
    .resize(512, 512)
    .png()
    .toFile(resolve(__dirname, '../public/icon-512.png'));
  console.log('✅ icon-512.png generated');

  // Also generate apple-touch-icon (180x180)
  await sharp(svg, { density: 300 })
    .resize(180, 180)
    .png()
    .toFile(resolve(__dirname, '../public/apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png generated');
}

generate().catch(console.error);

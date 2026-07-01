#!/usr/bin/env node
'use strict';

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

// Brand colors
const BG_HEX = '#111827';
const BG = { r: 17, g: 24, b: 39, alpha: 1 };

// Three diagonal claw marks, viewBox 0 0 84 100
const CLAWS_SVG = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 84 100">
  <path d="M0 0L16 0L44 100L28 100Z" fill="#F5C800"/>
  <path d="M22 0L38 0L66 100L50 100Z" fill="#F5C800" opacity="0.82"/>
  <path d="M44 0L58 0L84 100L70 100Z" fill="#F5C800" opacity="0.62"/>
</svg>`;

// Claw SVG on transparent bg (for bootsplash logo input)
const LOGO_TRANSPARENT_SVG = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 84 100">
  <path d="M0 0L16 0L44 100L28 100Z" fill="#F5C800"/>
  <path d="M22 0L38 0L66 100L50 100Z" fill="#F5C800" opacity="0.82"/>
  <path d="M44 0L58 0L84 100L70 100Z" fill="#F5C800" opacity="0.62"/>
</svg>`;

// Icon sizes per density
const ICON_SIZES = {
  'mipmap-mdpi':   48,
  'mipmap-hdpi':   72,
  'mipmap-xhdpi':  96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi':192,
  'mipmap-ldpi':   36,
};

// Bootsplash logo width at mdpi (1x), scaled per density
const BOOT_LOGO_WIDTH_MDPI = 100;
const DENSITY_SCALE = {
  'mipmap-ldpi':    0.75,
  'mipmap-mdpi':    1.0,
  'mipmap-hdpi':    1.5,
  'mipmap-xhdpi':   2.0,
  'mipmap-xxhdpi':  3.0,
  'mipmap-xxxhdpi': 4.0,
};

async function generateIcon(iconSize, outputPath) {
  // Claw occupies ~70% of the icon height, centered
  const clawH = Math.round(iconSize * 0.70);
  const clawW = Math.round(clawH * 84 / 100);

  const bg = await sharp({
    create: { width: iconSize, height: iconSize, channels: 4, background: BG }
  }).png().toBuffer();

  const claw = await sharp(Buffer.from(CLAWS_SVG(clawW, clawH)))
    .resize(clawW, clawH)
    .png()
    .toBuffer();

  const left = Math.round((iconSize - clawW) / 2);
  const top  = Math.round((iconSize - clawH) / 2);

  await sharp(bg)
    .composite([{ input: claw, top, left }])
    .png()
    .toFile(outputPath);

  console.log(`  icon ${iconSize}x${iconSize} -> ${path.relative(ROOT, outputPath)}`);
}

async function generateBootsplashLogo(logoW, outputPath) {
  const logoH = Math.round(logoW * 100 / 84);

  await sharp(Buffer.from(LOGO_TRANSPARENT_SVG(logoW, logoH)))
    .resize(logoW, logoH)
    .png()
    .toFile(outputPath);

  console.log(`  bootsplash logo ${logoW}x${logoH} -> ${path.relative(ROOT, outputPath)}`);
}

async function main() {
  console.log('\n=== Generating Raptor Flex Driver brand assets ===\n');

  // 1. Icons in main res
  const mainResDir = path.join(ROOT, 'android/app/src/main/res');
  console.log('--- Main icons ---');
  for (const [density, size] of Object.entries(ICON_SIZES)) {
    if (density === 'mipmap-ldpi') continue; // ldpi not in main res
    const dir = path.join(mainResDir, density);
    if (!fs.existsSync(dir)) { console.log(`  skip (dir not found): ${density}`); continue; }
    await generateIcon(size, path.join(dir, 'ic_launcher.png'));
    await generateIcon(size, path.join(dir, 'ic_launcher_round.png'));
  }

  // 2. Icons in debug res
  const debugResDir = path.join(ROOT, 'android/app/src/debug/res');
  console.log('\n--- Debug icons ---');
  for (const [density, size] of Object.entries(ICON_SIZES)) {
    const dir = path.join(debugResDir, density);
    if (!fs.existsSync(dir)) { console.log(`  skip (dir not found): ${density}`); continue; }
    await generateIcon(size, path.join(dir, 'ic_launcher.png'));
    await generateIcon(size, path.join(dir, 'ic_launcher_round.png'));
  }

  // 3. Bootsplash logos in main res
  console.log('\n--- Bootsplash logos ---');
  for (const [density, scale] of Object.entries(DENSITY_SCALE)) {
    if (density === 'mipmap-ldpi') continue; // bootsplash doesn't use ldpi
    const dir = path.join(mainResDir, density);
    if (!fs.existsSync(dir)) { console.log(`  skip (dir not found): ${density}`); continue; }
    const logoW = Math.round(BOOT_LOGO_WIDTH_MDPI * scale);
    await generateBootsplashLogo(logoW, path.join(dir, 'bootsplash_logo.png'));
  }

  // 4. Generate splash-screen.png (source logo for generate-bootsplash cmd, transparent bg)
  console.log('\n--- Splash source logo ---');
  const splashLogoW = 840; // high res source
  const splashLogoH = Math.round(splashLogoW * 100 / 84);
  const splashOut = path.join(ROOT, 'assets/splash-screen.png');
  await sharp(Buffer.from(LOGO_TRANSPARENT_SVG(splashLogoW, splashLogoH)))
    .resize(splashLogoW, splashLogoH)
    .png()
    .toFile(splashOut);
  console.log(`  splash source: assets/splash-screen.png (${splashLogoW}x${splashLogoH})`);

  console.log('\n=== Done ===\n');
}

main().catch(err => { console.error(err); process.exit(1); });

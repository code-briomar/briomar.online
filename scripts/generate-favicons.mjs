import sharp from 'sharp';
import fs from 'fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#000000"/>
  <rect x="2" y="2" width="124" height="124" rx="26" fill="none" stroke="#2a2a2a" stroke-width="4"/>
  <text x="64" y="82" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="900" font-size="54" fill="#ffffff" text-anchor="middle" letter-spacing="-1">BR</text>
</svg>`;

async function run() {
  fs.writeFileSync('public/favicon.svg', svg.trim());
  console.log('Saved public/favicon.svg');

  const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  const png48 = await sharp(Buffer.from(svg)).resize(48, 48).png().toBuffer();
  const png180 = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  const png192 = await sharp(Buffer.from(svg)).resize(192, 192).png().toBuffer();
  const png512 = await sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer();

  fs.writeFileSync('public/apple-touch-icon.png', png180);
  fs.writeFileSync('public/favicon-192.png', png192);
  fs.writeFileSync('public/favicon-512.png', png512);
  fs.writeFileSync('public/favicon.png', png32);

  // Generate valid ICO format wrapping 32x32 PNG
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(1, 4); // 1 image
  icoHeader.writeUInt8(32, 6);   // width 32
  icoHeader.writeUInt8(32, 7);   // height 32
  icoHeader.writeUInt8(0, 8);    // colors
  icoHeader.writeUInt8(0, 9);    // reserved
  icoHeader.writeUInt16LE(1, 10); // color planes
  icoHeader.writeUInt16LE(32, 12); // bpp
  icoHeader.writeUInt32LE(png32.length, 14); // image size
  icoHeader.writeUInt32LE(22, 18); // offset to data
  const icoBuffer = Buffer.concat([icoHeader, png32]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('Generated public/favicon.ico (' + icoBuffer.length + ' bytes)');
}

run().catch(console.error);

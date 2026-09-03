const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure-JS PNG encoder
function createPNG(width, height, drawPixelFn) {
  // RGBA buffer with filter byte at start of each line
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const chunkData = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(chunkData), 0);
    return Buffer.concat([len, chunkData, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Icon design: stark black background (#09090b) with sleek minimalist white geometry
// Represents financial growth / card / vault
function iconDrawer(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.42;

  // Background: stark sleek black
  const distCenter = Math.hypot(x - cx, y - cy);

  // Subtle rounded squircle base
  const nx = Math.abs(x - cx) / (w * 0.45);
  const ny = Math.abs(y - cy) / (h * 0.45);
  const squircle = Math.pow(nx, 4) + Math.pow(ny, 4);

  let bgR = 9, bgG = 9, bgB = 11; // #09090b
  let inIcon = false;

  // Outer border / accent ring
  const ringDist = Math.abs(distCenter - w * 0.36);
  if (ringDist <= w * 0.02) {
    return [255, 255, 255, 255]; // stark white ring
  }

  // Minimalist currency / upward growth bars: 3 sleek vertical bars
  // Bar 1 (left)
  const bar1X = cx - w * 0.16;
  const bar1W = w * 0.07;
  const bar1Top = cy - h * 0.05;
  const bar1Bottom = cy + h * 0.22;
  if (Math.abs(x - bar1X) < bar1W / 2 && y >= bar1Top && y <= bar1Bottom) {
    return [255, 255, 255, 255];
  }

  // Bar 2 (center)
  const bar2X = cx;
  const bar2W = w * 0.07;
  const bar2Top = cy - h * 0.15;
  const bar2Bottom = cy + h * 0.22;
  if (Math.abs(x - bar2X) < bar2W / 2 && y >= bar2Top && y <= bar2Bottom) {
    return [255, 255, 255, 255];
  }

  // Bar 3 (right)
  const bar3X = cx + w * 0.16;
  const bar3W = w * 0.07;
  const bar3Top = cy - h * 0.24;
  const bar3Bottom = cy + h * 0.22;
  if (Math.abs(x - bar3X) < bar3W / 2 && y >= bar3Top && y <= bar3Bottom) {
    return [255, 255, 255, 255];
  }

  // Horizontal baseline
  const baseTop = cy + h * 0.21;
  const baseBottom = cy + h * 0.25;
  const baseLeft = cx - w * 0.24;
  const baseRight = cx + w * 0.24;
  if (x >= baseLeft && x <= baseRight && y >= baseTop && y <= baseBottom) {
    return [255, 255, 255, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPNG(192, 192, iconDrawer));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPNG(512, 512, iconDrawer));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), createPNG(192, 192, iconDrawer));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPNG(512, 512, iconDrawer));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPNG(180, 180, iconDrawer));
console.log('Successfully generated all PWA icons!');

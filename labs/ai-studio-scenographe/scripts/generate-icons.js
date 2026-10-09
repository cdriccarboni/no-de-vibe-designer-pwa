import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 per scanline
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Border or center mark
      const distFromCenter = Math.hypot(x - width / 2, y - height / 2);
      const isInner = distFromCenter < width * 0.35;
      const isBorder = x < 8 || x >= width - 8 || y < 8 || y >= height - 8;

      if (isBorder) {
        rawData[pxOffset] = 39;
        rawData[pxOffset + 1] = 39;
        rawData[pxOffset + 2] = 42;
        rawData[pxOffset + 3] = 255;
      } else if (isInner) {
        // Cyan accent #38bdf8
        rawData[pxOffset] = 56;
        rawData[pxOffset + 1] = 189;
        rawData[pxOffset + 2] = 248;
        rawData[pxOffset + 3] = 255;
      } else {
        // Background #09090b
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

// Generate PWA icons in /public
fs.mkdirSync('./public', { recursive: true });
fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, 9, 9, 11));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, 9, 9, 11));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, 9, 9, 11));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, 9, 9, 11));
console.log('PNG Icons successfully generated in ./public/');

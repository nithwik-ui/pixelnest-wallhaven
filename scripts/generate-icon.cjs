const fs = require("fs");
const path = require("path");

const srcPng =
  "C:\\Users\\Nithwik\\.gemini\\antigravity-ide\\brain\\88131da0-9548-43d4-a49a-63eb9266f93a\\media__1784236141809.png";
const destPng = path.join(__dirname, "../public/icon.png");
const destIco = path.join(__dirname, "../public/icon.ico");

// Ensure public directory exists
const publicDir = path.dirname(destPng);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy PNG
if (fs.existsSync(srcPng)) {
  fs.copyFileSync(srcPng, destPng);
  console.log(`Copied PNG to ${destPng}`);
} else {
  console.error(`Source PNG not found at ${srcPng}`);
  process.exit(1);
}

// Convert PNG to ICO (pure Node implementation)
const pngBuf = fs.readFileSync(destPng);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type (1 = Icon)
icoHeader.writeUInt16LE(1, 4); // Count (1 image)

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(0, 0); // Width 256 (0 means 256)
dirEntry.writeUInt8(0, 1); // Height 256 (0 means 256)
dirEntry.writeUInt8(0, 2); // Color count
dirEntry.writeUInt8(0, 3); // Reserved
dirEntry.writeUInt16LE(1, 4); // Planes
dirEntry.writeUInt16LE(32, 6); // Bit count
dirEntry.writeUInt32LE(pngBuf.length, 8); // Size of PNG data
dirEntry.writeUInt32LE(22, 12); // Offset (6 bytes header + 16 bytes directory entry = 22)

const icoBuf = Buffer.concat([icoHeader, dirEntry, pngBuf]);
fs.writeFileSync(destIco, icoBuf);
console.log(`Successfully generated ICO at ${destIco}`);

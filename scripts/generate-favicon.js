import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a 512x512 canvas
const canvas = createCanvas(512, 512);
const ctx = canvas.getContext('2d');

// Teal color from the app - hsl(175, 84%, 32%) = #0d9488
const tealColor = '#0d9488';

// Helper function for rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Clear canvas
ctx.clearRect(0, 0, 512, 512);

// Draw background with rounded corners
ctx.fillStyle = tealColor;
roundRect(ctx, 0, 0, 512, 512, 80);
ctx.fill();

// Draw book icon
ctx.strokeStyle = '#ffffff';
ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
ctx.lineWidth = 20;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Save context
ctx.save();
ctx.translate(256, 256);

// Left page
ctx.beginPath();
ctx.moveTo(-140, -80);
ctx.quadraticCurveTo(-100, -90, -60, -80);
ctx.quadraticCurveTo(-20, -70, 0, -60);
ctx.lineTo(0, 80);
ctx.quadraticCurveTo(-20, 70, -60, 80);
ctx.quadraticCurveTo(-100, 90, -140, 80);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Right page
ctx.beginPath();
ctx.moveTo(140, -80);
ctx.quadraticCurveTo(100, -90, 60, -80);
ctx.quadraticCurveTo(20, -70, 0, -60);
ctx.lineTo(0, 80);
ctx.quadraticCurveTo(20, 70, 60, 80);
ctx.quadraticCurveTo(100, 90, 140, 80);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Center binding
ctx.beginPath();
ctx.lineWidth = 28;
ctx.moveTo(0, -60);
ctx.lineTo(0, 80);
ctx.stroke();

// Page lines (left)
ctx.strokeStyle = '#14b8a6';
ctx.globalAlpha = 0.4;
ctx.lineWidth = 6;

[-40, -10, 20, 50].forEach(y => {
  ctx.beginPath();
  ctx.moveTo(-110, y);
  ctx.lineTo(-30, y);
  ctx.stroke();
});

// Page lines (right)
[-40, -10, 20, 50].forEach(y => {
  ctx.beginPath();
  ctx.moveTo(30, y);
  ctx.lineTo(110, y);
  ctx.stroke();
});

ctx.restore();

// Save the image
const buffer = canvas.toBuffer('image/png');
const outputPath = path.join(__dirname, '..', 'client', 'public', 'favicon.png');
fs.writeFileSync(outputPath, buffer);

console.log('✅ Favicon generated successfully at:', outputPath);

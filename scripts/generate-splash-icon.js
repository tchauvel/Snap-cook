const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a 1024x1024 canvas (standard size for app icons)
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Fill background with brand color
ctx.fillStyle = '#E07A5F';
ctx.fillRect(0, 0, 1024, 1024);

// Draw a camera icon (simplified for this script)
ctx.strokeStyle = '#FFFFFF';
ctx.lineWidth = 24;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Camera body
ctx.beginPath();
ctx.moveTo(300, 400);
ctx.lineTo(300, 700);
ctx.lineTo(724, 700);
ctx.lineTo(724, 400);
ctx.lineTo(624, 400);
ctx.lineTo(574, 324);
ctx.lineTo(450, 324);
ctx.lineTo(400, 400);
ctx.closePath();
ctx.stroke();

// Camera lens
ctx.beginPath();
ctx.arc(512, 550, 100, 0, Math.PI * 2);
ctx.stroke();

// Text "Snap & Cook"
ctx.font = 'bold 80px Arial';
ctx.fillStyle = '#FFFFFF';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Snap & Cook', 512, 800);

// Write to file
const outputDir = path.join(__dirname, '../assets/images');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(outputDir, 'splash-icon.png'), buffer);

console.log('Splash icon created successfully!'); 
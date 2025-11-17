import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = path.join(__dirname, '../public/logo.png');
const outputPath = path.join(__dirname, '../public/logo.png');

async function removeWhiteBackground() {
  try {
    // Read the image
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Get raw pixel data
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Process pixels: make white/very light pixels transparent
    const threshold = 240; // Pixels with RGB values above this are considered "white"
    const newData = Buffer.from(data);
    
    for (let i = 0; i < newData.length; i += 4) {
      const r = newData[i];
      const g = newData[i + 1];
      const b = newData[i + 2];
      const a = newData[i + 3];
      
      // If pixel is white/very light, make it transparent
      if (r >= threshold && g >= threshold && b >= threshold) {
        newData[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }
    
    // Save the processed image
    await sharp(newData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
      .png()
      .toFile(outputPath);
    
    console.log('✅ White background removed successfully!');
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error processing image:', error);
    process.exit(1);
  }
}

removeWhiteBackground();


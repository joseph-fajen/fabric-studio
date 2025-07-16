const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function testZip() {
  const outputDir = './outputs/2025-07-16_Rick-Astley-Never-Gonna-Give-You-Up-Official-Video_81ea0cbc';
  const zipPath = path.join(outputDir, 'test.zip');
  
  try {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log('ZIP created successfully:', archive.pointer(), 'bytes');
    });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
    });
    
    archive.pipe(output);
    archive.directory(outputDir, false, (entry) => {
      return entry.name !== 'youtube_analysis.zip' && entry.name !== 'test.zip';
    });
    
    await archive.finalize();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testZip();
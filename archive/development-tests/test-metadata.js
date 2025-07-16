// Test YouTube metadata extraction

const YouTubeMetadata = require('./youtube-metadata');

async function testMetadata() {
  console.log('🧪 Testing YouTube Metadata Extraction');
  console.log('=====================================');
  
  const ytMeta = new YouTubeMetadata();
  const testUrl = 'https://youtu.be/YpY83-kA7Bo?si=CbPFLzMVkm1h1z8f';
  
  console.log(`\nTesting URL: ${testUrl}`);
  
  try {
    const metadata = await ytMeta.extractMetadata(testUrl);
    console.log('\n✅ Metadata extracted successfully:');
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Channel: ${metadata.uploader}`);
    console.log(`   Tool: ${metadata.tool}`);
    console.log(`   Duration: ${metadata.duration}s`);
    
    const processId = '12345678-1234-1234-1234-123456789012';
    const folderName = ytMeta.generateFolderName(metadata, processId);
    const downloadName = ytMeta.generateDownloadName(metadata, processId);
    
    console.log(`\n📁 Generated names:`);
    console.log(`   Folder: ${folderName}`);
    console.log(`   Download: ${downloadName}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.log(`\n⚠️  Metadata extraction failed (using fallback): ${error.message}`);
    
    // Test fallback
    const basicMeta = ytMeta.createBasicMetadata(testUrl, 'YpY83-kA7Bo');
    console.log(`   Fallback title: ${basicMeta.title}`);
    
    const processId = '12345678-1234-1234-1234-123456789012';
    const folderName = ytMeta.generateFolderName(basicMeta, processId);
    
    console.log(`   Fallback folder: ${folderName}`);
    console.log('\n✅ Fallback working correctly!');
  }
}

testMetadata().catch(console.error);
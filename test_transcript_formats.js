#!/usr/bin/env node
// Comprehensive test for transcript format processing

const FabricTranscriptIntegration = require('./fabric-transcript-integration');
const TranscriptFormatParser = require('./transcript-format-parser');
const { FABRIC_PATTERNS } = require('./fabric-patterns');

// Test transcripts in various formats
const testTranscripts = {
  plaintext: `This is a plain text transcript for testing the Universal Content Intelligence Platform.
The content discusses artificial intelligence, machine learning, and the future of technology.

Key points include:
- AI revolution in business
- Machine learning applications
- Future technology trends
- Impact on society

This transcript will be processed through all fabric patterns to extract insights and knowledge.`,

  vtt: `WEBVTT

00:00:01.000 --> 00:00:05.000
Welcome to our discussion about artificial intelligence and machine learning.

00:00:06.000 --> 00:00:12.000
Today we'll explore how AI is revolutionizing various industries.

00:00:13.000 --> 00:00:18.000
<v Speaker 1>The impact of AI on business operations has been tremendous.

00:00:19.000 --> 00:00:25.000
<v Speaker 2>I agree. We're seeing transformation across all sectors.

00:00:26.000 --> 00:00:30.000
Let's discuss specific examples and case studies.`,

  srt: `1
00:00:01,000 --> 00:00:05,000
Welcome to our discussion about artificial intelligence and machine learning.

2
00:00:06,000 --> 00:00:12,000
Today we'll explore how AI is revolutionizing various industries.

3
00:00:13,000 --> 00:00:18,000
The impact of AI on business operations has been tremendous.

4
00:00:19,000 --> 00:00:25,000
We're seeing transformation across all sectors.

5
00:00:26,000 --> 00:00:30,000
Let's discuss specific examples and case studies.`,

  speakerLabeled: `Host: Welcome everyone to today's podcast about artificial intelligence.

Guest: Thank you for having me. I'm excited to discuss AI's impact on business.

Host: Let's start with the fundamentals. How do you define AI in the current context?

Guest: AI today is primarily about machine learning algorithms that can identify patterns in data and make predictions or decisions based on those patterns.

Host: That's a great definition. Can you give us some concrete examples?

Guest: Certainly. We see AI in recommendation systems, fraud detection, automated customer service, and predictive maintenance.

Host: Those are fascinating applications. What about the future?

Guest: The future holds even more promise with advances in natural language processing and computer vision.`,

  youtube: `[00:00:01] Welcome to our discussion about artificial intelligence and machine learning.
[00:00:06] Today we'll explore how AI is revolutionizing various industries.
[00:00:13] The impact of AI on business operations has been tremendous.
[00:00:19] We're seeing transformation across all sectors.
[00:00:26] Let's discuss specific examples and case studies.
[00:00:31] Machine learning is enabling new capabilities we never thought possible.
[00:00:37] From autonomous vehicles to medical diagnosis, AI is everywhere.`,

  timestamped: `0:01 Welcome to our discussion about artificial intelligence and machine learning.
0:06 Today we'll explore how AI is revolutionizing various industries.
0:13 The impact of AI on business operations has been tremendous.
0:19 We're seeing transformation across all sectors.
0:26 Let's discuss specific examples and case studies.
0:31 Machine learning is enabling new capabilities we never thought possible.
0:37 From autonomous vehicles to medical diagnosis, AI is everywhere.`
};

async function testFormatDetection() {
  console.log('🔍 Testing transcript format detection...\n');
  
  const parser = new TranscriptFormatParser();
  
  for (const [formatName, transcript] of Object.entries(testTranscripts)) {
    console.log(`Testing ${formatName.toUpperCase()} format:`);
    
    try {
      const result = await parser.parseTranscript(transcript);
      
      console.log(`✅ Detected: ${result.originalFormat} (${(result.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`📊 Original: ${result.metadata.characterCount} chars → Processed: ${result.metadata.processedCharacterCount} chars`);
      
      if (result.metadata.detectedSpeakers.length > 0) {
        console.log(`🎭 Speakers: ${result.metadata.detectedSpeakers.join(', ')}`);
      }
      
      if (result.metadata.estimatedDuration) {
        const minutes = Math.floor(result.metadata.estimatedDuration / 60);
        const seconds = Math.floor(result.metadata.estimatedDuration % 60);
        console.log(`⏰ Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
      
      console.log(`📝 Content type: ${parser.estimateContentType(result.content, result.metadata)}`);
      console.log(`💡 Recommendations: ${result.metadata.processingNotes.join(', ')}\n`);
      
    } catch (error) {
      console.log(`❌ Error processing ${formatName}: ${error.message}\n`);
    }
  }
}

async function testDirectProcessing() {
  console.log('🚀 Testing direct transcript processing...\n');
  
  const fabricIntegration = new FabricTranscriptIntegration();
  
  // Test with a sample transcript
  const sampleTranscript = testTranscripts.speakerLabeled;
  
  // Use a subset of patterns for faster testing
  const testPatterns = FABRIC_PATTERNS.slice(0, 3); // First 3 patterns
  
  console.log(`Testing with ${testPatterns.length} patterns...`);
  
  let progressCount = 0;
  const progressCallback = (progress) => {
    progressCount++;
    console.log(`Progress ${progressCount}: ${progress.description} (${progress.current}/${progress.total})`);
  };
  
  try {
    const startTime = Date.now();
    
    const result = await fabricIntegration.processTranscriptContent(
      sampleTranscript,
      testPatterns,
      progressCallback,
      {
        title: 'Test AI Discussion',
        contentType: 'podcast'
      }
    );
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`\n✅ Processing completed in ${Math.round(processingTime/1000)}s`);
    console.log(`📊 Results: ${result.successful}/${result.total} patterns successful`);
    console.log(`🔧 Method: ${result.method}`);
    
    if (result.transcript) {
      console.log(`📄 Original format: ${result.transcript.originalFormat}`);
      console.log(`🎯 Content type: ${result.transcript.contentType}`);
      console.log(`💡 Recommendations: ${result.transcript.recommendations.join(', ')}`);
    }
    
    // Show sample results
    console.log('\n📋 Sample Results:');
    const resultEntries = Object.entries(result.results);
    for (const [filename, patternResult] of resultEntries.slice(0, 2)) {
      console.log(`\n${filename}:`);
      console.log(`Pattern: ${patternResult.pattern}`);
      console.log(`Phase: ${patternResult.phase}`);
      console.log(`Content preview: ${patternResult.content.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.log(`❌ Processing failed: ${error.message}`);
  }
}

async function testFabricAvailability() {
  console.log('🛠️  Testing Fabric CLI availability...\n');
  
  const fabricIntegration = new FabricTranscriptIntegration();
  
  try {
    const isAvailable = await fabricIntegration.testFabricAvailability();
    
    if (isAvailable) {
      console.log('✅ Fabric CLI is available and working');
      
      // Test API connections if available
      try {
        const apiResults = await fabricIntegration.testApiConnections();
        console.log('\n🔑 API Connection Test Results:');
        
        for (const [provider, result] of Object.entries(apiResults)) {
          if (result.working) {
            console.log(`✅ ${provider}: Working (${result.model})`);
          } else {
            console.log(`❌ ${provider}: ${result.error}`);
          }
        }
      } catch (apiError) {
        console.log(`⚠️  API test failed: ${apiError.message}`);
      }
      
    } else {
      console.log('❌ Fabric CLI not available - will use simulation mode');
    }
    
  } catch (error) {
    console.log(`❌ Fabric test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🧪 Comprehensive Transcript Processing Tests');
  console.log('='.repeat(50));
  
  try {
    await testFabricAvailability();
    console.log('\n' + '='.repeat(50));
    
    await testFormatDetection();
    console.log('='.repeat(50));
    
    await testDirectProcessing();
    console.log('\n='.repeat(50));
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run all tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testFormatDetection,
  testDirectProcessing,
  testFabricAvailability,
  testTranscripts
};
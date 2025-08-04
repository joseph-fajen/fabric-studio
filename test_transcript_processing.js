#!/usr/bin/env node
// Test script for Universal Content Intelligence Platform transcript processing

const axios = require('axios');

const testTranscript = `This is a test transcript for the Universal Content Intelligence Platform.
We are testing the new transcript processing feature that allows users to upload
or paste content directly instead of requiring YouTube URLs.

The transcript contains multiple paragraphs and should demonstrate the system's
ability to process uploaded content through all 13 fabric patterns.

Key topics covered:
- Universal content processing
- Direct transcript input
- Content intelligence analysis
- System performance testing

This test validates that the platform can handle various content types
beyond YouTube videos, making it a truly universal content analysis tool.

The processing should maintain the same 70-second performance while
providing comprehensive analysis through fabric patterns.`;

async function testTranscriptProcessing() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing Universal Content Intelligence Platform...');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test transcript processing
    console.log('2. Testing transcript processing...');
    const processResponse = await axios.post(`${baseUrl}/api/process`, {
      transcript: testTranscript,
      filename: 'test-content.txt',
      contentType: 'transcript'
    });
    
    console.log('✅ Process started:', processResponse.data);
    const processId = processResponse.data.processId;
    
    // Monitor processing status
    console.log('3. Monitoring processing status...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      try {
        const statusResponse = await axios.get(`${baseUrl}/api/process/${processId}`);
        const status = statusResponse.data.status;
        console.log(`   Status: ${status} (${statusResponse.data.currentStep || 0}/${statusResponse.data.totalSteps || 13})`);
        
        if (status === 'completed') {
          completed = true;
          console.log('✅ Processing completed successfully!');
          console.log('   Results:', {
            successful: statusResponse.data.successful,
            method: statusResponse.data.method,
            processingTime: statusResponse.data.processingTime
          });
        } else if (status === 'failed') {
          console.log('❌ Processing failed:', statusResponse.data.error);
          break;
        }
      } catch (error) {
        console.log('⚠️  Status check failed:', error.message);
      }
      
      attempts++;
    }
    
    if (!completed && attempts >= maxAttempts) {
      console.log('⏰ Test timed out after 30 seconds');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run test if server is available
testTranscriptProcessing();
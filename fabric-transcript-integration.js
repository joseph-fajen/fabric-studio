// Optimized Fabric Integration - Transcript-First Approach
// Downloads transcript once, then processes through all patterns in parallel

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const TranscriptDownloader = require('./transcript-downloader');

const execAsync = promisify(exec);

class FabricTranscriptIntegration {
  constructor() {
    this.transcriptDownloader = new TranscriptDownloader();
    this.maxConcurrent = 3; // Reduced to avoid API rate limits
    this.timeoutMs = 60000; // Increased for API calls
    this.fabricPath = '/Users/josephfajen/go/bin/fabric';
  }

  // Test fabric availability
  async testFabricAvailability() {
    try {
      // Test basic fabric functionality
      const { stdout } = await execAsync(`${this.fabricPath} --version`, { timeout: 5000 });
      if (stdout && stdout.includes('v1.')) {
        // Test with a simple pattern execution instead of listing
        try {
          const testResult = await execAsync(`echo "test" | ${this.fabricPath} --help`, { timeout: 10000 });
          return true;
        } catch (testError) {
          console.log('Fabric execution test failed, will try direct pattern execution');
          // Even if the test fails, we'll try the actual execution
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log('Fabric CLI not available:', error.message);
      return false;
    }
  }

  // Execute a single pattern with transcript text
  async executePatternWithTranscript(patternName, transcript, videoMetadata = null) {
    try {
      // Create temporary file for the transcript
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      const tempFile = path.join(tempDir, `temp_transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`);
      
      // Add metadata header to transcript for context
      let processableText = '';
      if (videoMetadata) {
        processableText += `# YouTube Video Analysis\n\n`;
        processableText += `**Video Title**: ${videoMetadata.title || 'Unknown'}\n`;
        processableText += `**Channel**: ${videoMetadata.uploader || 'Unknown'}\n`;
        processableText += `**URL**: ${videoMetadata.url || 'Unknown'}\n\n`;
        processableText += `## Video Transcript\n\n`;
      }
      processableText += transcript;
      
      // Write transcript to temporary file
      await fs.writeFile(tempFile, processableText, 'utf8');
      
      try {
        // Execute fabric pattern with the transcript file using cat pipe
        const command = `cat "${tempFile}" | ${this.fabricPath} -p ${patternName} --model claude-3-5-sonnet-20241022`;
        
        console.log(`Processing pattern: ${patternName}...`);
        
        const { stdout, stderr } = await execAsync(command, { 
          timeout: 60000, // Increased to 60 seconds for API calls
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          shell: '/bin/bash' // Ensure proper shell for pipe operations
        });

        if (stderr && !stderr.includes('WARNING')) {
          console.warn(`Pattern ${patternName} stderr:`, stderr);
        }

        const result = stdout?.trim() || 'Pattern executed but returned no output';
        
        if (result.length < 50) {
          throw new Error('Pattern returned suspiciously short output');
        }
        
        // Clean up temp file
        await fs.remove(tempFile);
        
        return result;
        
      } catch (execError) {
        // Clean up temp file even on error
        await fs.remove(tempFile);
        throw execError;
      }
      
    } catch (error) {
      console.error(`Pattern ${patternName} failed:`, error.message);
      throw new Error(`Pattern execution failed: ${error.message}`);
    }
  }

  // Process all patterns in parallel batches
  async processVideoWithTranscript(youtubeUrl, patterns, progressCallback) {
    const startTime = Date.now();
    
    try {
      // Step 1: Download transcript once
      console.log('📥 Downloading transcript...');
      if (progressCallback) {
        progressCallback({
          current: 0,
          total: patterns.length + 1,
          pattern: 'transcript_download',
          phase: 'download',
          description: 'Downloading video transcript...'
        });
      }

      const transcriptResult = await this.transcriptDownloader.downloadTranscript(
        youtubeUrl, 
        path.join(__dirname, 'temp')
      );

      const transcript = transcriptResult.transcript;
      const downloadTime = Date.now() - startTime;
      
      console.log(`✅ Transcript downloaded in ${Math.round(downloadTime/1000)}s (${transcript.length} chars)`);
      console.log(`📊 Processing ${patterns.length} patterns in parallel batches...`);

      // Step 2: Process all patterns with the transcript
      const results = {};
      const batches = this.createBatches(patterns, this.maxConcurrent);
      let completed = 0;

      for (const batch of batches) {
        // Process batch in parallel
        const batchPromises = batch.map(async (pattern) => {
          try {
            const result = await this.executePatternWithTranscript(
              pattern.name, 
              transcript,
              { url: youtubeUrl }
            );
            
            completed++;
            if (progressCallback) {
              progressCallback({
                current: completed + 1, // +1 for transcript download
                total: patterns.length + 1,
                pattern: pattern.name,
                phase: pattern.phase,
                description: pattern.description
              });
            }
            
            return {
              pattern,
              result: {
                content: result,
                pattern: pattern.name,
                phase: pattern.phase,
                description: pattern.description
              }
            };
          } catch (error) {
            console.error(`Pattern ${pattern.name} failed:`, error.message);
            completed++;
            
            if (progressCallback) {
              progressCallback({
                current: completed + 1,
                total: patterns.length + 1,
                pattern: pattern.name,
                phase: pattern.phase,
                description: `Error: ${error.message}`
              });
            }
            
            return {
              pattern,
              result: {
                content: `# Error executing ${pattern.name}\n\n${error.message}\n\nThis pattern failed to process the transcript. The transcript was successfully downloaded but the fabric pattern execution encountered an issue.`,
                pattern: pattern.name,
                phase: pattern.phase,
                description: pattern.description,
                error: true
              }
            };
          }
        });

        // Wait for batch completion
        const batchResults = await Promise.all(batchPromises);
        
        // Store results
        batchResults.forEach(({ pattern, result }) => {
          results[pattern.filename] = result;
        });

        console.log(`✅ Completed batch: ${completed}/${patterns.length} patterns`);
      }

      const totalTime = Date.now() - startTime;
      const successCount = Object.values(results).filter(r => !r.error).length;
      
      console.log(`🎉 Processing complete! ${successCount}/${patterns.length} patterns successful in ${Math.round(totalTime/1000)}s`);

      return {
        results,
        completed: Object.keys(results).length,
        total: patterns.length,
        successful: successCount,
        transcript: transcriptResult,
        processingTime: totalTime,
        optimized: true,
        method: 'transcript-first'
      };

    } catch (error) {
      console.error('Transcript processing failed:', error);
      throw new Error(`Transcript processing failed: ${error.message}`);
    }
  }

  // Create batches for parallel processing
  createBatches(patterns, batchSize) {
    const batches = [];
    for (let i = 0; i < patterns.length; i += batchSize) {
      batches.push(patterns.slice(i, i + batchSize));
    }
    return batches;
  }

  // Fallback simulation if fabric is not available
  async simulateProcessing(youtubeUrl, patterns, progressCallback) {
    console.log('🔄 Using simulation mode - fabric not available');
    
    const results = {};
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      
      // Update progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: patterns.length,
          pattern: pattern.name,
          phase: pattern.phase,
          description: pattern.description
        });
      }

      // Simulate processing time (much faster since no actual download)
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Create simulated result
      const result = `# ${pattern.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

This is a simulated output for pattern: **${pattern.name}**

**YouTube URL**: ${youtubeUrl}

## Simulated Analysis (Transcript-First Mode)

This pattern would normally process the downloaded video transcript and extract relevant information based on the ${pattern.name} methodology.

Key insights would include:
- Analysis of transcript content
- Extraction of relevant patterns
- Structured markdown output
- Professional formatting

**Note**: This is a simulation. The transcript-first approach would significantly improve processing speed by downloading the transcript once and reusing it for all patterns.

*Generated at: ${new Date().toISOString()}*`;

      results[pattern.filename] = {
        content: result,
        pattern: pattern.name,
        phase: pattern.phase,
        description: pattern.description,
        simulated: true
      };

      console.log(`✅ Simulated pattern: ${pattern.name}`);
    }

    return {
      results,
      completed: Object.keys(results).length,
      total: patterns.length,
      successful: patterns.length,
      simulated: true,
      method: 'simulation'
    };
  }

  // Main processing method with fallbacks
  async processYouTubeVideo(youtubeUrl, patterns, progressCallback) {
    // Try fabric processing first, fallback to simulation if it fails
    try {
      console.log('🚀 Attempting fabric processing with transcript-first approach...');
      return await this.processVideoWithTranscript(youtubeUrl, patterns, progressCallback);
    } catch (error) {
      console.log('Fabric processing failed, falling back to simulation:', error.message);
      return await this.simulateProcessing(youtubeUrl, patterns, progressCallback);
    }
  }
}

module.exports = FabricTranscriptIntegration;
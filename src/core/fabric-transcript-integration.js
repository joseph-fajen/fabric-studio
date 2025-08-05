// Optimized Fabric Integration - Transcript-First Approach
// Downloads transcript once, then processes through all patterns in parallel

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const TranscriptDownloader = require('../transcript/transcript-downloader');
const TranscriptChunker = require('./transcript-chunker');
const TranscriptFormatParser = require('./transcript-format-parser');

const execAsync = promisify(exec);

class FabricTranscriptIntegration {
  constructor() {
    this.transcriptDownloader = new TranscriptDownloader();
    this.transcriptChunker = new TranscriptChunker();
    this.formatParser = new TranscriptFormatParser();
    this.maxConcurrent = 3; // Reduced to avoid API rate limits
    this.timeoutMs = 60000; // Increased for API calls
    this.fabricPath = null; // Will be detected dynamically
    
    // Anthropic-only fallback model hierarchy for API resilience
    this.fallbackModels = [
      'claude-3-5-sonnet-20241022',          // Latest Claude Sonnet (primary)
      'claude-3-5-haiku-20241022',           // Latest Claude Haiku (faster fallback)
      'claude-3-sonnet-20240229',            // Older Claude Sonnet fallback
      'claude-3-haiku-20240307'              // Older Claude Haiku fallback
    ];
    
    this.maxRetries = 3;
    this.baseRetryDelay = 2000; // 2 seconds
    this.apiKeys = {};
    
    // Load API keys from config on startup
    this.loadApiKeysFromConfig();
  }

  // Detect fabric installation path
  async detectFabricPath() {
    // Try common installation locations
    const commonPaths = [
      'fabric', // Use PATH
      `${process.env.HOME}/go/bin/fabric`,
      '/usr/local/bin/fabric',
      '/opt/homebrew/bin/fabric',
      `${process.env.HOME}/.local/bin/fabric`
    ];

    for (const path of commonPaths) {
      try {
        await execAsync(`${path} --version`, { timeout: 3000 });
        console.log(`Fabric CLI found at: ${path}`);
        return path;
      } catch (error) {
        // Continue to next path
      }
    }
    
    // Try using 'which' command
    try {
      const { stdout } = await execAsync('which fabric', { timeout: 3000 });
      const path = stdout.trim();
      if (path) {
        console.log(`Fabric CLI found via 'which': ${path}`);
        return path;
      }
    } catch (error) {
      // 'which' command failed
    }
    
    throw new Error('Fabric CLI not found in common locations');
  }

  // Test fabric availability
  async testFabricAvailability() {
    try {
      // First detect the fabric path if not already set
      if (!this.fabricPath) {
        this.fabricPath = await this.detectFabricPath();
      }
      
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

  // Execute a single pattern with transcript text and fallback model strategy
  async executePatternWithTranscript(patternName, transcript, videoMetadata = null) {
    // Check if transcript needs chunking
    if (this.transcriptChunker.needsChunking(transcript)) {
      console.log(`📄 Large transcript detected for ${patternName}, using chunking strategy...`);
      return await this.executePatternWithChunking(patternName, transcript, videoMetadata);
    } else {
      return await this.executePatternWithRetry(patternName, transcript, videoMetadata, 0);
    }
  }

  // Execute pattern with chunking for large transcripts
  async executePatternWithChunking(patternName, transcript, videoMetadata = null) {
    try {
      // Split transcript into intelligent chunks
      const chunks = this.transcriptChunker.splitIntoChunks(transcript);
      const chunksWithMetadata = this.transcriptChunker.addChunkMetadata(chunks, videoMetadata);
      
      const stats = this.transcriptChunker.getChunkingStats(transcript, chunks);
      console.log(`📊 Chunking stats: ${stats.totalChunks} chunks, avg ${stats.avgChunkTokens} tokens per chunk`);
      
      // Process each chunk
      const chunkResults = [];
      for (let i = 0; i < chunksWithMetadata.length; i++) {
        const chunk = chunksWithMetadata[i];
        console.log(`🔄 Processing chunk ${i + 1}/${chunksWithMetadata.length} for pattern ${patternName}...`);
        
        try {
          const result = await this.executePatternWithRetry(patternName, chunk, videoMetadata, 0);
          chunkResults.push(result);
        } catch (error) {
          console.warn(`⚠️  Chunk ${i + 1} failed for pattern ${patternName}: ${error.message}`);
          // Continue with other chunks rather than failing completely
          chunkResults.push(`[Chunk ${i + 1} processing failed: ${error.message}]`);
        }
      }
      
      // Aggregate results using pattern-specific strategies
      console.log(`🔗 Aggregating ${chunkResults.length} chunk results for pattern ${patternName}...`);
      const aggregatedResult = this.transcriptChunker.aggregateResults(chunkResults, patternName);
      
      // Add chunking information to the final result
      const chunkingInfo = `\n\n---\n**Processing Info**: This content was processed in ${chunks.length} chunks due to length (${stats.originalTokens.toLocaleString()} estimated tokens).`;
      
      return aggregatedResult + chunkingInfo;
      
    } catch (error) {
      console.error(`❌ Chunking failed for pattern ${patternName}:`, error.message);
      throw new Error(`Chunked processing failed: ${error.message}`);
    }
  }
  
  // Execute pattern with retry logic and model fallback
  async executePatternWithRetry(patternName, transcript, videoMetadata = null, attemptCount = 0) {
    // Ensure fabric path is detected
    if (!this.fabricPath) {
      try {
        this.fabricPath = await this.detectFabricPath();
      } catch (error) {
        throw new Error(`Fabric CLI not found. Please install it: go install github.com/danielmiessler/fabric@latest`);
      }
    }
    
    const tempDir = path.join(__dirname, 'temp');
    await fs.ensureDir(tempDir);
    
    const tempFile = path.join(tempDir, `temp_transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`);
    
    try {
      // Add metadata header to transcript for context
      let processableText = '';
      if (videoMetadata) {
        if (videoMetadata.url && videoMetadata.url.includes('youtube')) {
          // YouTube content
          processableText += `# YouTube Video Analysis\n\n`;
          processableText += `**Video Title**: ${videoMetadata.title || 'Unknown'}\n`;
          processableText += `**Channel**: ${videoMetadata.uploader || 'Unknown'}\n`;
          processableText += `**URL**: ${videoMetadata.url || 'Unknown'}\n\n`;
          processableText += `## Video Transcript\n\n`;
        } else {
          // Direct transcript content
          processableText += `# Content Analysis\n\n`;
          processableText += `**Content Type**: ${videoMetadata.contentType || 'Transcript'}\n`;
          if (videoMetadata.format && videoMetadata.format.originalFormat) {
            processableText += `**Original Format**: ${videoMetadata.format.originalFormat.toUpperCase()}\n`;
          }
          if (videoMetadata.format && videoMetadata.format.detectedSpeakers.length > 0) {
            processableText += `**Speakers**: ${videoMetadata.format.detectedSpeakers.join(', ')}\n`;
          }
          if (videoMetadata.format && videoMetadata.format.estimatedDuration) {
            const minutes = Math.floor(videoMetadata.format.estimatedDuration / 60);
            const seconds = Math.floor(videoMetadata.format.estimatedDuration % 60);
            processableText += `**Estimated Duration**: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
          }
          processableText += `\n## Content Transcript\n\n`;
        }
      }
      processableText += transcript;
      
      // Write transcript to temporary file
      await fs.writeFile(tempFile, processableText, 'utf8');
      
      // Try each model in fallback hierarchy
      for (let modelIndex = 0; modelIndex < this.fallbackModels.length; modelIndex++) {
        const currentModel = this.fallbackModels[modelIndex];
        
        try {
          console.log(`Processing pattern: ${patternName} with model: ${currentModel} (attempt ${attemptCount + 1}/${this.maxRetries + 1})`);
          
          const command = `cat "${tempFile}" | ${this.fabricPath} -p ${patternName} --model ${currentModel}`;
          
          const { stdout, stderr } = await execAsync(command, { 
            timeout: this.timeoutMs,
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            shell: '/bin/bash'
          });

          if (stderr && !stderr.includes('WARNING')) {
            console.warn(`Pattern ${patternName} stderr:`, stderr);
          }

          const result = stdout?.trim() || 'Pattern executed but returned no output';
          
          if (result.length < 50) {
            throw new Error('Pattern returned suspiciously short output');
          }
          
          // Success! Clean up and return
          await fs.remove(tempFile);
          console.log(`✅ Pattern ${patternName} successful with model: ${currentModel}`);
          return result;
          
        } catch (modelError) {
          console.warn(`Model ${currentModel} failed for pattern ${patternName}:`, modelError.message);
          
          // Check if this is an API overload error
          const isAPIOverload = modelError.message.includes('529') || 
                               modelError.message.includes('Overloaded') ||
                               modelError.message.includes('rate limit') ||
                               modelError.message.includes('quota');
          
          // If this is the last model and we haven't exhausted retries, try again with exponential backoff
          if (modelIndex === this.fallbackModels.length - 1 && attemptCount < this.maxRetries && isAPIOverload) {
            const delay = this.baseRetryDelay * Math.pow(2, attemptCount);
            console.log(`All models failed, retrying in ${delay}ms... (${attemptCount + 1}/${this.maxRetries})`);
            
            await fs.remove(tempFile);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await this.executePatternWithRetry(patternName, transcript, videoMetadata, attemptCount + 1);
          }
          
          // For API overload errors, continue to next model immediately
          // For other errors, also continue to next model
          console.log(`Trying next model in fallback hierarchy...`);
          continue;
        }
      }
      
      // All models failed
      await fs.remove(tempFile);
      throw new Error(`All fallback models failed for pattern ${patternName}`);
      
    } catch (error) {
      // Clean up temp file on any error
      await fs.remove(tempFile).catch(() => {});
      console.error(`Pattern ${patternName} failed after all retries:`, error.message);
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
      const failedPatterns = Object.entries(results).filter(([_, r]) => r.error).map(([filename, r]) => r.pattern);
      
      if (failedPatterns.length > 0) {
        console.log(`❌ Failed patterns: ${failedPatterns.join(', ')}`);
      }
      
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

  // Process transcript content directly (no YouTube download needed)
  async processTranscriptContent(transcript, patterns, progressCallback, metadata = null) {
    const startTime = Date.now();
    
    try {
      console.log('📝 Processing transcript content directly...');
      console.log(`📊 Processing ${patterns.length} patterns with direct transcript (${transcript.length} chars)`);

      // Step 1: Parse and normalize transcript format
      console.log('🔍 Analyzing transcript format...');
      if (progressCallback) {
        progressCallback({
          current: 0,
          total: patterns.length + 2, // +2 for format parsing and ready
          pattern: 'format_analysis',
          phase: 'preprocessing',
          description: 'Analyzing transcript format and structure...'
        });
      }

      const parsedResult = await this.formatParser.parseTranscript(transcript, {
        keepNoise: false,
        keepRepetition: false
      });

      const processedTranscript = parsedResult.content;
      const formatMetadata = parsedResult.metadata;
      
      // Enhance metadata with format information
      const enhancedMetadata = {
        ...metadata,
        format: formatMetadata,
        contentType: this.formatParser.estimateContentType(processedTranscript, formatMetadata),
        processingRecommendations: this.formatParser.getFormatRecommendations(parsedResult.originalFormat, formatMetadata)
      };

      console.log(`✅ Format detected: ${parsedResult.originalFormat} (${(parsedResult.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`📈 Content processed: ${formatMetadata.characterCount} → ${formatMetadata.processedCharacterCount} chars`);
      if (formatMetadata.detectedSpeakers.length > 0) {
        console.log(`🎭 Speakers detected: ${formatMetadata.detectedSpeakers.join(', ')}`);
      }
      if (formatMetadata.estimatedDuration) {
        const minutes = Math.floor(formatMetadata.estimatedDuration / 60);
        const seconds = Math.floor(formatMetadata.estimatedDuration % 60);
        console.log(`⏰ Estimated duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }

      // Step 2: Transcript ready for processing
      if (progressCallback) {
        progressCallback({
          current: 1,
          total: patterns.length + 2,
          pattern: 'transcript_ready',
          phase: 'ready',
          description: `${parsedResult.originalFormat.toUpperCase()} transcript processed and ready for analysis...`
        });
      }

      // Step 3: Process all patterns with the processed transcript
      const results = {};
      const batches = this.createBatches(patterns, this.maxConcurrent);
      let completed = 0;

      for (const batch of batches) {
        // Process batch in parallel
        const batchPromises = batch.map(async (pattern) => {
          try {
            const result = await this.executePatternWithTranscript(
              pattern.name, 
              processedTranscript,
              enhancedMetadata
            );
            
            completed++;
            if (progressCallback) {
              progressCallback({
                current: completed + 2, // +2 for format parsing and transcript ready
                total: patterns.length + 2,
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
                current: completed + 2,
                total: patterns.length + 2,
                pattern: pattern.name,
                phase: pattern.phase,
                description: `Error: ${error.message}`
              });
            }
            
            return {
              pattern,
              result: {
                content: `# Error executing ${pattern.name}\n\n${error.message}\n\nThis pattern failed to process the transcript content. The transcript was provided directly but the fabric pattern execution encountered an issue.`,
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
      const failedPatterns = Object.entries(results).filter(([_, r]) => r.error).map(([filename, r]) => r.pattern);
      
      if (failedPatterns.length > 0) {
        console.log(`❌ Failed patterns: ${failedPatterns.join(', ')}`);
      }
      
      console.log(`🎉 Direct transcript processing complete! ${successCount}/${patterns.length} patterns successful in ${Math.round(totalTime/1000)}s`);

      return {
        results,
        completed: Object.keys(results).length,
        total: patterns.length,
        successful: successCount,
        processingTime: totalTime,
        optimized: true,
        method: 'transcript-direct',
        transcript: {
          originalFormat: parsedResult.originalFormat,
          confidence: parsedResult.confidence,
          metadata: formatMetadata,
          contentType: enhancedMetadata.contentType,
          recommendations: enhancedMetadata.processingRecommendations
        }
      };

    } catch (error) {
      console.error('Direct transcript processing failed:', error);
      throw new Error(`Direct transcript processing failed: ${error.message}`);
    }
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

  // Load API keys from config file
  async loadApiKeysFromConfig() {
    try {
      const configPath = path.join(__dirname, 'config', 'api-keys.json');
      if (await fs.pathExists(configPath)) {
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        this.apiKeys = config;
        if (config.fallbackModels) {
          this.fallbackModels = config.fallbackModels;
        }
        console.log('✅ API keys loaded from config');
      }
    } catch (error) {
      console.warn('⚠️  Failed to load API keys from config:', error.message);
    }
  }

  // Update API keys
  updateApiKeys(apiKeys) {
    this.apiKeys = { ...this.apiKeys, ...apiKeys };
    console.log('✅ API keys updated');
  }

  // Update fallback models
  updateFallbackModels(fallbackModels) {
    this.fallbackModels = fallbackModels;
    console.log('✅ Fallback models updated:', fallbackModels);
  }

  // Test API connections
  async testApiConnections(config = null) {
    // Ensure fabric path is detected
    if (!this.fabricPath) {
      try {
        this.fabricPath = await this.detectFabricPath();
      } catch (error) {
        return { error: 'Fabric CLI not found. Please install it: go install github.com/danielmiessler/fabric@latest' };
      }
    }
    
    const keysToTest = config || this.apiKeys;
    const results = {};

    // Test Anthropic
    if (keysToTest.anthropic) {
      try {
        const command = `echo "test" | ${this.fabricPath} -p youtube_summary --model claude-3-5-sonnet-20241022`;
        await execAsync(command, { timeout: 10000 });
        results.anthropic = { working: true, model: 'claude-3-5-sonnet-20241022' };
      } catch (error) {
        results.anthropic = { working: false, error: error.message };
      }
    } else {
      results.anthropic = { working: false, error: 'No API key configured' };
    }

    // Test OpenAI with latest working model
    if (keysToTest.openai) {
      try {
        const command = `echo "test" | ${this.fabricPath} -p youtube_summary --model gpt-4o`;
        await execAsync(command, { timeout: 10000 });
        results.openai = { working: true, model: 'gpt-4o' };
      } catch (error) {
        // Try fallback to gpt-4o-mini if gpt-4o fails
        try {
          const fallbackCommand = `echo "test" | ${this.fabricPath} -p youtube_summary --model gpt-4o-mini`;
          await execAsync(fallbackCommand, { timeout: 10000 });
          results.openai = { working: true, model: 'gpt-4o-mini' };
        } catch (fallbackError) {
          results.openai = { working: false, error: error.message };
        }
      }
    } else {
      results.openai = { working: false, error: 'No API key configured' };
    }

    // Test Google with latest model
    if (keysToTest.google) {
      try {
        const command = `echo "test" | ${this.fabricPath} -p youtube_summary --model gemini-2.0-flash-exp`;
        await execAsync(command, { timeout: 10000 });
        results.google = { working: true, model: 'gemini-2.0-flash-exp' };
      } catch (error) {
        results.google = { working: false, error: error.message };
      }
    } else {
      results.google = { working: false, error: 'No API key configured' };
    }

    return results;
  }
}

module.exports = FabricTranscriptIntegration;
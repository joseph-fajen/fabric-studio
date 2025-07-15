// YouTube Transcript Downloader
// Downloads transcript once and provides it for all pattern processing

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');

const execAsync = promisify(exec);

class TranscriptDownloader {
  constructor() {
    this.maxRetries = 3;
    this.timeout = 60000; // 60 seconds for transcript download
  }

  // Extract video ID from various YouTube URL formats
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Download transcript using yt-dlp (preferred method)
  async downloadWithYtDlp(youtubeUrl, outputDir) {
    const videoId = this.extractVideoId(youtubeUrl);
    const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
    
    try {
      console.log('Downloading transcript with yt-dlp...');
      
      // Download only transcript in text format
      const command = `yt-dlp --write-subs --write-auto-subs --sub-format vtt --skip-download --sub-langs en "${youtubeUrl}" -o "${path.join(outputDir, 'temp_%(id)s.%(ext)s')}"`;
      
      await execAsync(command, { 
        timeout: this.timeout,
        cwd: outputDir 
      });

      // Find the downloaded VTT file
      const files = await fs.readdir(outputDir);
      const vttFile = files.find(f => f.includes(videoId) && f.endsWith('.vtt'));
      
      if (vttFile) {
        const vttPath = path.join(outputDir, vttFile);
        const transcript = await this.parseVTTToText(vttPath);
        
        // Save clean transcript
        await fs.writeFile(transcriptFile, transcript, 'utf8');
        
        // Clean up VTT file
        await fs.remove(vttPath);
        
        return {
          transcript,
          source: 'yt-dlp',
          file: transcriptFile
        };
      } else {
        throw new Error('No transcript file found after download');
      }
      
    } catch (error) {
      console.log('yt-dlp transcript download failed:', error.message);
      throw error;
    }
  }

  // Download transcript using youtube-dl (fallback)
  async downloadWithYoutubeDl(youtubeUrl, outputDir) {
    const videoId = this.extractVideoId(youtubeUrl);
    const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
    
    try {
      console.log('Downloading transcript with youtube-dl...');
      
      const command = `youtube-dl --write-auto-sub --sub-format vtt --skip-download --sub-lang en "${youtubeUrl}" -o "${path.join(outputDir, 'temp_%(id)s.%(ext)s')}"`;
      
      await execAsync(command, { 
        timeout: this.timeout,
        cwd: outputDir 
      });

      // Find and process VTT file
      const files = await fs.readdir(outputDir);
      const vttFile = files.find(f => f.includes(videoId) && f.endsWith('.vtt'));
      
      if (vttFile) {
        const vttPath = path.join(outputDir, vttFile);
        const transcript = await this.parseVTTToText(vttPath);
        
        await fs.writeFile(transcriptFile, transcript, 'utf8');
        await fs.remove(vttPath);
        
        return {
          transcript,
          source: 'youtube-dl',
          file: transcriptFile
        };
      } else {
        throw new Error('No transcript file found after download');
      }
      
    } catch (error) {
      console.log('youtube-dl transcript download failed:', error.message);
      throw error;
    }
  }

  // Download transcript using fabric's built-in YouTube support
  async downloadWithFabric(youtubeUrl, outputDir) {
    const videoId = this.extractVideoId(youtubeUrl);
    const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
    
    try {
      console.log('Downloading transcript with fabric...');
      
      // Use fabric to get transcript only
      const command = `/Users/josephfajen/go/bin/fabric --transcript "${youtubeUrl}"`;
      
      const { stdout } = await execAsync(command, { 
        timeout: this.timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large transcripts
      });

      if (stdout && stdout.trim().length > 100) {
        const transcript = stdout.trim();
        await fs.writeFile(transcriptFile, transcript, 'utf8');
        
        return {
          transcript,
          source: 'fabric',
          file: transcriptFile
        };
      } else {
        throw new Error('Fabric returned empty or invalid transcript');
      }
      
    } catch (error) {
      console.log('Fabric transcript download failed:', error.message);
      throw error;
    }
  }

  // Parse VTT subtitle format to clean text
  async parseVTTToText(vttFilePath) {
    try {
      const vttContent = await fs.readFile(vttFilePath, 'utf8');
      
      // Split by lines and process
      const lines = vttContent.split('\n');
      let sentences = [];
      let lastSentence = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip VTT headers, timestamps, and styling
        if (trimmed === '' || 
            trimmed === 'WEBVTT' || 
            trimmed.includes('-->') || 
            trimmed.match(/^\d+$/) ||
            trimmed.startsWith('NOTE ') ||
            trimmed.startsWith('<') ||
            trimmed.startsWith('Kind:') ||
            trimmed.startsWith('Language:')) {
          continue;
        }
        
        // Clean up the text line
        let cleanLine = trimmed
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&amp;/g, '&')   // Decode HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        if (cleanLine && cleanLine.length > 3) {
          // Avoid repetitions - only add if it's different from the last sentence
          if (cleanLine !== lastSentence) {
            sentences.push(cleanLine);
            lastSentence = cleanLine;
          }
        }
      }
      
      // Join sentences and clean up
      let transcript = sentences.join(' ')
        .replace(/\s+/g, ' ')           // Multiple spaces to single
        .replace(/\.+/g, '.')           // Multiple periods to single
        .replace(/\s+([.!?])/g, '$1')   // Remove space before punctuation
        .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Fix sentence spacing
        .trim();
      
      // Remove common repetition patterns
      transcript = this.removeRepetitions(transcript);
      
      if (transcript.length < 50) {
        throw new Error('Transcript too short, likely invalid');
      }
      
      return transcript;
      
    } catch (error) {
      throw new Error(`Failed to parse VTT file: ${error.message}`);
    }
  }

  // Remove common repetition patterns from transcript
  removeRepetitions(text) {
    // Split into words and remove repeated sequences
    const words = text.split(' ');
    const cleanWords = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if this word starts a repetition pattern
      let repetitionLength = 0;
      for (let len = 1; len <= 10 && i + len * 3 < words.length; len++) {
        // Check if the next few words repeat
        let isRepeating = true;
        for (let j = 0; j < len; j++) {
          if (words[i + j] !== words[i + len + j] || words[i + j] !== words[i + len * 2 + j]) {
            isRepeating = false;
            break;
          }
        }
        if (isRepeating) {
          repetitionLength = len;
        }
      }
      
      if (repetitionLength > 0) {
        // Add the sequence once and skip the repetitions
        for (let j = 0; j < repetitionLength; j++) {
          cleanWords.push(words[i + j]);
        }
        i += repetitionLength * 3 - 1; // Skip the repeated parts
      } else {
        cleanWords.push(word);
      }
    }
    
    return cleanWords.join(' ');
  }

  // Main method to download transcript with fallbacks
  async downloadTranscript(youtubeUrl, outputDir) {
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
    
    // Check if transcript already exists
    if (await fs.pathExists(transcriptFile)) {
      console.log('Using existing transcript file...');
      const transcript = await fs.readFile(transcriptFile, 'utf8');
      return {
        transcript,
        source: 'cached',
        file: transcriptFile
      };
    }

    // Try multiple methods in order of preference
    const methods = [
      () => this.downloadWithYtDlp(youtubeUrl, outputDir),
      () => this.downloadWithYoutubeDl(youtubeUrl, outputDir),
      () => this.downloadWithFabric(youtubeUrl, outputDir)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        const result = await methods[i]();
        console.log(`Transcript downloaded successfully using ${result.source}`);
        console.log(`Transcript length: ${result.transcript.length} characters`);
        return result;
      } catch (error) {
        console.log(`Method ${i + 1} failed: ${error.message}`);
        
        if (i === methods.length - 1) {
          // All methods failed
          throw new Error(`All transcript download methods failed. Last error: ${error.message}`);
        }
      }
    }
  }

  // Create a fallback transcript if download fails
  createFallbackTranscript(youtubeUrl, metadata = null) {
    let fallback = `# Transcript Not Available\n\n`;
    fallback += `**YouTube URL**: ${youtubeUrl}\n`;
    
    if (metadata) {
      fallback += `**Video Title**: ${metadata.title || 'Unknown'}\n`;
      fallback += `**Channel**: ${metadata.uploader || 'Unknown'}\n`;
    }
    
    fallback += `\n**Note**: This video's transcript could not be automatically downloaded. `;
    fallback += `This may be because:\n`;
    fallback += `- The video has no captions/subtitles\n`;
    fallback += `- Captions are disabled\n`;
    fallback += `- The video is private or restricted\n`;
    fallback += `- Network or tool configuration issues\n\n`;
    fallback += `To analyze this video, you may need to:\n`;
    fallback += `1. Enable captions on the video\n`;
    fallback += `2. Manually provide a transcript\n`;
    fallback += `3. Check if the video is publicly accessible\n`;
    
    return {
      transcript: fallback,
      source: 'fallback',
      file: null
    };
  }
}

module.exports = TranscriptDownloader;
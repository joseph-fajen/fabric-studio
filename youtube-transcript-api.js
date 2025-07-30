// YouTube Data API v3 transcript extractor with OAuth2 authentication
// More reliable than scraping, uses official Google APIs with proper auth

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const http = require('http');
const oauth2Manager = require('./oauth2-config');

const execAsync = promisify(exec);

class YouTubeTranscriptAPI {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async downloadTranscript(youtubeUrl, outputDir) {
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Try OAuth2 authentication first (preferred method)
    if (oauth2Manager.isAuthenticated()) {
      try {
        console.log('Downloading transcript with OAuth2 authenticated YouTube API...');
        return await this.downloadWithOAuth2(videoId, outputDir);
      } catch (error) {
        console.error('OAuth2 method failed:', error.message);
        // Fall back to other methods
      }
    }

    // Fallback to API key method if available
    if (this.apiKey) {
      try {
        console.log('Downloading transcript with YouTube Data API key...');
        return await this.downloadWithApiKey(videoId, outputDir);
      } catch (error) {
        console.error('API key method failed:', error.message);
        // Fall back to yt-dlp
      }
    }

    // Final fallback to yt-dlp
    console.log('Falling back to yt-dlp with proxy options...');
    return await this.downloadWithProxy(youtubeUrl, outputDir);
  }

  async downloadWithOAuth2(videoId, outputDir) {
    const youtube = oauth2Manager.getYouTubeClient();
    
    // Get captions list
    const captionsResponse = await youtube.captions.list({
      part: 'snippet',
      videoId: videoId
    });

    if (!captionsResponse.data.items || captionsResponse.data.items.length === 0) {
      throw new Error('No captions available for this video');
    }

    // Find English captions or use first available
    const englishCaption = captionsResponse.data.items.find(item => 
      item.snippet.language === 'en' || 
      item.snippet.language.startsWith('en')
    ) || captionsResponse.data.items[0];

    // Download the actual transcript content
    const transcriptResponse = await youtube.captions.download({
      id: englishCaption.id,
      tfmt: 'srv1' // Plain text format
    });

    const transcriptContent = transcriptResponse.data;

    // Validate transcript content
    if (!transcriptContent || transcriptContent.length < 50) {
      throw new Error('YouTube API returned empty or invalid transcript');
    }

    // Process and clean the transcript
    const cleanTranscript = this.cleanTranscript(transcriptContent);

    // Save to file
    const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
    await fs.writeFile(transcriptFile, cleanTranscript);
    
    console.log('✅ Transcript downloaded successfully via OAuth2 YouTube API');
    return transcriptFile;
  }

  async downloadWithApiKey(videoId, outputDir) {
    // Use YouTube Data API to get captions
    const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`;
    
    const data = await this.makeHttpsRequest(url);
    
    if (data.items && data.items.length > 0) {
      // Find English captions
      const englishCaption = data.items.find(item => 
        item.snippet.language === 'en' || 
        item.snippet.language.startsWith('en')
      ) || data.items[0];

      // Download the actual transcript content
      const captionUrl = `https://www.googleapis.com/youtube/v3/captions/${englishCaption.id}?key=${this.apiKey}`;
      const transcriptContent = await this.makeHttpsRequest(captionUrl, true);

      // Check if response is an error (contains JSON error structure)
      if (transcriptContent.includes('"error"') || transcriptContent.includes('UNAUTHENTICATED') || transcriptContent.includes('oauth2')) {
        throw new Error(`YouTube API authentication failed: ${transcriptContent.slice(0, 200)}...`);
      }

      // Validate transcript content
      if (!transcriptContent || transcriptContent.length < 50) {
        throw new Error('YouTube API returned empty or invalid transcript');
      }

      // Save to file
      const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
      await fs.writeFile(transcriptFile, transcriptContent);
      
      console.log('✅ Transcript downloaded successfully via YouTube API');
      return transcriptFile;
    } else {
      throw new Error('No captions available for this video');
    }
  }

  async makeHttpsRequest(url, returnText = false) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (returnText) {
              resolve(data);
            } else {
              resolve(JSON.parse(data));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`HTTPS request failed: ${error.message}`));
      });
    });
  }

  async downloadWithProxy(youtubeUrl, outputDir) {
    console.log('Attempting yt-dlp with additional options...');
    
    const videoId = this.extractVideoId(youtubeUrl);
    const path = require('path');
    const fs = require('fs-extra');
    
    try {
      // Try with additional YouTube-specific options
      const command = `yt-dlp --write-auto-subs --skip-download --sub-langs en --sub-format vtt --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" --referer "https://www.youtube.com/" --add-header "Accept-Language:en-US,en;q=0.9" "${youtubeUrl}" -o "${path.join(outputDir, 'temp_%(id)s.%(ext)s')}"`;
      
      await execAsync(command, {
        timeout: 30000,
        cwd: outputDir
      });

      // Process the downloaded VTT file
      const files = await fs.readdir(outputDir);
      const vttFile = files.find(f => f.includes(videoId) && f.endsWith('.vtt'));
      
      if (vttFile) {
        const vttContent = await fs.readFile(path.join(outputDir, vttFile), 'utf8');
        const transcript = this.parseVTT(vttContent);
        
        const transcriptFile = path.join(outputDir, `transcript_${videoId}.txt`);
        await fs.writeFile(transcriptFile, transcript);
        
        // Clean up VTT file
        await fs.unlink(path.join(outputDir, vttFile));
        
        console.log('✅ Transcript downloaded successfully via yt-dlp');
        return transcriptFile;
      } else {
        throw new Error('No VTT file found after download');
      }
    } catch (error) {
      console.error('Proxy method also failed:', error.message);
      throw new Error('All transcript download methods failed');
    }
  }

  cleanTranscript(content) {
    // Clean transcript content from various formats
    if (typeof content !== 'string') {
      content = String(content);
    }

    // Remove XML tags and timestamps if present
    content = content.replace(/<[^>]*>/g, '');
    content = content.replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '');
    content = content.replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, '');
    
    // Clean up whitespace and normalize
    content = content.replace(/\s+/g, ' ').trim();
    
    return content;
  }

  parseVTT(vttContent) {
    // Convert VTT format to plain text
    const lines = vttContent.split('\n');
    const transcript = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip metadata and timestamp lines
      if (line && !line.includes('-->') && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
        transcript.push(line);
      }
    }
    
    return transcript.join(' ').replace(/\s+/g, ' ').trim();
  }
}

module.exports = YouTubeTranscriptAPI;
// YouTube Metadata Extraction
// Extracts video title and metadata for descriptive folder naming

const { exec } = require('child_process');

class YouTubeMetadata {
  constructor() {
    this.maxTitleLength = 50;
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

  // Sanitize title for use in folder names
  sanitizeTitle(title) {
    if (!title) return 'Unknown-Video';
    
    return title
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')     // Remove leading/trailing hyphens
      .substring(0, this.maxTitleLength) // Limit length
      .replace(/-$/, '');        // Remove trailing hyphen if cut off
  }

  // Get current date in YYYY-MM-DD format
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Extract metadata using yt-dlp (if available) or fallback methods
  async extractMetadata(youtubeUrl) {
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    try {
      // Try yt-dlp first (most reliable)
      const metadata = await this.tryYtDlp(youtubeUrl);
      if (metadata) return metadata;
    } catch (error) {
      console.log('yt-dlp not available, trying youtube-dl...');
    }

    try {
      // Try youtube-dl as fallback
      const metadata = await this.tryYoutubeDl(youtubeUrl);
      if (metadata) return metadata;
    } catch (error) {
      console.log('youtube-dl not available, using basic extraction...');
    }

    // Fallback to basic metadata
    return this.createBasicMetadata(youtubeUrl, videoId);
  }

  // Try extracting metadata with yt-dlp
  async tryYtDlp(url) {
    return new Promise((resolve, reject) => {
      const command = `yt-dlp --dump-json --no-download "${url}"`;
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const data = JSON.parse(stdout);
          resolve({
            title: data.title || 'Unknown Video',
            uploader: data.uploader || 'Unknown Channel',
            duration: data.duration || 0,
            upload_date: data.upload_date || '',
            description: data.description || '',
            tool: 'yt-dlp'
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  // Try extracting metadata with youtube-dl
  async tryYoutubeDl(url) {
    return new Promise((resolve, reject) => {
      const command = `youtube-dl --dump-json --no-download "${url}"`;
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const data = JSON.parse(stdout);
          resolve({
            title: data.title || 'Unknown Video',
            uploader: data.uploader || 'Unknown Channel',
            duration: data.duration || 0,
            upload_date: data.upload_date || '',
            description: data.description || '',
            tool: 'youtube-dl'
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  // Create basic metadata when tools aren't available
  createBasicMetadata(url, videoId) {
    return {
      title: `YouTube-Video-${videoId}`,
      uploader: 'Unknown-Channel',
      duration: 0,
      upload_date: '',
      description: '',
      tool: 'basic',
      videoId
    };
  }

  // Generate descriptive folder name
  generateFolderName(metadata, processId) {
    const date = this.getCurrentDate();
    const sanitizedTitle = this.sanitizeTitle(metadata.title);
    const shortId = processId.substring(0, 8);
    
    return `${date}_${sanitizedTitle}_${shortId}`;
  }

  // Generate descriptive filename for downloads
  generateDownloadName(metadata, processId) {
    const sanitizedTitle = this.sanitizeTitle(metadata.title);
    const shortId = processId.substring(0, 8);
    
    return `${sanitizedTitle}_analysis_${shortId}.zip`;
  }

  // Create enhanced index content with metadata
  createIndexContent(metadata, youtubeUrl) {
    const date = new Date().toISOString();
    
    return `# YouTube Video Analysis Results

**Video Title**: ${metadata.title}
**Channel**: ${metadata.uploader}
**YouTube URL**: ${youtubeUrl}
**Processing Date**: ${date}
**Extraction Tool**: ${metadata.tool}

${metadata.duration > 0 ? `**Duration**: ${Math.floor(metadata.duration / 60)}:${String(metadata.duration % 60).padStart(2, '0')}` : ''}
${metadata.upload_date ? `**Upload Date**: ${metadata.upload_date}` : ''}

## Files Generated

### Phase 1: Primary Extraction
- **01-youtube_summary.txt** - Comprehensive video summary
- **02-extract_core_message.txt** - Central thesis and key messages

### Phase 2: Content Analysis  
- **03-extract_wisdom.txt** - Life lessons and insights
- **04-extract_insights.txt** - Deep analytical observations
- **05-extract_ideas.txt** - Novel concepts and innovations
- **06-extract_patterns.txt** - Recurring themes and structures
- **07-extract_recommendations.txt** - Actionable guidance
- **08-extract_predictions.txt** - Future implications and trends

### Phase 3: Knowledge Graph Building
- **09-extract_references.txt** - People, organizations, and resources
- **10-extract_questions.txt** - Critical questions raised
- **11-create_tags.txt** - Comprehensive tagging system

### Phase 4: Synthesis Materials
- **12-create_5_sentence_summary.txt** - Ultra-concise overview
- **13-to_flashcards.txt** - Educational flashcards for learning

## Video Description

${metadata.description ? metadata.description.substring(0, 500) + (metadata.description.length > 500 ? '...' : '') : 'No description available.'}

---
*Generated by Fabric Studio*
`;
  }
}

module.exports = YouTubeMetadata;
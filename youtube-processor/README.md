# YouTube Processor

This directory contains the original YouTube-specific functionality from the YouTube Fabric Processor project. These files enable direct YouTube URL processing with transcript download capabilities.

## ⚠️ Local Development Only

**IMPORTANT**: This YouTube processing functionality is designed for local development only. Due to YouTube's aggressive bot detection on cloud platforms, these features will not work in production deployments (Railway, Heroku, AWS, etc.).

## Files Included

### Core YouTube Processing
- **`transcript-downloader.js`** - Robust YouTube transcript extraction with 4-tier fallback system
- **`youtube-metadata.js`** - Video metadata extraction and folder naming
- **`oauth2-routes.js`** - YouTube OAuth2 authentication routes for local development
- **`oauth2-tokens.json`** - OAuth2 token persistence storage

### 4-Tier Transcript Fallback System
1. **YouTube Data API v3** - Official Google API (requires YOUTUBE_API_KEY)
2. **yt-dlp with bot evasion** - Enhanced headers and YouTube-specific options
3. **youtube-dl fallback** - Legacy tool support
4. **Fabric CLI transcript** - Built-in YouTube support

## Usage Instructions

### Option 1: Use the youtube-local Branch (Recommended)
The complete YouTube processing functionality is preserved on the `youtube-local` branch:

```bash
# Switch to YouTube-specific branch
git checkout youtube-local
npm install
npm start

# Access at http://localhost:3000 for full YouTube functionality
```

### Option 2: Integrate into Custom Applications
These files can be integrated into custom applications that need YouTube transcript processing capabilities:

```javascript
const TranscriptDownloader = require('./youtube-processor/transcript-downloader');
const YouTubeMetadata = require('./youtube-processor/youtube-metadata');

// Example usage
const downloader = new TranscriptDownloader();
const metadata = new YouTubeMetadata();

// Process YouTube video
const videoMetadata = await metadata.extractMetadata(youtubeUrl);
const transcript = await downloader.downloadTranscript(youtubeUrl, outputDir);
```

## Prerequisites for YouTube Processing

### Required Tools
- **Node.js** 14+
- **Python** 3.6+ (for yt-dlp)
- **yt-dlp**: `pip install yt-dlp`
- **Go** (for Fabric CLI): Install from https://golang.org/dl/
- **Fabric CLI**: `go install github.com/danielmiessler/fabric@latest`

### Optional (Enhanced Features)
- **YouTube Data API v3 Key** - For official Google API access
- **Google OAuth2 Credentials** - For authenticated API access

## Environment Variables

### Required
- `ANTHROPIC_API_KEY` - For Fabric pattern processing

### Optional YouTube Enhancement
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `GOOGLE_CLIENT_ID` - OAuth2 client ID
- `GOOGLE_CLIENT_SECRET` - OAuth2 client secret
- `OAUTH2_REDIRECT_URI` - OAuth2 callback URL (default: http://localhost:3000/auth/google/callback)

## OAuth2 Setup for Local Development

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing one
   - Enable YouTube Data API v3

2. **Configure OAuth2**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`

3. **Set Environment Variables**:
   ```bash
   export GOOGLE_CLIENT_ID="your_client_id"
   export GOOGLE_CLIENT_SECRET="your_client_secret"
   export YOUTUBE_API_KEY="your_api_key"
   ```

## Deployment Limitations

### ❌ Cloud Platforms (Railway, Heroku, AWS)
- YouTube bot detection blocks server-based transcript downloads
- OAuth2 authentication works but API has permission restrictions
- yt-dlp and youtube-dl are blocked by YouTube's detection systems

### ✅ Local Development
- All transcript download methods work properly
- OAuth2 token persistence implemented
- Complete functionality available

## Integration with Main Application

The main Fabric Studio application (on the `main` branch) supports both universal content processing and YouTube processing:

- **Universal Content**: Upload transcripts or paste content directly
- **YouTube Processing**: Available through these YouTube processor files

For the best of both worlds:
1. Use the `main` branch for production deployment (Railway, etc.)
2. Use the `youtube-local` branch or these files for local YouTube processing

## Performance

When working locally with YouTube content:
- **Processing Time**: ~70 seconds for 13 fabric patterns
- **Transcript Download**: 3-5 seconds (4-tier fallback ensures reliability)
- **Method**: Transcript-first parallel processing (3 patterns at a time)
- **Success Rate**: 100% for accessible YouTube videos

## Troubleshooting

### "No transcript available"
- Video may not have captions
- Try different videos with known captions
- Check OAuth2 authentication status

### "yt-dlp not found"
```bash
pip install yt-dlp
# Or with specific version
pip install yt-dlp==2023.7.6
```

### OAuth2 authentication issues
- Verify Google Cloud project configuration
- Check redirect URI matches exactly
- Ensure YouTube Data API v3 is enabled

### Bot detection errors (cloud deployment)
This is expected behavior. YouTube aggressively blocks server-based transcript downloads on cloud platforms. Use the universal content processing features instead.

## Support

For YouTube-specific issues:
1. Check the `youtube-local` branch for the complete working implementation
2. Verify all prerequisites are installed locally
3. Test with short, publicly available YouTube videos first
4. Review OAuth2 setup if using API authentication

---

**Note**: This YouTube processing functionality represents the preserved original capabilities of the YouTube Fabric Processor. For new deployments, consider using the universal content processing features on the main branch for better reliability and cloud compatibility.
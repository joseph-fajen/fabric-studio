# Universal Content Intelligence Platform

A high-performance web application that transforms any text content into comprehensive insights using 13 fabric patterns. Originally designed for YouTube videos, it has evolved to process diverse content types including meeting transcripts, podcast notes, research papers, and educational materials. Achieves 38-second processing times through a revolutionary "transcript-first" architecture.

## Features

- **Universal Content Processing**: Support for transcripts, meeting notes, educational content, research papers, and more
- **Lightning Fast**: Process 13 fabric patterns in ~38 seconds (46% faster than original target)
- **Multi-Input Interface**: File upload (.txt, .vtt, .srt), direct text paste, or YouTube URL processing
- **Intelligent Format Detection**: Automatic detection and parsing of VTT, SRT, speaker-labeled, timestamped, and plain text formats
- **Real-Time Progress**: WebSocket-powered progress tracking with live format detection and processing updates
- **Professional Output**: 13 markdown files plus enhanced metadata and ZIP download
- **Production Ready**: Railway deployment ready with minimal dependencies
- **Management Console**: Comprehensive server management with status monitoring, processing history, and system controls

## Quick Start

### 1. Prerequisites

**Required:**
- **Node.js** 14+
- **Go** (for Fabric CLI installation)
- **Anthropic API Key** (recommended) or OpenAI API Key

**Optional (for YouTube processing only):**
- **Python** (for yt-dlp transcript downloader) - only needed for `youtube-local` branch

### 2. Clone and Install
```bash
git clone https://github.com/joseph-fajen/youtube-fabric-processor.git
cd youtube-fabric-processor
npm install
```

### 3. Install Fabric CLI
```bash
# Install Fabric CLI (required for all content processing)
go install github.com/danielmiessler/fabric@latest

# Optional: Install YouTube tools (only for youtube-local branch)
pip install yt-dlp  # YouTube transcript downloader
```

### 4. Configure Fabric CLI
```bash
fabric --setup
# Follow prompts to:
# - Choose AI provider (Anthropic recommended)
# - Enter API key (Anthropic or OpenAI)
# - Set default model (claude-3-5-sonnet-20241022 recommended)
```

### 5. Start the Application
```bash
npm start
# Application runs on port 3000 (or next available port)
# Access at http://localhost:3000
```

## Usage

The Universal Content Intelligence Platform offers three ways to process content:

### Method 1: File Upload (Recommended)
1. **Upload Transcript File**: Support for .txt, .vtt, .srt files
2. **Automatic Format Detection**: System identifies and optimizes format automatically
3. **Start Processing**: Click "Begin Deep Analysis" 
4. **Monitor Progress**: Watch real-time format detection and pattern execution
5. **Download Results**: Get ZIP file with all 13 analysis files

### Method 2: Direct Text Paste
1. **Paste Content**: Directly paste transcript or text content
2. **Format Analysis**: System analyzes and prepares content for processing
3. **Process Content**: Same analysis pipeline as file upload
4. **Download Results**: Complete analysis package delivered

### Method 3: YouTube Processing (youtube-local branch)
Switch to the `youtube-local` branch for YouTube-specific functionality:
```bash
git checkout youtube-local
npm start
```
1. **Enter YouTube URL**: Paste any YouTube video URL
2. **Transcript Download**: Automatic transcript extraction with 4-tier fallback
3. **Process Video**: Same 13-pattern analysis as other content types
4. **Enhanced Metadata**: Video-specific information included in results

## Supported Content Types

### Professional Formats (Optimal)
- **WebVTT (.vtt)**: Professional subtitle format with speaker tags and timestamps
- **SubRip (.srt)**: Standard subtitle format with sequence numbers
- **Format Benefits**: Preserves speaker identification and duration estimation

### Conversational Formats (Excellent)
- **Speaker-labeled**: Meeting transcripts with "Speaker Name: dialogue" patterns
- **Interview Transcripts**: Automatic speaker detection and cataloging
- **Panel Discussions**: Multi-speaker conversation analysis

### Timestamped Formats (Good)
- **YouTube Format**: `[HH:MM:SS] content` pattern recognition
- **Simple Timestamps**: `MM:SS` or `HH:MM:SS` content patterns
- **Duration Calculation**: Automatic content length estimation

### Universal Support (Good)
- **Plain Text**: Direct processing of any text content
- **Mixed Formats**: Handles inconsistent formatting gracefully
- **Research Papers**: Academic and technical document analysis

## Content Length Recommendations

**IMPORTANT**: This application is optimized for comprehensive content analysis. Fabric patterns are designed for complete content analysis and lose significant effectiveness when content is chunked.

### Recommended Limits:
- **✅ Optimal (up to 2 hours)**: Full effectiveness with all 13 fabric patterns
- **⚠️ Acceptable (2-3 hours)**: Good results, may hit model token limits  
- **❌ Not Recommended (3+ hours)**: Significantly reduced pattern effectiveness (~25% quality)

### Technical Reasoning:
- Fabric patterns require complete context for effective analysis
- Chunking breaks narrative flow and cross-references
- Token limits: ~50K per model, ~250 tokens/minute average speech
- Beyond 3 hours requires chunking which fundamentally compromises fabric pattern design

### Content Type Optimization:
- **Meeting Transcripts**: Excellent for action items, decision summaries, and insights
- **Educational Content**: Perfect for creating study guides and knowledge extraction
- **Podcast Content**: Optimal for key insights and educational summaries
- **Research Materials**: Ideal for thematic analysis and insight extraction
- **Corporate Training**: Great for creating actionable summaries and key points

## Branch Strategy

### Main Branch: Universal Platform (Production Ready)
- **Focus**: Universal content processing with transcript upload/paste
- **Deployment**: Works on all cloud platforms (Railway, Heroku, AWS, etc.)
- **Dependencies**: Minimal - only Node.js + Fabric CLI required
- **Use When**: Processing any non-YouTube content or deploying to production

### YouTube-Local Branch: YouTube Processing (Local Development)
- **Focus**: Direct YouTube URL processing via transcript download
- **Deployment**: Local development only (cloud deployment blocked by YouTube bot detection)
- **Dependencies**: Requires Python, yt-dlp, and optional YouTube Data API v3 key
- **Use When**: Processing YouTube content directly in local development environment

```bash
# Switch between branches
git checkout main         # Universal platform
git checkout youtube-local # YouTube processing
```

## Output Structure

Each processed content creates a timestamped folder containing 13 analysis files:

### Phase 1: Primary Extraction
- `01-content_summary.txt` - Comprehensive content summary
- `02-extract_core_message.txt` - Central thesis and key messages

### Phase 2: Content Analysis
- `03-extract_wisdom.txt` - Life lessons and insights
- `04-extract_insights.txt` - Deep analytical observations
- `05-extract_ideas.txt` - Novel concepts and innovations
- `06-extract_patterns.txt` - Recurring themes and structures
- `07-extract_recommendations.txt` - Actionable guidance
- `08-extract_predictions.txt` - Future implications and trends

### Phase 3: Knowledge Graph Building
- `09-extract_references.txt` - People, organizations, and resources
- `10-extract_questions.txt` - Critical questions raised
- `11-create_tags.txt` - Comprehensive tagging system

### Phase 4: Synthesis Materials
- `12-create_5_sentence_summary.txt` - Ultra-concise overview
- `13-to_flashcards.txt` - Educational flashcards for learning

### Additional Files
- `index.md` - Metadata, processing statistics, and file descriptions
- `content_analysis.zip` - Complete downloadable package

## Architecture

### Universal Content Processing (Primary)
- **Frontend**: Modern interface with multi-input support and real-time format detection
- **Format Parser**: `TranscriptFormatParser` module with confidence scoring and automatic optimization
- **Processing Engine**: Direct Fabric CLI integration with parallel pattern execution
- **Content Types**: Support for 6+ transcript formats with intelligent detection

### YouTube Processing (youtube-local branch)
- **Transcript Download**: 4-tier fallback system (YouTube Data API v3, yt-dlp, youtube-dl, Fabric CLI)
- **Metadata Extraction**: Video title, description, duration, channel information
- **OAuth2 Integration**: YouTube Data API authentication for enhanced transcript access
- **Same Processing**: Identical 13-pattern analysis as universal platform

### Technical Implementation
- **Backend**: Node.js/Express with WebSocket support for real-time updates
- **Processing**: Parallel execution (3 patterns at a time) across 4 phases
- **Performance**: 38-second average processing time with 100% pattern success rate
- **Deployment**: Production-ready with minimal environment variables

## API Endpoints

### Core Processing
- `POST /api/process` - Start content processing with dual payload support:
  - **Universal Content**: `{ "contentType": "transcript", "transcript": "content", "filename": "optional" }`
  - **YouTube Content**: `{ "contentType": "youtube", "youtubeUrl": "URL" }` (youtube-local branch)
- `GET /api/process/:id` - Check processing status with real-time updates
- `GET /api/download/:id` - Download complete results ZIP package

### Management API
- `GET /api/management/status` - Server status and active processes
- `GET /api/management/history` - Processing history and analytics
- `POST /api/management/cleanup-old` - Clean old output folders
- `POST /api/management/restart` - Server restart functionality
- `POST /api/management/shutdown` - Graceful server shutdown

### API Key Management
- `GET /api/management/config/api-keys` - API key configuration status
- `POST /api/management/config/api-keys` - Configure fallback API providers
- `POST /api/management/config/test-apis` - Test API connections

## Performance Metrics

- **Processing Time**: 38 seconds average (46% improvement over target)
- **Pattern Success**: 100% (13/13 patterns execute successfully)
- **Format Detection**: 6+ supported formats with confidence scoring
- **Deployment**: Production-ready with Railway deployment optimization

## Environment Variables

### Required
- `ANTHROPIC_API_KEY` - Anthropic API key for Fabric CLI (recommended)

### Optional
- `PORT` - Server port (default: 3000)
- `FABRIC_MODEL` - AI model for processing (default: claude-3-5-sonnet-20241022)
- `MAX_CONCURRENT` - Parallel pattern limit (default: 3)

### YouTube-Specific (youtube-local branch only)
- `YOUTUBE_API_KEY` - YouTube Data API v3 key for enhanced transcript downloading
- `GOOGLE_CLIENT_ID` - OAuth2 client ID for YouTube authentication
- `GOOGLE_CLIENT_SECRET` - OAuth2 client secret for YouTube authentication

## Deployment

### Production Deployment (Main Branch)
The Universal Platform is optimized for cloud deployment:

```bash
# Railway deployment
npm start

# Heroku deployment
npm start

# AWS/Docker deployment
npm start
```

**Requirements:**
- Node.js runtime
- Fabric CLI installation
- Anthropic API key

### Local Development (Both Branches)
```bash
# Universal platform
git checkout main
npm run dev

# YouTube processing
git checkout youtube-local
npm run dev
```

## Troubleshooting

### Format Detection Issues
```bash
# Check supported formats
# Upload sample files to test format detection confidence
# Review format recommendations in processing interface
```

### Go Environment Issues
```bash
# Common error: "cannot find GOROOT directory"
# Check current GOROOT setting
echo $GOROOT

# If GOROOT points to wrong path, fix it:
# For standard Go installation:
export GOROOT=/usr/local/go

# For Homebrew Go installation:
export GOROOT=$(brew --prefix go)/libexec

# Add to shell profile for persistence
echo 'export GOROOT=/usr/local/go' >> ~/.zshrc  # or correct path
echo 'export PATH=$PATH:/usr/local/go/bin:$(go env GOPATH)/bin' >> ~/.zshrc
source ~/.zshrc

# Verify Go is working
go version
```

### "Fabric command not found"
```bash
# Ensure Go bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin
# Add to shell profile for persistence
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.zshrc
```

### "Pattern execution failed"
```bash
# Verify fabric setup
fabric --setup
# Test fabric directly
echo "test content" | fabric -p extract_wisdom
```

### YouTube Processing Issues (youtube-local branch)
```bash
# Test yt-dlp
yt-dlp --version
# Install if missing
pip install yt-dlp
# Verify YouTube Data API key
```

## Key Dependencies

### Universal Platform (Main Branch)
- **Node.js** 14+ - Runtime environment
- **Fabric CLI** - AI pattern processing engine
- **Express.js** - Web server framework
- **WebSocket** - Real-time progress updates

### YouTube Processing (youtube-local branch)
- **yt-dlp** - YouTube transcript extraction
- **YouTube Data API v3** - Official Google API integration
- **OAuth2** - YouTube authentication

## Recent Updates

- **Phase 1 Complete**: Universal Content Intelligence Platform successfully implemented
- **38-Second Processing**: 46% performance improvement over original target
- **Multi-Input Interface**: File upload, text paste, and optional YouTube processing
- **Format Detection**: Advanced TranscriptFormatParser with confidence scoring
- **Production Ready**: Railway deployment optimization with minimal dependencies
- **Branch Strategy**: Clear separation between universal platform and YouTube functionality

## License

MIT License - See LICENSE file for details

---

**Strategic Evolution Complete**: This platform has successfully evolved from a YouTube-specific tool to a Universal Content Intelligence Platform while preserving all original functionality on the `youtube-local` branch for local development use.
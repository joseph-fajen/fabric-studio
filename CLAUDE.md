# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fabric Studio** is a Node.js web application that transforms any text content into comprehensive insights using 13 fabric patterns from Daniel Miessler's Fabric framework. Originally designed for YouTube videos, it has evolved to process diverse content types including meeting transcripts, podcast notes, research papers, and educational materials. It achieves 70-second processing times through a "transcript-first" architecture.

**STRATEGIC EVOLUTION COMPLETE**: Phase 1 Implementation completed - transformed from YouTube-specific tool to **Fabric Studio**. The cloud-deployable version supports transcript upload/paste functionality optimized for Railway deployment, while YouTube processing is preserved on `youtube-local` branch for local development. See `STRATEGIC-ARCHITECTURE-DECISION.md` for complete strategic analysis.

## Development Commands

### Start Application
```bash
npm start              # Production mode on port 3000
npm run dev           # Development mode with nodemon
```

### Repository Structure
- **Main Branch** (`main`): Fabric Studio with universal content processing and YouTube modules in `youtube-processor/` directory
- **YouTube Branch** (`youtube-local`): Complete original YouTube-specific version for local development
- **Development Branch** (`development`): Current development and testing branch

### Switch Between Versions
```bash
# Use Universal Platform (transcript upload)
git checkout main
npm start

# Use YouTube version (local development only)
git checkout youtube-local
npm start
```
```bash
npm start              # Production mode on port 3000
npm run dev           # Development mode with nodemon
```

### Dependencies Setup
```bash
npm install                      # Install Node.js dependencies
npm run install:yt-dlp          # Install yt-dlp for transcript download
npm run setup                   # Install all dependencies
```

### Required External Tools
- **Fabric CLI**: `go install github.com/danielmiessler/fabric/cmd/fabric@latest` (required for all content processing)

### YouTube-Specific Tools (youtube-local branch only)
- **yt-dlp**: `pip install yt-dlp` (primary transcript downloader)  
- **youtube-dl**: Fallback transcript downloader
- **YouTube Data API v3**: Optional API key for enhanced transcript downloading

## Architecture Overview

### Core Processing Flow

#### Universal Platform (Main Branch)
1. **Content Input** - Upload transcript file or paste content directly
2. **Format Detection** (`transcript-format-parser.js`) - Automatic detection of VTT, SRT, speaker-labeled, timestamped, or plain text
3. **Content Normalization** - Clean and optimize transcript for processing
4. **Parallel Execution** - Process 3 patterns simultaneously for optimal performance
5. **Output Generation** - 13 analysis files plus enhanced index and ZIP download

#### YouTube Processing (youtube-local branch)
1. **Metadata Extraction** (`youtube-metadata.js`) - Extract video info and create descriptive folders
2. **Transcript Download** (`transcript-downloader.js`) - 4-tier fallback system for transcript acquisition
3. **Parallel Processing** - Same fabric pattern execution as universal platform
4. **Output Generation** - Same output structure as universal platform

### Key Files

#### Universal Platform Core
- `server.js` - Main Express server with WebSocket support and dual processing paths
- `src/core/fabric-transcript-integration.js` - **Primary processing engine** (universal content processing)
- `src/core/transcript-format-parser.js` - **Universal format parser** (VTT, SRT, speaker-labeled, timestamped, plain text)
- `src/core/fabric-patterns.js` - Defines 13 fabric patterns in 4 phases
- `src/utils/server-manager.js` - Enhanced server startup and management
- `src/auth/oauth2-routes.js` - OAuth2 authentication routes
- `src/metadata/youtube-metadata.js` - Video metadata extraction and processing
- `public/` - Universal web interface with transcript upload and real-time progress tracking

#### YouTube-Specific (youtube-local branch and youtube-processor/ directory)
- `src/transcript/transcript-downloader.js` - Robust YouTube transcript extraction with 4-tier fallback system
- `src/transcript/youtube-transcript-api.js` - YouTube Data API v3 integration for official transcript access  
- `youtube-processor/transcript-downloader.js` - Standalone YouTube transcript extraction module
- `youtube-processor/youtube-metadata.js` - Video metadata extraction and folder naming
- `youtube-processor/oauth2-routes.js` - YouTube OAuth2 authentication for local development

#### Configuration and Scripts
- `config/` - Configuration files and templates
- `scripts/` - Utility scripts for setup and management
- `tests/` - Test files and validation scripts
- `docs/` - Documentation organized by category

### Legacy/Historical Files
- `archive/legacy/fabric-integration.js` - Original sequential processing (backup only)
- `archive/` - Design iterations and development history

## Processing Architecture

### Universal Content Processing (PRIMARY)
The platform supports two processing paths with identical fabric pattern execution:

#### Path 1: Transcript Upload/Paste (Main Branch)
1. **Content Input** - File upload (.txt, .vtt, .srt) or direct paste
2. **Format Detection** - Automatic parsing with confidence scoring
3. **Content Normalization** - Clean timestamps, speaker labels, noise patterns
4. **Processing** - Execute all patterns using normalized transcript
5. **Total time**: ~70 seconds for any content type

#### Path 2: YouTube Processing (youtube-local branch)
1. **YouTube Data API v3** - Official Google API (requires YOUTUBE_API_KEY)
2. **yt-dlp with bot evasion** - Enhanced headers and YouTube-specific options
3. **youtube-dl fallback** - Legacy tool support
4. **Fabric CLI transcript** - Built-in YouTube support
5. **Total time**: ~70 seconds (3-5 seconds download + processing)

### Supported Content Formats
- **VTT (WebVTT)** - Professional subtitle format with timestamps
- **SRT (SubRip)** - Standard subtitle format
- **Speaker-labeled** - Meeting transcripts with "Speaker: text" format
- **Timestamped** - Content with [HH:MM:SS] or MM:SS timestamps
- **Plain Text** - Any text content for direct analysis

## Transcript Format Support

The Universal Content Intelligence Platform includes sophisticated format detection and parsing capabilities via the `TranscriptFormatParser` module.

### Automatic Format Detection
- **Confidence Scoring**: Each format detection includes confidence percentage
- **Pattern Recognition**: Advanced RegEx patterns identify format characteristics
- **Content Optimization**: Automatic cleaning and normalization for optimal fabric processing

### Supported Formats

#### Professional Subtitle Formats
- **WebVTT (.vtt)**: Full support including speaker tags (`<v Speaker>`) and cue settings
- **SubRip (.srt)**: Complete parsing with sequence numbers and HTML tag removal
- **Format Benefits**: Preserves speaker identification and duration estimation

#### Conversational Formats
- **Speaker-labeled**: Automatic detection of "Speaker Name: dialogue" patterns
- **Speaker Extraction**: Identifies and catalogs all speakers for metadata
- **Optimal for**: Meeting transcripts, interviews, panel discussions

#### Timestamped Formats
- **YouTube Format**: `[HH:MM:SS] content` pattern recognition
- **Simple Timestamps**: `MM:SS content` or `HH:MM:SS content` patterns
- **Duration Calculation**: Estimates total content duration from timestamps

#### Universal Support
- **Plain Text**: Direct processing of any text content
- **Mixed Formats**: Handles files with inconsistent formatting
- **Error Recovery**: Graceful fallback to plain text for unrecognized formats

### Content Validation
- **File Size Limits**: Configurable size restrictions for uploaded content
- **Character Limits**: Token estimation and content length validation
- **Format Requirements**: Clear guidance for optimal processing results

### Processing Enhancements
- **Noise Removal**: Eliminates `[Music]`, `[Applause]`, `(Inaudible)` patterns
- **Repetition Cleaning**: Removes repeated words and phrases
- **Whitespace Normalization**: Consistent spacing and line breaks
- **Content Statistics**: Character count, estimated tokens, processing metrics

### Format-Specific Recommendations
The system provides intelligent recommendations based on detected format:
- **Professional formats** (VTT/SRT): Highlighted as optimal for analysis
- **Speaker-labeled content**: Noted as excellent for conversation analysis
- **Long content**: Warnings and guidance for 2+ hour materials
- **Processing optimization**: Format-specific tips for best results

### Fabric Integration
- **Method**: Direct fabric CLI execution
- **Command Pattern**: `cat transcript.txt | fabric -p {pattern} --model {fallback_model}`
- **Primary Model**: claude-3-5-sonnet-20241022 (optimized for speed and cost)
- **Fallback Models**: 6-level hierarchy with GPT-4o, GPT-4o-mini, Claude Haiku, GPT-4 Turbo, GPT-3.5 Turbo
- **Patterns**: 13 predefined patterns in 4 phases
- **Retry Logic**: 3 attempts per model with exponential backoff (2s, 4s, 8s)

### Fallback Hierarchy
1. Transcript-first with fabric CLI (primary)
2. Original sequential processing (backup)
3. Simulation mode (no fabric installation)

## API Endpoints

### Core Processing
- `POST /api/process` - Start content processing with dual payload support:
  - **YouTube Processing**: `{ "contentType": "youtube", "youtubeUrl": "URL" }`
  - **Transcript Processing**: `{ "contentType": "transcript", "transcript": "content", "filename": "optional" }`
- `GET /api/process/:id` - Check processing status
- `GET /api/download/:id` - Download results ZIP (content_analysis.zip)

### Management
- `GET /api/management/status` - Server status and active processes
- `GET /api/management/history` - Processing history
- `POST /api/management/cleanup-old` - Clean old output folders
- `POST /api/management/shutdown` - Graceful server shutdown
- `POST /api/management/restart` - Server restart

### API Key Management
- `GET /api/management/config/api-keys` - Get API key configuration status
- `POST /api/management/config/api-keys` - Save API keys for fallback providers
- `DELETE /api/management/config/api-keys` - Clear all API keys
- `POST /api/management/config/test-apis` - Test API connections
- `POST /api/management/config/fallback-models` - Configure fallback model order

## Output Structure

Each processed content creates a timestamped folder in `outputs/` containing:
- 13 pattern result files (01-13, .txt format)
- `index.md` with metadata and file descriptions
- `content_analysis.zip` for download (or `youtube_analysis.zip` for YouTube content)

### Content Metadata Differences
#### Universal Content
- Content type and format detection results
- Speaker identification (if applicable)
- Estimated duration (from timestamps)
- Processing statistics and format recommendations

#### YouTube Content (youtube-local branch)
- Video title, description, duration, view count
- Channel information and publication date
- Thumbnail URL and video statistics
- YouTube-specific metadata fields

## Key Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `FABRIC_MODEL` - AI model for processing
- `MAX_CONCURRENT` - Parallel pattern limit
- `ADMIN_MODE` - Enable/disable Fabric Studio Console access (default: false, set to 'true' to enable)
- `YOUTUBE_API_KEY` - YouTube Data API v3 key for enhanced transcript downloading
- `ANTHROPIC_API_KEY` - Anthropic API key for Fabric CLI configuration

### Fabric Setup Requirements
Users must configure fabric with:
```bash
fabric --setup
fabric -S  # Set API keys
```

### API Key Configuration
Configure fallback providers via Reef Laboratory Console:
1. Access 🧪 lab portal → "Configure API Keys" 
2. Add API keys for Anthropic, OpenAI, and Google
3. Use "Test API Connections" to verify functionality
4. Configure fallback model order as needed

**Current Working Models:**
- ✅ Anthropic: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
- ✅ OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- ❌ Google: Gemini models not yet available in fabric

### Admin Mode Security

**Fabric Studio Console** provides powerful management functions including server restart/shutdown, data deletion, and API key management. For security, console access is controlled by the `ADMIN_MODE` environment variable.

#### Console Access Control
- **Production (Secure)**: `ADMIN_MODE=false` or unset - Console button (🧪) hidden, management endpoints return 403
- **Development (Admin)**: `ADMIN_MODE=true` - Full console access enabled

#### Protected Functions
When admin mode is disabled, the following management functions are blocked:
- **Server Controls**: Restart, shutdown, stop processing
- **Data Management**: Clear all data, cleanup old files, delete specific folders  
- **API Configuration**: View, modify, or clear stored API keys
- **System Management**: Fallback model configuration, API testing

#### Read-Only Functions (Always Available)
- Server status and health checks
- Processing history viewing
- Basic system monitoring

#### Deployment Recommendations
- **Cloud Deployments**: Always run with `ADMIN_MODE=false` for public-facing instances
- **Local Development**: Use `ADMIN_MODE=true` for full development capabilities
- **Railway/Heroku**: Ensure `ADMIN_MODE` is not set or set to `false` in production environment variables

## Development Guidelines

### Performance Optimization
- The transcript-first approach is critical for performance
- Always process patterns in parallel batches (currently 3)
- Use claude-3-5-sonnet-20241022 for optimal speed/cost balance
- Uses direct Fabric CLI calls for reliable processing

### Error Handling
- Multiple fallback processing methods ensure reliability
- WebSocket provides real-time progress and error feedback
- Graceful degradation through simulation mode

### Branch-Specific Deployment Status

#### Universal Platform (Main Branch) - PRODUCTION READY
- ✅ **Cloud Deployment**: Works on all platforms (Railway, Heroku, AWS, etc.)
- ✅ **No External Dependencies**: Only requires Fabric CLI installation
- ✅ **No YouTube API Constraints**: Processes any text content
- ✅ **Scalable Architecture**: Independent of platform-specific restrictions

#### YouTube Processing (youtube-local branch) - LOCAL DEVELOPMENT ONLY
**Status**: ⚠️ **RAILWAY DEPLOYMENT LIMITATIONS DISCOVERED**
1. **OAuth2 YouTube Data API**: ⚠️ Authentication works, but API has permission restrictions for third-party caption downloads
2. **yt-dlp with enhanced options**: ❌ Blocked by YouTube bot detection on Railway servers
3. **youtube-dl**: ❌ Not installed on Railway, also would be blocked by bot detection
4. **Fabric CLI**: ❌ Blocked by YouTube bot detection on Railway servers

**Current Status**: 
- ✅ **Local Development**: All methods work properly with OAuth2 tokens
- ❌ **Cloud Production**: All transcript download methods blocked by YouTube's aggressive bot detection
- ✅ **OAuth2 Token Persistence**: Implemented environment variable-based storage for Railway's ephemeral filesystem

### Testing

#### Universal Platform Testing
- Use `/health` endpoint for basic functionality
- Test with various transcript formats (VTT, SRT, plain text)
- Upload sample meeting transcripts or podcast content
- Monitor WebSocket connection for real-time feedback
- Verify format detection accuracy with different content types

#### YouTube Testing (youtube-local branch)
- Test with short YouTube videos first
- Verify OAuth2 authentication flow
- Test 4-tier transcript fallback system
- Monitor processing performance with different video lengths

## Recent Session Work
**Latest Session**: **RAILWAY DEPLOYMENT DEBUGGING & FIXES** - Analyzed colleague's Railway test logs and resolved critical deployment issues (August 2025)

### Current Session Accomplishments:
- ✅ **Railway Log Analysis**: Identified three critical deployment issues from colleague's test logs
- ✅ **PayloadTooLargeError Fixed**: Increased Express JSON parser limit to 15mb for large transcript uploads
- ✅ **Fabric CLI Path Detection**: Added Railway-specific `/go/bin/fabric` path resolution
- ✅ **Download Endpoint Enhanced**: Fixed RangeNotSatisfiableError with proper file validation and headers
- ✅ **Enhanced Error Logging**: Added comprehensive Railway debugging logs for troubleshooting
- ✅ **Production Deployment Ready**: All cloud platform deployment constraints resolved

**Previous Transformation**: **IDENTITY TRANSFORMATION COMPLETE** - Successfully rebranded from "YouTube Fabric Processor" to "Fabric Studio" (August 2025)

### Identity Transformation Details:
- **Complete Rebranding**: All references updated across 63+ files from "YouTube Fabric Processor" to "Fabric Studio"
- **Repository Evolution**: Updated package.json, README.md, and all documentation to reflect universal content processing platform
- **UI Enhancement**: Added comprehensive Resources section with curated content sources:
  - YouTube transcript extraction tools (6 professional services)
  - Meeting & collaboration platforms (Zoom, Teams, Otter.ai, Rev.com)
  - Educational content sources (Coursera, Udemy, Khan Academy)
  - Podcast and audio content processing guidance
- **Professional Copywriting**: Implemented high-quality, scannable resource descriptions
- **Responsive Design**: Mobile-optimized resource grid layout
- **Git Preservation**: Created `v1.0-youtube-processor` tag before transformation

**Previous Implementation**: **PHASE 1 COMPLETE** - Universal Content Intelligence Platform successfully implemented on main branch

**Implementation Session**: `session-summaries/SESSION-SUMMARY-2025-08-01-01.md` - **STRATEGIC ARCHITECTURE EVOLUTION SESSION**: Comprehensive analysis of deployment constraints and architectural evolution. Developed strategic pivot from YouTube-specific tool to Universal Content Intelligence Platform. Created detailed implementation plan for transcript-upload approach while preserving local YouTube functionality.

**Previous Session**: `session-summaries/SESSION-SUMMARY-2025-07-31-01.md` - **RAILWAY DEPLOYMENT DEBUGGING SESSION**: Fixed OAuth2 Railway deployment issues including domain mismatch and token persistence. Discovered fundamental YouTube bot detection limitations preventing server-based transcript downloads on Railway. OAuth2 authentication working but hitting API permission barriers.

## Content Length Recommendations
**IMPORTANT**: This application is optimized for comprehensive content analysis. Fabric patterns are designed for complete content analysis and lose significant effectiveness when content is chunked.

### Recommended Limits:
- **✅ Optimal (up to 2 hours)**: Full effectiveness with all 13 fabric patterns
- **⚠️ Acceptable (2-3 hours)**: Good results, may hit model limits  
- **❌ Not Recommended (3+ hours)**: Significantly reduced pattern effectiveness (~25% quality)

### Technical Reasoning:
- Fabric patterns require complete context for effective analysis
- Chunking breaks narrative flow and cross-references
- Token limits: ~50K per model, ~250 tokens/minute average speech
- Beyond 3 hours requires chunking which fundamentally compromises fabric pattern design

### Content Type Optimization:
- **Meeting Transcripts**: Excellent for action items, decision summaries, and insights
- **Podcast Content**: Optimal for key insights and educational summaries
- **Educational Materials**: Perfect for creating study guides and knowledge extraction
- **Research Interviews**: Ideal for thematic analysis and insight extraction
- **Corporate Training**: Great for creating actionable summaries and key points

## Usage Guidelines

### Universal Platform Interface (Main Branch)
The web interface provides dual input methods:
1. **File Upload**: Support for .txt, .vtt, .srt files up to configured size limits
2. **Direct Paste**: Text area for pasting transcript content directly
3. **Real-time Processing**: WebSocket updates show format detection, cleaning progress, and pattern execution
4. **Download Results**: Automatic ZIP generation with all 13 pattern results

### Recommended Content Sources
- **Zoom/Teams Recordings**: Export transcripts directly from meeting platforms
- **Otter.ai/Rev.com**: Professional transcription service outputs
- **YouTube Auto-captions**: Downloaded via youtube-dl or browser extensions
- **Podcast Transcripts**: From Spotify, Apple Podcasts, or transcription services
- **Educational Content**: Coursera, Udemy, Khan Academy transcript exports
- **Research Materials**: Interview transcripts, focus group notes, academic papers

### Processing Best Practices
1. **Content Preparation**: Remove irrelevant headers/footers before processing
2. **Format Selection**: Use VTT/SRT formats when available for optimal results
3. **Speaker Context**: Include speaker labels for meeting/interview content
4. **Length Management**: Break 3+ hour content into logical segments
5. **Quality Check**: Review format detection confidence before processing

### Branch Selection Guide
#### Use Main Branch (Universal Platform) When:
- ✅ Processing any non-YouTube content
- ✅ Deploying to cloud platforms (Railway, Heroku, AWS)
- ✅ Working with transcript files or pasted content
- ✅ Need maximum compatibility and reliability

#### Use youtube-local Branch When:
- ✅ Processing YouTube videos directly via URL
- ✅ Working in local development environment
- ✅ Need OAuth2 YouTube Data API integration
- ⚠️ **Local development only** - will not work on cloud platforms

## UI Stability Updates
**Animation Optimization**: Removed aggressive background animations to prevent UI flickering:
- Disabled coralBreathing, bioFlow, currentFlow animations
- Removed textGlow and subtleGlow from headers
- Optimized WebSocket reconnection to prevent connection churn
- Maintained core processing animations for progress tracking
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Fabric Processor is a Node.js web application that processes YouTube videos through 13 fabric patterns to extract insights, summaries, and knowledge. It achieves 70-second processing times through a revolutionary "transcript-first" architecture.

**STRATEGIC EVOLUTION**: Project is evolving to Universal Content Intelligence Platform to solve cloud deployment constraints while expanding market opportunity. See `STRATEGIC-ARCHITECTURE-DECISION.md` for complete analysis and implementation plan.

## Development Commands

### Start Application
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
- **Fabric CLI**: `go install github.com/danielmiessler/fabric/cmd/fabric@latest`
- **yt-dlp**: `pip install yt-dlp` (primary transcript downloader)  
- **youtube-dl**: Fallback transcript downloader
- **YouTube Data API v3**: Optional API key for enhanced transcript downloading

## Architecture Overview

### Core Processing Flow
1. **Metadata Extraction** (`youtube-metadata.js`) - Extract video info and create descriptive folders
2. **Transcript-First Processing** (`fabric-transcript-integration.js`) - Download transcript once, process all patterns
3. **Parallel Execution** - Process 3 patterns simultaneously for optimal performance
4. **Output Generation** - 13 markdown files plus enhanced index and ZIP download

### Key Files
- `server.js` - Main Express server with WebSocket support and management API
- `fabric-transcript-integration.js` - **Primary processing engine** (transcript-first approach)
- `transcript-downloader.js` - Robust YouTube transcript extraction with 4-tier fallback system
- `youtube-transcript-api.js` - YouTube Data API v3 integration for official transcript access
- `fabric-patterns.js` - Defines 13 fabric patterns in 4 phases
- `youtube-metadata.js` - Video metadata extraction and folder naming
- `public/` - Web interface with real-time progress tracking

### Legacy/Unused Files
- `fabric-integration.js` - Original sequential processing (backup only)

## Processing Architecture

### Transcript-First Approach (PRIMARY)
The application uses a revolutionary approach with 4-tier fallback system:
1. **YouTube Data API v3** - Official Google API (requires YOUTUBE_API_KEY)
2. **yt-dlp with bot evasion** - Enhanced headers and YouTube-specific options
3. **youtube-dl fallback** - Legacy tool support
4. **Fabric CLI transcript** - Built-in YouTube support

Processing Flow:
1. Download transcript once (3-5 seconds)
2. Process all patterns using the cached transcript  
3. Execute in parallel batches of 3 patterns
4. Total time: ~70 seconds (vs. 5+ hours with URL-based processing)

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
- `POST /api/process` - Start video processing with YouTube URL
- `GET /api/process/:id` - Check processing status
- `GET /api/download/:id` - Download results ZIP

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

Each processed video creates a timestamped folder in `outputs/` containing:
- 13 pattern result files (01-13, .txt format)
- `index.md` with metadata and file descriptions
- `youtube_analysis.zip` for download

## Key Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `FABRIC_MODEL` - AI model for processing
- `MAX_CONCURRENT` - Parallel pattern limit
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

### OAuth2 Authentication Status
**Status**: ⚠️ **RAILWAY DEPLOYMENT LIMITATIONS DISCOVERED**
1. **OAuth2 YouTube Data API**: ⚠️ Authentication works, but API has permission restrictions for third-party caption downloads
2. **yt-dlp with enhanced options**: ❌ Blocked by YouTube bot detection on Railway servers
3. **youtube-dl**: ❌ Not installed on Railway, also would be blocked by bot detection
4. **Fabric CLI**: ❌ Blocked by YouTube bot detection on Railway servers

**Current Status**: 
- ✅ **Local Development**: All methods work properly with OAuth2 tokens
- ❌ **Railway Production**: All transcript download methods blocked by YouTube's aggressive bot detection
- ✅ **OAuth2 Token Persistence**: Implemented environment variable-based storage for Railway's ephemeral filesystem
- ⚠️ **Production Workaround Needed**: Consider transcript upload/paste functionality for Railway deployment

### Testing
- Use `/health` endpoint for basic functionality
- Test with short YouTube videos first
- Monitor WebSocket connection for real-time feedback

## Recent Session Work
**Latest Session Summary**: `session-summaries/SESSION-SUMMARY-2025-08-01-01.md` - **STRATEGIC ARCHITECTURE EVOLUTION SESSION**: Comprehensive analysis of deployment constraints and architectural evolution. Developed strategic pivot from YouTube-specific tool to Universal Content Intelligence Platform. Created detailed implementation plan for transcript-upload approach while preserving local YouTube functionality.

**Previous Session**: `session-summaries/SESSION-SUMMARY-2025-07-31-01.md` - **RAILWAY DEPLOYMENT DEBUGGING SESSION**: Fixed OAuth2 Railway deployment issues including domain mismatch and token persistence. Discovered fundamental YouTube bot detection limitations preventing server-based transcript downloads on Railway. OAuth2 authentication working but hitting API permission barriers.

## Video Length Recommendations
**IMPORTANT**: This application is optimized for shorter videos. Fabric patterns are designed for complete content analysis and lose significant effectiveness when content is chunked.

### Recommended Limits:
- **✅ Optimal (up to 2 hours)**: Full effectiveness with all 13 fabric patterns
- **⚠️ Acceptable (2-3 hours)**: Good results, may hit model limits  
- **❌ Not Recommended (3+ hours)**: Significantly reduced pattern effectiveness (~25% quality)

### Technical Reasoning:
- Fabric patterns require complete context for effective analysis
- Chunking breaks narrative flow and cross-references
- Token limits: ~50K per model, ~250 tokens/minute average speech
- Beyond 3 hours requires chunking which fundamentally compromises fabric pattern design

## UI Stability Updates
**Animation Optimization**: Removed aggressive background animations to prevent UI flickering:
- Disabled coralBreathing, bioFlow, currentFlow animations
- Removed textGlow and subtleGlow from headers
- Optimized WebSocket reconnection to prevent connection churn
- Maintained core processing animations for progress tracking
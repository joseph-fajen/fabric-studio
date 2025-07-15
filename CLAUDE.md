# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Fabric Processor is a Node.js web application that processes YouTube videos through 13 fabric patterns to extract insights, summaries, and knowledge. It achieves 70-second processing times through a revolutionary "transcript-first" architecture.

## Development Commands

### Start Application
```bash
npm start              # Production mode on port 3000
npm run dev           # Development mode with nodemon
```

### Dependencies Setup
```bash
npm install                      # Install Node.js dependencies
npm run install:fabric-mcp      # Install fabric-mcp-server (optional)
npm run install:yt-dlp          # Install yt-dlp for transcript download
npm run setup                   # Install all dependencies
```

### Required External Tools
- **Fabric CLI**: `go install github.com/danielmiessler/fabric/cmd/fabric@latest`
- **yt-dlp**: `pip install yt-dlp` (primary transcript downloader)
- **youtube-dl**: Fallback transcript downloader

## Architecture Overview

### Core Processing Flow
1. **Metadata Extraction** (`youtube-metadata.js`) - Extract video info and create descriptive folders
2. **Transcript-First Processing** (`fabric-transcript-integration.js`) - Download transcript once, process all patterns
3. **Parallel Execution** - Process 3 patterns simultaneously for optimal performance
4. **Output Generation** - 13 markdown files plus enhanced index and ZIP download

### Key Files
- `server.js` - Main Express server with WebSocket support and management API
- `fabric-transcript-integration.js` - **Primary processing engine** (transcript-first approach)
- `transcript-downloader.js` - Robust YouTube transcript extraction with fallbacks
- `fabric-patterns.js` - Defines 13 fabric patterns in 4 phases
- `youtube-metadata.js` - Video metadata extraction and folder naming
- `public/` - Web interface with real-time progress tracking

### Legacy/Unused Files
- `fabric-integration.js` - Original sequential processing (backup only)
- `fabric-mcp-integration.js` - MCP server approach (abandoned due to reliability issues)

## Processing Architecture

### Transcript-First Approach (PRIMARY)
The application uses a revolutionary approach:
1. Download transcript once (3-5 seconds)
2. Process all patterns using the cached transcript
3. Execute in parallel batches of 3 patterns
4. Total time: ~70 seconds (vs. 5+ hours with URL-based processing)

### Fabric Integration
- **Method**: Direct fabric CLI execution (NOT fabric-mcp-server)
- **Command Pattern**: `cat transcript.txt | fabric -p {pattern} --model claude-3-5-sonnet-20241022`
- **Model**: claude-3-5-sonnet-20241022 (optimized for speed and cost)
- **Patterns**: 13 predefined patterns in 4 phases

### Fallback Hierarchy
1. Transcript-first with fabric CLI (primary)
2. Legacy MCP approach (rarely used)
3. Original sequential processing (backup)
4. Simulation mode (no fabric installation)

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

### Fabric Setup Requirements
Users must configure fabric with:
```bash
fabric --setup
fabric -S  # Set API keys
```

## Development Guidelines

### Performance Optimization
- The transcript-first approach is critical for performance
- Always process patterns in parallel batches (currently 3)
- Use claude-3-5-sonnet-20241022 for optimal speed/cost balance
- Avoid fabric-mcp-server due to reliability issues

### Error Handling
- Multiple fallback processing methods ensure reliability
- WebSocket provides real-time progress and error feedback
- Graceful degradation through simulation mode

### Testing
- Use `/health` endpoint for basic functionality
- Test with short YouTube videos first
- Monitor WebSocket connection for real-time feedback
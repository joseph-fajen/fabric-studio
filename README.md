# YouTube Fabric Processor

A high-performance web application that processes YouTube videos through 13 fabric patterns to extract insights, summaries, and knowledge. Achieves 70-second processing times through "transcript-first" architecture.

## Features

- **Lightning Fast**: Process 13 fabric patterns in ~70 seconds
- **Transcript-First Architecture**: Download transcript once, process all patterns in parallel
- **Real-Time Progress**: WebSocket-powered progress tracking with live updates
- **Professional Output**: 13 markdown files plus enhanced metadata and ZIP download
- **Multiple Fallbacks**: Graceful degradation from optimized to simulation modes
- **Management Interface**: Built-in server controls, history, and cleanup tools

## Prerequisites

- **Node.js** 14+ 
- **Go** (for Fabric CLI installation)
- **Python** (for yt-dlp transcript downloader)
- **Anthropic API Key** (recommended) or OpenAI API Key

## Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/joseph-fajen/youtube-fabric-processor.git
cd youtube-fabric-processor
npm install
```

### 2. Install External Dependencies
```bash
# Install all external tools at once
npm run setup

# Or install manually:
go install github.com/danielmiessler/fabric@latest  # Fabric CLI
pip install yt-dlp                                  # YouTube transcript downloader
```

### 3. Configure Fabric CLI
```bash
fabric --setup
# Follow prompts to:
# - Choose AI provider (Anthropic recommended)
# - Enter API key
# - Set default model (claude-3-5-sonnet-20241022 recommended)
```

### 4. Start the Application
```bash
npm start
# Open browser to: http://localhost:3000
```

## Usage

1. **Enter YouTube URL**: Paste any YouTube video URL in the input field
2. **Start Processing**: Click "Process Video" to begin analysis
3. **Monitor Progress**: Watch real-time progress as 13 patterns execute in parallel batches
4. **Download Results**: Get ZIP file with all 13 analysis files plus metadata

### Processing Modes (Automatic Selection)

1. **Transcript-First Mode** (~70 seconds) - Primary method using cached transcript
2. **Legacy CLI Mode** (~5-15 minutes) - Fallback when transcript download fails  
3. **Simulation Mode** (~30 seconds) - Demo mode when Fabric CLI unavailable

## Output Structure

The processing generates 13 text files with professional markdown formatting:

### Phase 1: Primary Extraction
- `01-youtube_summary.txt` - Comprehensive video summary
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

## Architecture

- **Frontend**: Professional HTML/CSS/JavaScript interface with real-time WebSocket updates
- **Backend**: Node.js/Express server with direct Fabric CLI integration
- **Processing**: Transcript-first parallel execution (3 patterns at a time)
- **Output**: Enhanced metadata, 13 markdown files, and ZIP download
- **Management**: Built-in server controls, process monitoring, and cleanup tools

## Performance

- **Time**: 70 seconds average
- **Method**: Transcript-first parallel processing
- **Success Rate**: 100% (13/13 patterns)

## Key Dependencies

- **Node.js** 14+ - Runtime environment
- **Fabric CLI** - AI pattern processing engine
- **yt-dlp** - Fast YouTube transcript extraction
- **Express.js** - Web server framework
- **WebSocket** - Real-time progress updates
- **Archiver** - ZIP file generation

## Troubleshooting

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
fabric -p extract_wisdom "test input"
```

### "YouTube transcript failed"
```bash
# Test yt-dlp
yt-dlp --version
# Install if missing
pip install yt-dlp
```

## License

MIT License - See LICENSE file for details
# Railway Deployment Guide
## Fabric Studio

This guide provides complete instructions for deploying Fabric Studio to Railway with zero YouTube dependencies.

## 🚀 Quick Deployment

### 1. Railway Project Setup
1. Connect your GitHub repository to Railway
2. Select the repository containing this project
3. Railway will automatically detect the Node.js application

### 2. Essential Environment Variables

**Required for core functionality:**
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3000  # Railway sets this automatically
```

**Optional for enhanced functionality:**
```bash
OPENAI_API_KEY=your_openai_api_key_here     # For OpenAI fallback models
FABRIC_MODEL=claude-3-5-sonnet-20241022     # Default model (optional)
```

**YouTube functionality (completely optional):**
```bash
# These are NOT required for core transcript processing
GOOGLE_CLIENT_ID=your_google_client_id      # Only if YouTube OAuth needed
GOOGLE_CLIENT_SECRET=your_google_secret     # Only if YouTube OAuth needed
YOUTUBE_API_KEY=your_youtube_api_key        # Only if YouTube API needed
```

### 3. Deploy
1. Set the required environment variables in Railway dashboard
2. Deploy the application
3. Railway will automatically build using the Dockerfile

## 📋 Deployment Readiness Checklist

### Pre-Deployment Requirements
- [ ] **Anthropic API Key**: Obtained from console.anthropic.com
- [ ] **Repository Access**: Railway connected to your GitHub repository
- [ ] **Environment Variables**: ANTHROPIC_API_KEY configured in Railway

### Core Functionality Verification
- [ ] **Health Check**: `GET /health` returns 200 status
- [ ] **Fabric CLI**: Installed and available in container
- [ ] **Pattern Processing**: All 13 fabric patterns accessible
- [ ] **Transcript Upload**: Web interface supports transcript paste/upload
- [ ] **ZIP Download**: Processed results downloadable as ZIP

### Optional Feature Verification
- [ ] **OpenAI Integration**: If OPENAI_API_KEY provided, fallback models work
- [ ] **YouTube Processing**: If YouTube credentials provided, URL processing works
- [ ] **Management API**: Administrative endpoints accessible

## 🏗️ Technical Architecture

### Container Structure
```
Fabric Studio
├── Node.js 18 Runtime
├── Fabric CLI (Go-based)
├── 13 Fabric Patterns
├── Web Interface
└── REST API + WebSocket
```

### Core Dependencies
- **Node.js**: 18+ with production dependencies
- **Fabric CLI**: Latest version from GitHub
- **Go Runtime**: Required for Fabric CLI
- **Build Tools**: For native module compilation

### Removed Dependencies
- **Python/pip**: No longer required (removed yt-dlp)
- **youtube-dl**: Not needed for core functionality
- **googleapis**: Optional dependency, gracefully handles absence

## 🔧 Configuration Details

### Minimal Environment Variables
The platform requires only **one** environment variable for core functionality:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here
```

### Fabric CLI Configuration
The platform automatically configures Fabric CLI with:
- Primary model: `claude-3-5-sonnet-20241022`
- Fallback hierarchy: Claude Sonnet → Claude Haiku
- 13 processing patterns in 4 phases
- Automatic pattern updates on container start

### Processing Capabilities
Without YouTube dependencies, the platform supports:
1. **Transcript Upload**: Direct text input via web interface
2. **Transcript Paste**: Copy/paste content processing
3. **File Upload**: Upload text files for processing
4. **Batch Processing**: Multiple transcripts simultaneously
5. **Real-time Progress**: WebSocket status updates

## 🚨 Troubleshooting

### Common Deployment Issues

**Build Failures:**
```bash
# Check if Go installation succeeded
RUN go version

# Verify Fabric CLI installation
RUN fabric --version || echo "Fabric installation failed"
```

**Runtime Errors:**
```bash
# Missing API key
Error: Anthropic API key not configured
Solution: Set ANTHROPIC_API_KEY in Railway environment variables

# Fabric CLI not found
Error: Fabric CLI not found in common locations
Solution: Container rebuild may be needed, check Go installation
```

**Health Check Failures:**
```bash
# Container not responding
curl https://your-app.railway.app/health
# Should return: {"status":"ok","fabricAvailable":true,"patterns":13}
```

### Performance Optimization

**Memory Usage:**
- Default: 512MB RAM sufficient for most content
- Large transcripts (>3 hours): Consider 1GB+ RAM
- Parallel processing: Scales with available CPU cores

**Processing Times:**
- Short content (<30 min): ~30-60 seconds
- Medium content (30-120 min): ~60-120 seconds  
- Large content (2-3 hours): ~120-300 seconds
- Beyond 3 hours: Chunking strategy automatically applied

## 📊 Monitoring & Management

### Health Monitoring
```bash
# Basic health check
GET /health

# Detailed server status
GET /api/management/status

# Processing history
GET /api/management/history
```

### Administrative Operations
```bash
# Clean old outputs (automatic after 24 hours)
POST /api/management/cleanup-old

# Graceful shutdown
POST /api/management/shutdown

# Server restart
POST /api/management/restart
```

### Performance Metrics
The platform includes built-in monitoring:
- Processing queue status
- Active WebSocket connections
- Pattern execution times
- Error rates and fallback usage
- Memory and CPU usage tracking

## 🔄 CI/CD Integration

### Automatic Deployment
Railway automatically deploys on:
- Pushes to main branch
- Environment variable changes
- Manual deployments via dashboard

### Build Process
1. **Container Build**: Multi-stage Docker build
2. **Dependency Installation**: Node.js and Go dependencies
3. **Fabric Setup**: CLI installation and configuration
4. **Health Check**: Automated verification
5. **Deployment**: Zero-downtime deployment

### Rollback Strategy
- Railway provides automatic rollback capabilities
- Previous deployments accessible via dashboard
- Environment variable rollback available
- Database-free architecture simplifies rollbacks

## 🎯 Success Metrics

### Deployment Success Indicators
- [ ] Health endpoint returns HTTP 200
- [ ] Fabric CLI detected and functional
- [ ] All 13 patterns available
- [ ] WebSocket connections establish successfully
- [ ] Transcript processing completes end-to-end
- [ ] ZIP download generates and transfers

### Performance Benchmarks
- **Cold Start**: <30 seconds from deployment
- **First Request**: <5 seconds response time
- **Pattern Processing**: <2 minutes for standard content
- **Memory Usage**: <512MB for typical workloads
- **CPU Usage**: <50% during active processing

## 📞 Support & Resources

### Documentation Links
- **Fabric Patterns**: https://github.com/danielmiessler/fabric
- **Anthropic API**: https://docs.anthropic.com/
- **Railway Deployment**: https://docs.railway.app/

### Common Commands
```bash
# Local testing without YouTube
ANTHROPIC_API_KEY=sk-ant-... npm start

# Docker build test
docker build -t ucip . && docker run -e ANTHROPIC_API_KEY=sk-ant-... -p 3000:3000 ucip

# Railway CLI deployment
railway up
```

This deployment guide ensures the Fabric Studio runs smoothly on Railway with zero YouTube dependencies while maintaining full transcript processing capabilities.
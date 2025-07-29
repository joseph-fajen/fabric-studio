# Railway Deployment Guide

This guide provides step-by-step instructions for deploying YouTube Fabric Processor to Railway for zero-setup user access.

## Quick Deploy to Railway

### Prerequisites
- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- API keys from Anthropic or OpenAI

### 1. Fork or Clone Repository
```bash
git clone https://github.com/joseph-fajen/youtube-fabric-processor.git
cd youtube-fabric-processor
```

### 2. Deploy to Railway

**Option A: Deploy from GitHub (Recommended)**
1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and sign in
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect the Dockerfile and deploy

**Option B: Deploy with Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy project
railway deploy
```

### 3. Configure Environment Variables

In Railway dashboard:
1. Go to your project → Variables tab
2. Add required environment variables:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
FABRIC_MODEL=claude-3-5-sonnet-20241022
PORT=3000
NODE_ENV=production
MAX_CONCURRENT=3
```

**Optional variables:**
```
OPENAI_API_KEY=sk-xxx...
VIDEO_LENGTH_WARNING_HOURS=2
MAX_VIDEO_LENGTH_HOURS=3
CLEANUP_INTERVAL_DAYS=7
```

### 4. Configure Custom Domain (Optional)

1. In Railway dashboard → Settings → Domains
2. Generate Railway domain or add custom domain
3. Your app will be available at: `https://your-app-name.railway.app`

## API Key Setup

### Anthropic API Key (Recommended)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create account and add billing
3. Generate API key in API Keys section
4. Add as `ANTHROPIC_API_KEY` environment variable

### OpenAI API Key (Alternative)
1. Go to [platform.openai.com](https://platform.openai.com/)
2. Create account and add billing
3. Generate API key in API Keys section
4. Add as `OPENAI_API_KEY` environment variable

## Deployment Architecture

The Railway deployment includes:
- **Node.js 18** runtime environment
- **Go** for Fabric CLI installation
- **Python 3** with yt-dlp for transcript download
- **Fabric CLI** automatically installed during build
- **Health checks** for monitoring
- **Persistent file system** for outputs (Railway provides ephemeral storage)

## Monitoring and Logs

### View Logs
```bash
# Using Railway CLI
railway logs

# Or in Railway dashboard → Deployments → View Logs
```

### Health Check
Your deployed app includes a health endpoint:
```
GET https://your-app.railway.app/health
```

## Troubleshooting

### Common Issues

**Build Fails - Go Installation**
- Ensure Dockerfile includes golang-go package
- Verify GOPATH and PATH environment setup

**Fabric CLI Not Found**
- Check build logs for Go installation errors
- Verify fabric binary is in PATH

**API Key Issues**
- Ensure environment variables are set in Railway dashboard
- Test API keys locally first
- Check API key format and permissions

**Memory/Performance Issues**
- Monitor Railway resource usage
- Consider upgrading Railway plan for higher limits
- Optimize MAX_CONCURRENT setting

### Support
- Railway docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Project issues: Create GitHub issue

## Cost Estimation

**Railway Pricing:**
- **Hobby Plan**: $5/month - suitable for personal use
- **Pro Plan**: $20/month - higher limits and priority support
- **Usage-based**: ~$0.000463/hour for compute

**API Costs (per video):**
- **Anthropic Claude**: ~$0.10-0.50 per video (depending on length)
- **OpenAI GPT-4**: ~$0.20-1.00 per video (depending on length)

**Total Monthly Cost**: ~$15-25/month for moderate usage (50-100 videos)

## Next Steps

1. Deploy to Railway using this guide
2. Test with a short YouTube video
3. Share the Railway URL with users
4. Monitor usage and costs
5. Consider custom domain for branding

Your app will be accessible at a public URL with zero setup required for end users!
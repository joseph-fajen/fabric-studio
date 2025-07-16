// YouTube Fabric Processor Server
// Express server with WebSocket support for real-time processing

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

// Import our modules
const FabricIntegration = require('./fabric-integration');
const FabricTranscriptIntegration = require('./fabric-transcript-integration');
const { FABRIC_PATTERNS, PHASE_DESCRIPTIONS } = require('./fabric-patterns');
const YouTubeMetadata = require('./youtube-metadata');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Global state
const activeProcesses = new Map();
const fabricIntegration = new FabricIntegration();
const fabricTranscriptIntegration = new FabricTranscriptIntegration();
const youtubeMetadata = new YouTubeMetadata();

// Initialize fabric integration
let fabricAvailable = false;
fabricIntegration.initialize()
  .then(() => {
    fabricAvailable = true;
    console.log('Fabric integration ready');
  })
  .catch(error => {
    console.warn('Fabric not available, using simulation mode:', error.message);
    fabricAvailable = false;
  });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    fabricAvailable,
    patterns: FABRIC_PATTERNS.length,
    server: 'YouTube Fabric Processor v1.0.0'
  });
});

// Get available patterns
app.get('/api/patterns', (req, res) => {
  res.json({
    patterns: FABRIC_PATTERNS,
    phases: PHASE_DESCRIPTIONS,
    total: FABRIC_PATTERNS.length
  });
});

// Process YouTube video
app.post('/api/process', async (req, res) => {
  const { youtubeUrl } = req.body;
  
  if (!youtubeUrl) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  // Validate YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(youtubeUrl)) {
    return res.status(400).json({ error: 'Invalid YouTube URL format' });
  }

  const processId = uuidv4();
  
  try {
    // Extract YouTube metadata for descriptive naming
    console.log('Extracting YouTube metadata...');
    const metadata = await youtubeMetadata.extractMetadata(youtubeUrl);
    const descriptiveFolderName = youtubeMetadata.generateFolderName(metadata, processId);
    const outputDir = path.join(__dirname, 'outputs', descriptiveFolderName);
    
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    // Store process info with metadata
    activeProcesses.set(processId, {
      id: processId,
      url: youtubeUrl,
      status: 'starting',
      startTime: new Date(),
      outputDir,
      folderName: descriptiveFolderName,
      metadata
    });

    // Send initial response
    res.json({
      processId,
      status: 'started',
      message: 'Processing started',
      fabricAvailable,
      patterns: FABRIC_PATTERNS.length
    });

    // Start processing in background
    processVideo(processId, youtubeUrl, outputDir);

  } catch (error) {
    console.error('Error starting process:', error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
});

// Get process status
app.get('/api/process/:id', (req, res) => {
  const processId = req.params.id;
  const process = activeProcesses.get(processId);
  
  if (!process) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  res.json(process);
});

// Management API endpoints
app.get('/api/management/status', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    server: {
      uptime: uptime,
      uptimeFormatted: formatUptime(uptime),
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      fabricAvailable,
      patternsLoaded: FABRIC_PATTERNS.length
    },
    processes: {
      active: activeProcesses.size,
      list: Array.from(activeProcesses.values()).map(p => ({
        id: p.id,
        status: p.status,
        url: p.url,
        startTime: p.startTime,
        currentStep: p.currentStep,
        totalSteps: p.totalSteps,
        folderName: p.folderName
      }))
    }
  });
});

app.get('/api/management/history', async (req, res) => {
  try {
    const outputsDir = path.join(__dirname, 'outputs');
    const entries = await fs.readdir(outputsDir, { withFileTypes: true });
    
    const history = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(outputsDir, entry.name);
        const indexPath = path.join(folderPath, 'index.md');
        
        let metadata = null;
        try {
          const stats = await fs.stat(folderPath);
          const hasIndex = await fs.pathExists(indexPath);
          
          if (hasIndex) {
            const indexContent = await fs.readFile(indexPath, 'utf8');
            metadata = parseIndexMetadata(indexContent);
          }
          
          // Count files
          const files = await fs.readdir(folderPath);
          const txtFiles = files.filter(f => f.endsWith('.txt')).length;
          const hasZip = files.some(f => f.endsWith('.zip'));
          
          history.push({
            folderName: entry.name,
            created: stats.birthtime,
            modified: stats.mtime,
            size: await getFolderSize(folderPath),
            filesCount: txtFiles,
            hasZip,
            metadata
          });
        } catch (error) {
          console.error(`Error reading folder ${entry.name}:`, error);
        }
      }
    }
    
    // Sort by creation time (newest first)
    history.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json(history);
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

app.delete('/api/management/cleanup/:folderName', async (req, res) => {
  const folderName = req.params.folderName;
  
  if (!folderName || folderName.includes('..')) {
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  
  try {
    const folderPath = path.join(__dirname, 'outputs', folderName);
    
    // Verify folder exists and is in outputs directory
    const exists = await fs.pathExists(folderPath);
    if (!exists) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Check if it's actually within outputs directory (security check)
    const resolvedPath = path.resolve(folderPath);
    const outputsPath = path.resolve(__dirname, 'outputs');
    if (!resolvedPath.startsWith(outputsPath)) {
      return res.status(403).json({ error: 'Invalid folder path' });
    }
    
    // Remove the folder
    await fs.remove(folderPath);
    
    res.json({ message: 'Folder removed successfully', folderName });
  } catch (error) {
    console.error('Error removing folder:', error);
    res.status(500).json({ error: 'Failed to remove folder' });
  }
});

app.post('/api/management/cleanup-old', async (req, res) => {
  const { daysOld = 30 } = req.body;
  
  try {
    const outputsDir = path.join(__dirname, 'outputs');
    const entries = await fs.readdir(outputsDir, { withFileTypes: true });
    
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    const removed = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(outputsDir, entry.name);
        const stats = await fs.stat(folderPath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.remove(folderPath);
          removed.push(entry.name);
        }
      }
    }
    
    res.json({ 
      message: `Removed ${removed.length} folders older than ${daysOld} days`,
      removed: removed
    });
  } catch (error) {
    console.error('Error cleaning old folders:', error);
    res.status(500).json({ error: 'Failed to clean old folders' });
  }
});

// Server control endpoints
app.post('/api/management/shutdown', (req, res) => {
  console.log('Shutdown requested via web interface');
  res.json({ message: 'Server shutting down gracefully...' });
  
  // Give time for response to be sent
  setTimeout(() => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  }, 1000);
});

app.post('/api/management/restart', (req, res) => {
  console.log('Restart requested via web interface');
  res.json({ message: 'Server restarting...' });
  
  // Give time for response to be sent
  setTimeout(() => {
    console.log('Restarting server...');
    server.close(() => {
      console.log('Server closed for restart');
      // Check if we have a process manager (like PM2 or similar)
      if (process.env.PM_ID || process.env.PM2_HOME) {
        // Running under PM2 or similar, exit with code 1 to trigger restart
        process.exit(1);
      } else {
        // Manual restart attempt - spawn a new process
        const { spawn } = require('child_process');
        const child = spawn(process.argv[0], process.argv.slice(1), {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        process.exit(0);
      }
    });
  }, 1000);
});

app.post('/api/management/stop-processing', (req, res) => {
  console.log('Stop processing requested via web interface');
  
  try {
    // Clear all active processes
    const processCount = activeProcesses.size;
    activeProcesses.clear();
    
    // Broadcast stop signal to all WebSocket clients
    broadcast({
      type: 'processing_stopped',
      message: 'All processing stopped by user request'
    });
    
    res.json({ 
      message: `Stopped ${processCount} active processing jobs`,
      stopped: processCount
    });
  } catch (error) {
    console.error('Error stopping processing:', error);
    res.status(500).json({ error: 'Failed to stop processing' });
  }
});

app.post('/api/management/clear-all-data', async (req, res) => {
  console.log('Clear all data requested via web interface');
  
  try {
    // Clear all active processes
    const processCount = activeProcesses.size;
    activeProcesses.clear();
    
    // Clear all output directories
    const outputsDir = path.join(__dirname, 'outputs');
    if (await fs.pathExists(outputsDir)) {
      await fs.emptyDir(outputsDir);
    }
    
    // Broadcast clear signal to all WebSocket clients
    broadcast({
      type: 'data_cleared',
      message: 'All data cleared by user request'
    });
    
    res.json({ 
      message: `Cleared all data: ${processCount} active processes stopped, all output files removed`,
      processesCleared: processCount
    });
  } catch (error) {
    console.error('Error clearing all data:', error);
    res.status(500).json({ error: 'Failed to clear all data' });
  }
});

// Download results
app.get('/api/download/:id', async (req, res) => {
  const processId = req.params.id;
  const process = activeProcesses.get(processId);
  
  if (!process) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  if (process.status !== 'completed') {
    return res.status(400).json({ error: 'Process not completed yet' });
  }

  try {
    const zipPath = path.join(process.outputDir, 'youtube_analysis.zip');
    
    // Create ZIP file if it doesn't exist
    if (!await fs.pathExists(zipPath)) {
      await createZipFile(process.outputDir, zipPath, process.results);
    }
    
    // Generate descriptive download filename
    const downloadName = process.metadata 
      ? youtubeMetadata.generateDownloadName(process.metadata, processId)
      : `youtube_analysis_${processId.substring(0, 8)}.zip`;
    
    // Send file
    res.download(zipPath, downloadName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
      }
    });

  } catch (error) {
    console.error('Error preparing download:', error);
    res.status(500).json({ error: 'Failed to prepare download' });
  }
});

// Main processing function
async function processVideo(processId, youtubeUrl, outputDir) {
  const process = activeProcesses.get(processId);
  
  try {
    process.status = 'processing';
    process.currentStep = 0;
    process.totalSteps = FABRIC_PATTERNS.length;
    
    // Broadcast initial status
    broadcast({
      type: 'process_started',
      processId,
      url: youtubeUrl,
      totalSteps: FABRIC_PATTERNS.length
    });

    // Progress callback
    const progressCallback = (progress) => {
      process.currentStep = progress.current;
      process.currentPattern = progress.pattern;
      process.currentPhase = progress.phase;
      process.currentDescription = progress.description;
      
      // Broadcast progress
      broadcast({
        type: 'progress',
        processId,
        ...progress
      });
    };

    // Process video through fabric patterns - TRANSCRIPT-FIRST OPTIMIZED WORKFLOW
    let processingResult;
    
    try {
      // Use transcript-first approach for maximum efficiency
      console.log('🚀 Using transcript-first optimized processing...');
      processingResult = await fabricTranscriptIntegration.processYouTubeVideo(
        youtubeUrl, 
        FABRIC_PATTERNS, 
        progressCallback
      );
    } catch (error) {
      console.log('Transcript-first processing failed, falling back to original method...');
      
      // Fallback to original method
      if (fabricAvailable) {
        processingResult = await fabricIntegration.processYouTubeVideo(
          youtubeUrl, 
          FABRIC_PATTERNS, 
          progressCallback
        );
      } else {
        processingResult = await fabricIntegration.processYouTubeVideoSimulation(
          youtubeUrl, 
          FABRIC_PATTERNS, 
          progressCallback
        );
      }
    }

    // Save results to files with metadata
    await saveResults(outputDir, processingResult.results, process.metadata, youtubeUrl);
    
    // Update process status
    process.status = 'completed';
    process.endTime = new Date();
    process.results = processingResult.results;
    process.completed = processingResult.completed;
    process.successful = processingResult.successful || processingResult.completed;
    process.simulated = processingResult.simulated || false;
    process.method = processingResult.method || 'unknown';
    process.processingTime = processingResult.processingTime;
    
    // Broadcast completion
    broadcast({
      type: 'process_completed',
      processId,
      completed: processingResult.completed,
      total: processingResult.total,
      successful: processingResult.successful || processingResult.completed,
      simulated: process.simulated,
      method: process.method,
      processingTime: process.processingTime
    });

    console.log(`Process ${processId} completed successfully`);

  } catch (error) {
    console.error(`Process ${processId} failed:`, error);
    
    process.status = 'failed';
    process.error = error.message;
    process.endTime = new Date();
    
    // Broadcast error
    broadcast({
      type: 'process_failed',
      processId,
      error: error.message
    });
  }
}

// Save results to individual text files
async function saveResults(outputDir, results, metadata, youtubeUrl) {
  // Create enhanced index file with metadata
  let indexContent;
  if (metadata) {
    indexContent = youtubeMetadata.createIndexContent(metadata, youtubeUrl);
  } else {
    // Fallback to basic index
    indexContent = `# YouTube Video Analysis Results\n\n`;
    indexContent += `**YouTube URL**: ${youtubeUrl}\n`;
    indexContent += `**Generated**: ${new Date().toISOString()}\n\n`;
    indexContent += `## Files Generated\n\n`;
  }
  
  const phases = {};
  
  // Group by phase
  for (const [filename, result] of Object.entries(results)) {
    const phase = result.phase;
    if (!phases[phase]) {
      phases[phase] = [];
    }
    phases[phase].push({ filename, result });
  }
  
  // Only add phase details if we're using basic index (metadata version already has this)
  if (!metadata) {
    for (const [phase, files] of Object.entries(phases)) {
      indexContent += `### Phase ${phase}: ${PHASE_DESCRIPTIONS[phase]}\n\n`;
      
      for (const { filename, result } of files) {
        indexContent += `- **${filename}** - ${result.description}\n`;
      }
      
      indexContent += `\n`;
    }
  }
  
  // Save individual files
  for (const [filename, result] of Object.entries(results)) {
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, result.content, 'utf8');
  }
  
  // Save index file
  await fs.writeFile(path.join(outputDir, 'index.md'), indexContent, 'utf8');
}

// Create ZIP file for download
async function createZipFile(outputDir, zipPath, results) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log(`ZIP file created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all files in the output directory
    archive.directory(outputDir, false, (entry) => {
      // Exclude the zip file itself
      if (entry.name === 'youtube_analysis.zip') {
        return false;
      }
      return entry;
    });

    archive.finalize();
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YouTube Fabric Processor running on port ${PORT}`);
  console.log(`Open your browser to: http://localhost:${PORT}`);
  console.log(`Fabric available: ${fabricAvailable}`);
  console.log(`Patterns loaded: ${FABRIC_PATTERNS.length}`);
});

// Helper functions for management API
function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function parseIndexMetadata(content) {
  const lines = content.split('\n');
  const metadata = {};
  
  for (const line of lines) {
    if (line.startsWith('**Video Title**:')) {
      metadata.title = line.replace('**Video Title**:', '').trim();
    } else if (line.startsWith('**Channel**:')) {
      metadata.channel = line.replace('**Channel**:', '').trim();
    } else if (line.startsWith('**YouTube URL**:')) {
      metadata.url = line.replace('**YouTube URL**:', '').trim();
    } else if (line.startsWith('**Processing Date**:')) {
      metadata.processedDate = line.replace('**Processing Date**:', '').trim();
    }
  }
  
  return metadata;
}

async function getFolderSize(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
    
    // Convert to human readable format
    if (totalSize < 1024) {
      return totalSize + ' B';
    } else if (totalSize < 1024 * 1024) {
      return Math.round(totalSize / 1024) + ' KB';
    } else {
      return Math.round(totalSize / (1024 * 1024)) + ' MB';
    }
  } catch (error) {
    return 'Unknown';
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
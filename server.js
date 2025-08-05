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

// Import server manager
const ServerManager = require('./server-manager');

// Import our modules
const FabricTranscriptIntegration = require('./fabric-transcript-integration');
const { FABRIC_PATTERNS, PHASE_DESCRIPTIONS } = require('./fabric-patterns');
const YouTubeMetadata = require('./youtube-metadata');
const oauth2Routes = require('./oauth2-routes');
// const DocumentLaboratory = require('./document-laboratory'); // Commented out for main branch deployment

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// OAuth2 authentication routes
app.use('/auth', oauth2Routes);

// Global state
const activeProcesses = new Map();
const fabricTranscriptIntegration = new FabricTranscriptIntegration();
const youtubeMetadata = new YouTubeMetadata();
// const documentLaboratory = new DocumentLaboratory(fabricTranscriptIntegration); // Commented out for main branch deployment

// Test fabric availability
let fabricAvailable = false;
fabricTranscriptIntegration.testFabricAvailability()
  .then(() => {
    fabricAvailable = true;
    console.log('Fabric CLI available and ready');
  })
  .catch(error => {
    console.warn('Fabric CLI not available, using simulation mode. Please install Fabric CLI: go install github.com/danielmiessler/fabric@latest');
    fabricAvailable = false;
  });

// Initialize fabric transcript integration with API keys
fabricTranscriptIntegration.loadApiKeysFromConfig()
  .then(() => {
    console.log('FabricTranscriptIntegration initialized with API keys');
  })
  .catch(error => {
    console.warn('Failed to load API keys for FabricTranscriptIntegration:', error.message);
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
    server: 'Universal Content Intelligence Platform v1.0.0',
    supportedContentTypes: ['youtube', 'transcript']
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

// Process content (YouTube video or direct transcript)
app.post('/api/process', async (req, res) => {
  const { youtubeUrl, transcript, filename, contentType } = req.body;
  
  // Validate input based on content type
  if (contentType === 'youtube') {
    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required for YouTube content' });
    }
    
    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }
  } else if (contentType === 'transcript') {
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript content is required for transcript processing' });
    }
    
    // Validate transcript content
    const validationResult = validateTranscriptContent(transcript);
    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.error });
    }
  } else {
    return res.status(400).json({ error: 'Content type must be either "youtube" or "transcript"' });
  }

  const processId = uuidv4();
  
  try {
    let metadata, descriptiveFolderName, outputDir;
    
    if (contentType === 'youtube') {
      // Extract YouTube metadata for descriptive naming
      console.log('Extracting YouTube metadata...');
      metadata = await youtubeMetadata.extractMetadata(youtubeUrl);
      descriptiveFolderName = youtubeMetadata.generateFolderName(metadata, processId);
    } else {
      // Create metadata for transcript content
      metadata = createTranscriptMetadata(transcript, filename);
      descriptiveFolderName = generateContentFolderName(metadata, processId);
    }
    
    outputDir = path.join(__dirname, 'outputs', descriptiveFolderName);
    
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    // Store process info with metadata
    activeProcesses.set(processId, {
      id: processId,
      url: youtubeUrl || null,
      transcript: contentType === 'transcript' ? transcript : null,
      filename: filename || null,
      contentType,
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
      message: 'Content processing started',
      fabricAvailable,
      patterns: FABRIC_PATTERNS.length,
      contentType
    });

    // Start processing in background
    if (contentType === 'youtube') {
      processVideo(processId, youtubeUrl, outputDir);
    } else {
      processTranscriptContent(processId, transcript, filename, outputDir);
    }

  } catch (error) {
    console.error('Error starting content processing:', error);
    res.status(500).json({ error: 'Failed to start content processing' });
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
        contentType: p.contentType,
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
      message: 'All content processing stopped by user request'
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
      message: 'All content analysis data cleared by user request'
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

// API Key Management endpoints
app.get('/api/management/config/api-keys', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config', 'api-keys.json');
    let config = {};
    
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Return masked keys for security
    const maskedKeys = {
      anthropic: config.anthropic ? true : false,
      openai: config.openai ? true : false,
      google: config.google ? true : false
    };
    
    res.json({
      success: true,
      keys: maskedKeys,
      fallbackModels: config.fallbackModels || [
        'claude-3-5-sonnet-20241022',
        'gpt-4o',
        'OpenAI o3',
        'gpt-4o-mini',
        'claude-3-5-haiku-20241022',
        'gpt-4-turbo'
      ]
    });
  } catch (error) {
    console.error('Error loading API keys:', error);
    res.status(500).json({ success: false, message: 'Failed to load API keys' });
  }
});

app.post('/api/management/config/api-keys', async (req, res) => {
  try {
    const { anthropic, openai, google } = req.body;
    const configDir = path.join(__dirname, 'config');
    const configPath = path.join(configDir, 'api-keys.json');
    
    // Ensure config directory exists
    await fs.ensureDir(configDir);
    
    // Load existing config
    let config = {};
    if (await fs.pathExists(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    
    // Update only non-empty keys
    if (anthropic && anthropic.trim()) config.anthropic = anthropic.trim();
    if (openai && openai.trim()) config.openai = openai.trim();
    if (google && google.trim()) config.google = google.trim();
    
    // Save config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Update fabric integration with new keys
    fabricTranscriptIntegration.updateApiKeys(config);
    
    console.log('API keys updated successfully');
    res.json({ success: true, message: 'API keys saved successfully' });
  } catch (error) {
    console.error('Error saving API keys:', error);
    res.status(500).json({ success: false, message: 'Failed to save API keys' });
  }
});

app.delete('/api/management/config/api-keys', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config', 'api-keys.json');
    
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
    
    // Clear keys from fabric integration
    fabricTranscriptIntegration.updateApiKeys({});
    
    console.log('API keys cleared successfully');
    res.json({ success: true, message: 'API keys cleared successfully' });
  } catch (error) {
    console.error('Error clearing API keys:', error);
    res.status(500).json({ success: false, message: 'Failed to clear API keys' });
  }
});

app.post('/api/management/config/fallback-models', async (req, res) => {
  try {
    const { fallbackModels } = req.body;
    const configDir = path.join(__dirname, 'config');
    const configPath = path.join(configDir, 'api-keys.json');
    
    // Ensure config directory exists
    await fs.ensureDir(configDir);
    
    // Load existing config
    let config = {};
    if (await fs.pathExists(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    
    // Update fallback models
    config.fallbackModels = fallbackModels;
    
    // Save config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Update fabric integration with new fallback models
    fabricTranscriptIntegration.updateFallbackModels(fallbackModels);
    
    console.log('Fallback models updated successfully');
    res.json({ success: true, message: 'Fallback models saved successfully' });
  } catch (error) {
    console.error('Error saving fallback models:', error);
    res.status(500).json({ success: false, message: 'Failed to save fallback models' });
  }
});

app.post('/api/management/config/test-apis', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config', 'api-keys.json');
    let config = {};
    
    if (await fs.pathExists(configPath)) {
      config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    
    // Test API connections
    const results = await fabricTranscriptIntegration.testApiConnections(config);
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Error testing API connections:', error);
    res.status(500).json({ success: false, message: 'Failed to test API connections' });
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
    const zipPath = path.join(process.outputDir, 'content_analysis.zip');
    
    // Create ZIP file if it doesn't exist
    if (!await fs.pathExists(zipPath)) {
      await createZipFile(process.outputDir, zipPath, process.results);
    }
    
    // Generate descriptive download filename
    let downloadName;
    if (process.contentType === 'youtube' && process.metadata) {
      downloadName = youtubeMetadata.generateDownloadName(process.metadata, processId);
    } else if (process.contentType === 'transcript') {
      const baseName = process.filename ? process.filename.replace(/\.[^/.]+$/, '') : 'content';
      downloadName = `${baseName}_analysis_${processId.substring(0, 8)}.zip`;
    } else {
      downloadName = `content_analysis_${processId.substring(0, 8)}.zip`;
    }
    
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

// Document Laboratory endpoints

// Analyze content for document opportunities  
app.post('/api/document-opportunities/:processId', async (req, res) => {
  try {
    const processId = req.params.processId;
    const process = activeProcesses.get(processId);
    
    if (!process) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    if (!process.outputDir) {
      return res.status(400).json({ error: 'Process output directory not available' });
    }

    console.log(`Analyzing document opportunities for process: ${processId}`);
    // const analysis = await documentLaboratory.analyzeContentOpportunities(process.outputDir); // Commented out for main branch deployment
    const analysis = { success: false, opportunities: [] }; // Temporary placeholder
    
    if (analysis.success) {
      // Store analysis in process for later use
      process.documentAnalysis = analysis.analysis;
      process.documentOpportunities = analysis.opportunities;
      
      broadcast({
        type: 'document_opportunities',
        processId,
        opportunities: analysis.opportunities,
        analysis: analysis.analysis
      });
      
      res.json({
        success: true,
        processId,
        analysis: analysis.analysis,
        opportunities: analysis.opportunities
      });
    } else {
      res.status(400).json({
        success: false,
        error: analysis.error
      });
    }
    
  } catch (error) {
    console.error('Error analyzing document opportunities:', error);
    res.status(500).json({ error: 'Failed to analyze document opportunities' });
  }
});

// Generate selected documents
app.post('/api/generate-documents/:processId', async (req, res) => {
  try {
    const processId = req.params.processId;
    const { selectedDocuments } = req.body;
    
    if (!selectedDocuments || !Array.isArray(selectedDocuments)) {
      return res.status(400).json({ error: 'Selected documents array is required' });
    }
    
    const process = activeProcesses.get(processId);
    if (!process) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    if (!process.outputDir) {
      return res.status(400).json({ error: 'Process output directory not available' });
    }

    console.log(`Generating ${selectedDocuments.length} documents for process: ${processId}`);
    
    // Update process status
    process.status = 'generating_documents';
    process.documentGenerationStartTime = new Date();
    
    broadcast({
      type: 'document_generation_started',
      processId,
      documentCount: selectedDocuments.length
    });
    
    // Progress callback for document generation
    const progressCallback = (progress) => {
      broadcast({
        type: 'document_progress',
        processId,
        ...progress
      });
    };
    
    // Generate documents
    // const results = await documentLaboratory.generateDocuments( // Commented out for main branch deployment
    //   process.outputDir, 
    //   selectedDocuments, 
    //   progressCallback
    // );
    const results = { success: false, error: 'Document generation not available in this deployment' }; // Temporary placeholder
    
    if (results.success) {
      // Update process with document results
      process.documentsGenerated = results.documentsGenerated;
      process.documentGenerationErrors = results.errors;
      process.status = 'completed_with_documents';
      process.documentGenerationEndTime = new Date();
      
      // Regenerate ZIP file to include documents
      await updateZipWithDocuments(process.outputDir);
      
      broadcast({
        type: 'document_generation_complete',
        processId,
        documentsGenerated: results.documentsGenerated,
        errors: results.errors
      });
      
      res.json({
        success: true,
        processId,
        documentsGenerated: results.documentsGenerated,
        errors: results.errors
      });
    } else {
      process.status = 'document_generation_failed';
      process.documentGenerationError = results.error;
      
      broadcast({
        type: 'document_generation_failed',
        processId,
        error: results.error
      });
      
      res.status(500).json({
        success: false,
        error: results.error
      });
    }
    
  } catch (error) {
    console.error('Error generating documents:', error);
    
    const process = activeProcesses.get(req.params.processId);
    if (process) {
      process.status = 'document_generation_failed';
      process.documentGenerationError = error.message;
    }
    
    broadcast({
      type: 'document_generation_failed',
      processId: req.params.processId,
      error: error.message
    });
    
    res.status(500).json({ error: 'Failed to generate documents' });
  }
});

// Get document generation status
app.get('/api/document-status/:processId', (req, res) => {
  const processId = req.params.processId;
  const process = activeProcesses.get(processId);
  
  if (!process) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  res.json({
    processId,
    status: process.status,
    documentAnalysis: process.documentAnalysis || null,
    documentOpportunities: process.documentOpportunities || [],
    documentsGenerated: process.documentsGenerated || [],
    documentGenerationErrors: process.documentGenerationErrors || [],
    documentGenerationStartTime: process.documentGenerationStartTime || null,
    documentGenerationEndTime: process.documentGenerationEndTime || null
  });
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
      url: youtubeUrl || null,
      contentType: process.contentType,
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

    // Document laboratory analysis disabled - ready for production use

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
  // Create index file with metadata
  let indexContent;
  
  if (metadata && metadata.contentType === 'transcript') {
    // Create index for transcript content
    indexContent = createTranscriptIndexContent(metadata);
  } else if (metadata && youtubeUrl) {
    // Use YouTube metadata
    indexContent = youtubeMetadata.createIndexContent(metadata, youtubeUrl);
  } else {
    // Fallback to basic index
    const contentType = youtubeUrl ? 'YouTube Video' : 'Content';
    indexContent = `# ${contentType} Analysis Results\n\n`;
    if (youtubeUrl) {
      indexContent += `**YouTube URL**: ${youtubeUrl}\n`;
    }
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
      if (entry.name === 'content_analysis.zip' || entry.name === 'youtube_analysis.zip') {
        return false;
      }
      return entry;
    });

    archive.finalize();
  });
}

// Enhanced server startup with ServerManager
async function startServer() {
  const serverManager = new ServerManager();
  
  try {
    // Validate environment
    await serverManager.validateEnvironment();
    
    // Check for existing server and kill if necessary
    await serverManager.killExistingServer();
    
    // Find available port
    const PORT = await serverManager.findAvailablePort();
    
    // Start server
    server.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 Universal Content Intelligence Platform running on port ${PORT}`);
      console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
      console.log(`🔧 Fabric available: ${fabricAvailable}`);
      console.log(`📝 Patterns loaded: ${FABRIC_PATTERNS.length}`);
      console.log(`🎯 Content types supported: YouTube URLs, Transcript Upload/Paste`);
      
      // Save PID for process management
      await serverManager.savePid();
      console.log(`📋 Server PID: ${process.pid}`);
    });
    
    // Setup graceful shutdown
    serverManager.setupShutdownHandlers(server);
    
    // Handle server startup errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server startup error:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// Content validation and processing helper functions

// Validate transcript content for safety and format
function validateTranscriptContent(transcript) {
  // Basic safety checks
  if (!transcript || typeof transcript !== 'string') {
    return { valid: false, error: 'Invalid transcript content' };
  }
  
  // Check minimum length
  if (transcript.trim().length < 50) {
    return { valid: false, error: 'Transcript content too short (minimum 50 characters)' };
  }
  
  // Check maximum length (10MB limit)
  if (transcript.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'Transcript content too large (maximum 10MB)' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(transcript)) {
      return { valid: false, error: 'Transcript content contains potentially unsafe elements' };
    }
  }
  
  return { valid: true };
}

// Create metadata for transcript content
function createTranscriptMetadata(transcript, filename) {
  const wordCount = transcript.trim().split(/\s+/).length;
  const charCount = transcript.length;
  const estimatedDuration = Math.ceil(wordCount / 150); // Assuming 150 words per minute
  
  // Try to extract title from filename or content
  let title = 'Uploaded Content';
  if (filename) {
    title = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  } else {
    // Try to extract first meaningful line as title
    const lines = transcript.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      title = lines[0].substring(0, 100); // First line, max 100 chars
    }
  }
  
  return {
    title,
    filename: filename || 'transcript.txt',
    wordCount,
    charCount,
    estimatedDuration,
    contentType: 'transcript',
    uploadDate: new Date().toISOString(),
    source: 'upload'
  };
}

// Generate folder name for transcript content
function generateContentFolderName(metadata, processId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const shortId = processId.substring(0, 8);
  
  // Clean title for filesystem
  let cleanTitle = metadata.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  if (!cleanTitle) {
    cleanTitle = 'content';
  }
  
  return `${timestamp}_${cleanTitle}_${shortId}`;
}

// Create index content for transcript processing
function createTranscriptIndexContent(metadata) {
  let indexContent = `# Content Analysis Results\n\n`;
  
  indexContent += `**Content Title**: ${metadata.title}\n`;
  if (metadata.filename) {
    indexContent += `**Original Filename**: ${metadata.filename}\n`;
  }
  indexContent += `**Content Type**: Uploaded/Pasted Transcript\n`;
  indexContent += `**Word Count**: ${metadata.wordCount?.toLocaleString() || 'Unknown'}\n`;
  indexContent += `**Character Count**: ${metadata.charCount?.toLocaleString() || 'Unknown'}\n`;
  if (metadata.estimatedDuration) {
    indexContent += `**Estimated Duration**: ${metadata.estimatedDuration} minutes\n`;
  }
  indexContent += `**Processing Date**: ${new Date().toLocaleString()}\n`;
  indexContent += `**Upload Date**: ${metadata.uploadDate ? new Date(metadata.uploadDate).toLocaleString() : 'Unknown'}\n\n`;
  
  indexContent += `## Processing Information\n\n`;
  indexContent += `This content was processed using the Universal Content Intelligence Platform's fabric patterns. `;
  indexContent += `The transcript was directly processed without requiring video download, providing the same comprehensive `;
  indexContent += `analysis capabilities as YouTube videos but with enhanced speed and reliability.\n\n`;
  
  indexContent += `## Analysis Files Generated\n\n`;
  indexContent += `The following analysis files have been generated using 13 specialized fabric patterns organized into 4 phases:\n\n`;
  
  // Group patterns by phase and generate accurate file list
  const phases = {};
  FABRIC_PATTERNS.forEach(pattern => {
    if (!phases[pattern.phase]) {
      phases[pattern.phase] = [];
    }
    phases[pattern.phase].push(pattern);
  });
  
  // Generate phase-organized file list with correct filenames
  Object.keys(phases).sort().forEach(phase => {
    const phaseNum = parseInt(phase);
    const phaseDesc = PHASE_DESCRIPTIONS[phaseNum];
    indexContent += `### Phase ${phaseNum}: ${phaseDesc}\n`;
    
    phases[phase].forEach(pattern => {
      indexContent += `- **${pattern.filename}** - ${pattern.description}\n`;
    });
    
    indexContent += `\n`;
  });
  
  indexContent += `## Download\n\n`;
  indexContent += `All files are packaged in **content_analysis.zip** for easy download and sharing.\n\n`;
  
  indexContent += `---\n`;
  indexContent += `*Generated by Universal Content Intelligence Platform*\n`;
  
  return indexContent;
}

// Process transcript content directly
async function processTranscriptContent(processId, transcript, filename, outputDir) {
  const process = activeProcesses.get(processId);
  
  try {
    process.status = 'processing';
    process.currentStep = 0;
    process.totalSteps = FABRIC_PATTERNS.length;
    
    // Broadcast initial status
    broadcast({
      type: 'process_started',
      processId,
      contentType: 'transcript',
      filename: filename || 'transcript',
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

    // Process transcript through fabric patterns
    console.log('🚀 Processing transcript content directly...');
    const processingResult = await fabricTranscriptIntegration.processTranscriptContent(
      transcript,
      FABRIC_PATTERNS,
      progressCallback,
      process.metadata
    );

    // Save results to files with metadata
    await saveResults(outputDir, processingResult.results, process.metadata, null);
    
    // Update process status
    process.status = 'completed';
    process.endTime = new Date();
    process.results = processingResult.results;
    process.completed = processingResult.completed;
    process.successful = processingResult.successful || processingResult.completed;
    process.simulated = processingResult.simulated || false;
    process.method = processingResult.method || 'transcript-direct';
    process.processingTime = processingResult.processingTime;
    process.transcriptInfo = processingResult.transcript || null;
    
    // Broadcast completion
    broadcast({
      type: 'process_completed',
      processId,
      completed: processingResult.completed,
      total: processingResult.total,
      successful: processingResult.successful || processingResult.completed,
      simulated: process.simulated,
      method: process.method,
      processingTime: process.processingTime,
      transcriptInfo: process.transcriptInfo
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

// Update ZIP file to include derived documents
async function updateZipWithDocuments(outputDir) {
  try {
    const zipPath = path.join(outputDir, 'content_analysis.zip');
    const derivedDocumentsPath = path.join(outputDir, 'derived-documents');
    
    // Check if derived documents exist
    const derivedExists = await fs.pathExists(derivedDocumentsPath);
    if (!derivedExists) {
      console.log('No derived documents to include in ZIP');
      return;
    }

    // Create new archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);

    // Add all original pattern files
    const files = await fs.readdir(outputDir);
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && (file.endsWith('.txt') || file === 'index.md')) {
        archive.file(filePath, { name: file });
      }
    }

    // Add derived documents folder
    archive.directory(derivedDocumentsPath, 'derived-documents');

    // Finalize the archive
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.finalize();
    });

    console.log(`Updated ZIP file with derived documents: ${zipPath}`);
  } catch (error) {
    console.error('Error updating ZIP with documents:', error);
    throw error;
  }
}


module.exports = { app, server };
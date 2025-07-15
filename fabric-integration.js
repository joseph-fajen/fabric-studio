// Fabric MCP Server Integration
// Handles communication with fabric-mcp-server for pattern execution

const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class FabricIntegration {
  constructor() {
    this.isInitialized = false;
    this.fabricPath = null;
  }

  async initialize() {
    try {
      // Check if fabric command is available
      await this.checkFabricInstallation();
      this.isInitialized = true;
      console.log('Fabric integration initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize fabric integration:', error.message);
      throw new Error('Fabric installation not found. Please install fabric-mcp-server first.');
    }
  }

  async checkFabricInstallation() {
    return new Promise((resolve, reject) => {
      exec('which fabric', (error, stdout, stderr) => {
        if (error) {
          // Try alternative paths
          const alternativePaths = [
            '/usr/local/bin/fabric',
            '/opt/homebrew/bin/fabric',
            process.env.HOME + '/.local/bin/fabric'
          ];
          
          for (const altPath of alternativePaths) {
            if (fs.existsSync(altPath)) {
              this.fabricPath = altPath;
              resolve(altPath);
              return;
            }
          }
          
          reject(new Error('Fabric command not found'));
        } else {
          this.fabricPath = stdout.trim();
          resolve(this.fabricPath);
        }
      });
    });
  }

  async executePattern(patternName, youtubeUrl, outputDir) {
    if (!this.isInitialized) {
      throw new Error('Fabric integration not initialized');
    }

    return new Promise((resolve, reject) => {
      const command = `${this.fabricPath || 'fabric'} -p ${patternName} "${youtubeUrl}"`;
      console.log(`Executing: ${command}`);
      
      exec(command, { 
        timeout: 300000, // 5 minute timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Pattern ${patternName} failed:`, error.message);
          reject(new Error(`Pattern execution failed: ${error.message}`));
          return;
        }

        if (stderr) {
          console.warn(`Pattern ${patternName} warning:`, stderr);
        }

        // Return the output content
        resolve(stdout || 'Pattern executed successfully');
      });
    });
  }

  async processYouTubeVideo(youtubeUrl, patterns, progressCallback) {
    const results = {};
    const outputDir = path.join(__dirname, 'outputs', `youtube_${Date.now()}`);
    
    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      
      try {
        // Update progress
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: patterns.length,
            pattern: pattern.name,
            phase: pattern.phase,
            description: pattern.description
          });
        }

        // Execute the pattern
        const result = await this.executePattern(pattern.name, youtubeUrl, outputDir);
        
        // Store result
        results[pattern.filename] = {
          content: result,
          pattern: pattern.name,
          phase: pattern.phase,
          description: pattern.description
        };

        console.log(`Completed pattern: ${pattern.name}`);
        
      } catch (error) {
        console.error(`Failed to execute pattern ${pattern.name}:`, error.message);
        
        // Store error result but continue processing
        results[pattern.filename] = {
          content: `# Error executing ${pattern.name}\n\nAn error occurred while processing this pattern:\n\n${error.message}\n\nPlease check your fabric installation and try again.`,
          pattern: pattern.name,
          phase: pattern.phase,
          description: pattern.description,
          error: true
        };
      }
    }

    return {
      results,
      outputDir,
      completed: Object.keys(results).length,
      total: patterns.length
    };
  }

  // Fallback method for testing without fabric installed
  async simulatePattern(patternName, youtubeUrl) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    return `# ${patternName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

This is a simulated output for pattern: **${patternName}**

**YouTube URL**: ${youtubeUrl}

## Simulated Analysis

This pattern would normally process the YouTube video and extract relevant information based on the ${patternName} methodology.

Key insights would include:
- Analysis of video content
- Extraction of relevant patterns
- Structured markdown output
- Professional formatting

**Note**: This is a simulation. Install fabric-mcp-server for actual processing.

*Generated at: ${new Date().toISOString()}*`;
  }

  async processYouTubeVideoSimulation(youtubeUrl, patterns, progressCallback) {
    const results = {};
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      
      // Update progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: patterns.length,
          pattern: pattern.name,
          phase: pattern.phase,
          description: pattern.description
        });
      }

      // Simulate pattern execution
      const result = await this.simulatePattern(pattern.name, youtubeUrl);
      
      // Store result
      results[pattern.filename] = {
        content: result,
        pattern: pattern.name,
        phase: pattern.phase,
        description: pattern.description,
        simulated: true
      };

      console.log(`Simulated pattern: ${pattern.name}`);
    }

    return {
      results,
      outputDir: null,
      completed: Object.keys(results).length,
      total: patterns.length,
      simulated: true
    };
  }
}

module.exports = FabricIntegration;
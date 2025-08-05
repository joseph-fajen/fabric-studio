// Server Manager - Enhanced server startup and management
const net = require('net');
const fs = require('fs-extra');
const path = require('path');

class ServerManager {
  constructor() {
    this.pidFile = path.join(__dirname, '.server.pid');
    this.preferredPort = process.env.PORT || 3000;
    this.maxPortTries = 10;
  }

  // Check if a port is available
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  // Find an available port starting from preferred port
  async findAvailablePort() {
    let port = this.preferredPort;
    
    for (let i = 0; i < this.maxPortTries; i++) {
      const available = await this.isPortAvailable(port);
      if (available) {
        return port;
      }
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      port++;
    }
    
    throw new Error(`No available ports found after trying ${this.maxPortTries} ports starting from ${this.preferredPort}`);
  }

  // Check if server is already running
  async isServerRunning() {
    try {
      if (!await fs.pathExists(this.pidFile)) {
        return false;
      }
      
      const pid = await fs.readFile(this.pidFile, 'utf8');
      
      // Check if process is actually running
      try {
        process.kill(parseInt(pid), 0);
        return parseInt(pid);
      } catch (e) {
        // Process not running, clean up stale PID file
        await fs.remove(this.pidFile);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Save server PID
  async savePid() {
    await fs.writeFile(this.pidFile, process.pid.toString());
  }

  // Clean up PID file
  async cleanup() {
    try {
      await fs.remove(this.pidFile);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Kill existing server
  async killExistingServer() {
    const existingPid = await this.isServerRunning();
    if (existingPid) {
      console.log(`Stopping existing server (PID: ${existingPid})...`);
      try {
        process.kill(existingPid, 'SIGTERM');
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force kill if still running
        try {
          process.kill(existingPid, 0);
          console.log('Force killing existing server...');
          process.kill(existingPid, 'SIGKILL');
        } catch (e) {
          // Process already dead
        }
      } catch (error) {
        console.log('Server was already stopped');
      }
      await this.cleanup();
    }
  }

  // Validate environment and dependencies
  async validateEnvironment() {
    const issues = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 14) {
      issues.push(`Node.js version ${nodeVersion} is too old. Requires Node.js 14+`);
    }
    
    // Check required directories (from project root)
    const projectRoot = path.join(__dirname, '../../');
    const requiredDirs = ['public', 'outputs', 'temp', 'logs'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (!await fs.pathExists(dirPath)) {
        console.log(`Creating missing directory: ${dir}`);
        await fs.ensureDir(dirPath);
      }
    }
    
    // Check required files (from project root)
    const requiredFiles = [
      'src/core/fabric-transcript-integration.js',
      'src/core/fabric-patterns.js',
      'src/metadata/youtube-metadata.js',
      'public/index.html'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      if (!await fs.pathExists(filePath)) {
        issues.push(`Missing required file: ${file}`);
      }
    }
    
    if (issues.length > 0) {
      throw new Error(`Environment validation failed:\n${issues.join('\n')}`);
    }
    
    console.log('✅ Environment validation passed');
  }

  // Setup graceful shutdown handlers
  setupShutdownHandlers(server) {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      // Close server
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Cleanup PID file
        await this.cleanup();
        
        console.log('Cleanup completed. Goodbye!');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log('Force shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions gracefully
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await this.cleanup();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await this.cleanup();
      process.exit(1);
    });
  }
}

module.exports = ServerManager;
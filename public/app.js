// YouTube Fabric Processor Client-side JavaScript

class YouTubeFabricProcessor {
    constructor() {
        this.ws = null;
        this.currentProcessId = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkSystemStatus();
    }

    initializeElements() {
        // Input elements
        this.urlInput = document.getElementById('youtube-url');
        this.processBtn = document.getElementById('process-btn');
        
        // Management elements
        this.managementToggle = document.getElementById('management-toggle');
        this.managementModal = document.getElementById('management-modal');
        this.closeManagement = document.getElementById('close-management');
        
        // Status elements
        this.statusSection = document.getElementById('status-section');
        this.statusBadge = document.getElementById('status-badge');
        this.progressFill = document.getElementById('progress-fill');
        this.progressCurrent = document.getElementById('progress-current');
        this.progressTotal = document.getElementById('progress-total');
        this.currentPatternName = document.querySelector('.pattern-name');
        this.currentPatternDescription = document.querySelector('.pattern-description');
        
        // Results elements
        this.resultsSection = document.getElementById('results-section');
        this.resultsCount = document.getElementById('results-count');
        this.downloadBtn = document.getElementById('download-btn');
        
        // Error elements
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');
        
        // Footer elements
        this.fabricStatus = document.getElementById('fabric-status');
    }

    setupEventListeners() {
        this.processBtn.addEventListener('click', () => this.startProcessing());
        this.downloadBtn.addEventListener('click', () => this.downloadResults());
        this.retryBtn.addEventListener('click', () => this.resetInterface());
        
        // Management panel
        this.managementToggle.addEventListener('click', () => this.openManagementPanel());
        this.closeManagement.addEventListener('click', () => this.closeManagementPanel());
        
        // Close modal on outside click
        this.managementModal.addEventListener('click', (e) => {
            if (e.target === this.managementModal) {
                this.closeManagementPanel();
            }
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Management controls
        document.getElementById('refresh-history').addEventListener('click', () => this.loadHistory());
        document.getElementById('cleanup-old-btn').addEventListener('click', () => this.cleanupOldFiles());
        
        // Control panel buttons
        document.getElementById('restart-server-btn').addEventListener('click', () => this.restartServer());
        document.getElementById('shutdown-server-btn').addEventListener('click', () => this.shutdownServer());
        document.getElementById('stop-processing-btn').addEventListener('click', () => this.stopProcessing());
        
        // URL input validation
        this.urlInput.addEventListener('input', () => this.validateUrl());
        this.urlInput.addEventListener('paste', () => {
            // Delay validation to allow paste to complete
            setTimeout(() => this.validateUrl(), 100);
        });
    }

    validateUrl() {
        const url = this.urlInput.value.trim();
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        
        if (url === '') {
            this.processBtn.disabled = false;
            this.processBtn.textContent = 'Process Video';
            return;
        }
        
        if (youtubeRegex.test(url)) {
            this.processBtn.disabled = false;
            this.processBtn.textContent = 'Process Video';
            this.urlInput.style.borderColor = '#27ae60';
        } else {
            this.processBtn.disabled = true;
            this.processBtn.textContent = 'Invalid YouTube URL';
            this.urlInput.style.borderColor = '#e74c3c';
        }
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.fabricAvailable) {
                this.fabricStatus.textContent = 'Fabric integration ready';
                this.fabricStatus.style.color = '#27ae60';
            } else {
                this.fabricStatus.textContent = 'Fabric not available (simulation mode)';
                this.fabricStatus.style.color = '#f39c12';
            }
        } catch (error) {
            this.fabricStatus.textContent = 'Server connection error';
            this.fabricStatus.style.color = '#e74c3c';
        }
    }

    async startProcessing() {
        if (this.isProcessing) return;
        
        const url = this.urlInput.value.trim();
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.processBtn.textContent = 'Starting...';
        
        this.hideAllSections();
        this.showSection(this.statusSection);
        this.updateStatusBadge('starting', 'Starting');
        
        try {
            // Start processing
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ youtubeUrl: url })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to start processing');
            }
            
            this.currentProcessId = data.processId;
            this.setupWebSocket();
            this.updateStatusBadge('processing', 'Processing');
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    setupWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'process_started':
                this.progressTotal.textContent = data.totalSteps;
                break;
                
            case 'progress':
                this.updateProgress(data);
                break;
                
            case 'process_completed':
                this.handleProcessCompleted(data);
                break;
                
            case 'process_failed':
                this.showError(data.error);
                break;
        }
    }

    updateProgress(data) {
        const percentage = (data.current / data.total) * 100;
        this.progressFill.style.width = `${percentage}%`;
        this.progressCurrent.textContent = data.current;
        
        // Update current pattern info
        this.currentPatternName.textContent = data.pattern.replace(/_/g, ' ');
        this.currentPatternDescription.textContent = data.description;
        
        // Update pattern visual indicators
        this.updatePatternIndicators(data.pattern, data.phase);
    }

    updatePatternIndicators(currentPattern, currentPhase) {
        // Reset all patterns
        document.querySelectorAll('.pattern-item').forEach(item => {
            item.classList.remove('active', 'completed');
        });
        
        // Mark current pattern as active
        const currentItem = document.querySelector(`[data-pattern="${currentPattern}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
        
        // Mark completed patterns
        const allPatterns = ['youtube_summary', 'extract_core_message', 'extract_wisdom', 
                           'extract_insights', 'extract_ideas', 'extract_patterns', 
                           'extract_recommendations', 'extract_predictions', 'extract_references', 
                           'extract_questions', 'create_tags', 'create_5_sentence_summary', 'to_flashcards'];
        
        const currentIndex = allPatterns.indexOf(currentPattern);
        for (let i = 0; i < currentIndex; i++) {
            const item = document.querySelector(`[data-pattern="${allPatterns[i]}"]`);
            if (item) {
                item.classList.add('completed');
            }
        }
    }

    handleProcessCompleted(data) {
        this.isProcessing = false;
        this.updateStatusBadge('completed', 'Completed');
        
        // Update final progress
        this.progressFill.style.width = '100%';
        this.progressCurrent.textContent = data.total;
        
        // Mark all patterns as completed
        document.querySelectorAll('.pattern-item').forEach(item => {
            item.classList.remove('active');
            item.classList.add('completed');
        });
        
        // Show results section
        this.resultsCount.textContent = data.completed;
        this.showSection(this.resultsSection);
        
        // Add simulation notice if applicable
        if (data.simulated) {
            const notice = document.createElement('div');
            notice.className = 'simulation-notice';
            notice.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px;';
            notice.textContent = 'Note: This was a simulation run. Install fabric-mcp-server for actual processing.';
            this.resultsSection.insertBefore(notice, this.resultsSection.firstChild);
        }
        
        // Close WebSocket
        if (this.ws) {
            this.ws.close();
        }
    }

    async downloadResults() {
        if (!this.currentProcessId) return;
        
        try {
            const response = await fetch(`/api/download/${this.currentProcessId}`);
            
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `youtube_analysis_${this.currentProcessId.substring(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            alert('Download failed: ' + error.message);
        }
    }

    showError(message) {
        this.isProcessing = false;
        this.hideAllSections();
        this.showSection(this.errorSection);
        this.errorMessage.textContent = message;
        this.updateStatusBadge('error', 'Error');
        
        if (this.ws) {
            this.ws.close();
        }
    }

    resetInterface() {
        this.isProcessing = false;
        this.currentProcessId = null;
        this.processBtn.disabled = false;
        this.processBtn.textContent = 'Process Video';
        this.urlInput.value = '';
        this.urlInput.style.borderColor = '#e1e5e9';
        
        this.hideAllSections();
        this.resetProgress();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    resetProgress() {
        this.progressFill.style.width = '0%';
        this.progressCurrent.textContent = '0';
        this.currentPatternName.textContent = 'Initializing...';
        this.currentPatternDescription.textContent = 'Preparing to process video';
        
        // Reset all pattern indicators
        document.querySelectorAll('.pattern-item').forEach(item => {
            item.classList.remove('active', 'completed');
        });
    }

    hideAllSections() {
        this.statusSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
    }

    showSection(section) {
        section.classList.remove('hidden');
    }

    updateStatusBadge(status, text) {
        this.statusBadge.className = `status-badge ${status}`;
        this.statusBadge.textContent = text;
    }

    // Management Panel Methods
    openManagementPanel() {
        this.managementModal.classList.remove('hidden');
        this.loadManagementData();
    }

    closeManagementPanel() {
        this.managementModal.classList.add('hidden');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load data for the selected tab
        if (tabName === 'status') {
            this.loadStatus();
        } else if (tabName === 'history') {
            this.loadHistory();
        }
    }

    async loadManagementData() {
        this.loadStatus();
        this.loadHistory();
    }

    async loadStatus() {
        try {
            const response = await fetch('/api/management/status');
            const data = await response.json();

            // Update server status
            document.getElementById('server-uptime').textContent = data.server.uptimeFormatted;
            document.getElementById('memory-usage').textContent = data.server.memoryUsage.heapUsed;
            document.getElementById('fabric-available').textContent = data.server.fabricAvailable ? 'Yes' : 'No';

            // Update process info
            document.getElementById('active-processes').textContent = data.processes.active;

            // Update process list
            const processList = document.getElementById('process-list');
            processList.innerHTML = '';

            if (data.processes.list.length === 0) {
                processList.innerHTML = '<div class="process-item">No active processes</div>';
            } else {
                data.processes.list.forEach(process => {
                    const processItem = document.createElement('div');
                    processItem.className = 'process-item';
                    processItem.innerHTML = `
                        <div class="process-title">${process.folderName || process.id}</div>
                        <div class="process-details">
                            Status: ${process.status} | Step: ${process.currentStep || 0}/${process.totalSteps || 13}
                        </div>
                    `;
                    processList.appendChild(processItem);
                });
            }
        } catch (error) {
            console.error('Error loading status:', error);
        }
    }

    async loadHistory() {
        try {
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '<div class="loading">Loading history...</div>';

            const response = await fetch('/api/management/history');
            const history = await response.json();

            document.querySelector('.history-count').textContent = `${history.length} analyses found`;

            historyList.innerHTML = '';
            if (history.length === 0) {
                historyList.innerHTML = '<div class="loading">No analysis history found</div>';
                return;
            }

            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const title = item.metadata?.title || item.folderName;
                const channel = item.metadata?.channel || 'Unknown Channel';
                const created = new Date(item.created).toLocaleDateString();
                
                historyItem.innerHTML = `
                    <div class="item-header">
                        <div class="item-title">${title}</div>
                        <div class="item-actions">
                            <button class="delete-btn" onclick="app.deleteFolder('${item.folderName}')">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="item-details">
                        <div>Channel: ${channel}</div>
                        <div>Created: ${created}</div>
                        <div>Files: ${item.filesCount}</div>
                        <div>Size: ${item.size}</div>
                        <div>ZIP: ${item.hasZip ? 'Yes' : 'No'}</div>
                    </div>
                `;
                historyList.appendChild(historyItem);
            });
        } catch (error) {
            console.error('Error loading history:', error);
            document.getElementById('history-list').innerHTML = '<div class="loading">Error loading history</div>';
        }
    }

    async deleteFolder(folderName) {
        if (!confirm(`Are you sure you want to delete "${folderName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/management/cleanup/${folderName}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadHistory(); // Refresh the list
                alert('Folder deleted successfully');
            } else {
                const error = await response.json();
                alert('Error deleting folder: ' + error.error);
            }
        } catch (error) {
            console.error('Error deleting folder:', error);
            alert('Error deleting folder');
        }
    }

    async cleanupOldFiles() {
        const daysOld = document.getElementById('cleanup-days').value;
        
        if (!confirm(`Are you sure you want to remove all files older than ${daysOld} days? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/api/management/cleanup-old', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ daysOld: parseInt(daysOld) })
            });

            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                this.loadHistory(); // Refresh the list
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error cleaning up old files:', error);
            alert('Error cleaning up old files');
        }
    }

    async restartServer() {
        if (!confirm('Are you sure you want to restart the server? This will reload the optimized processing engine.')) {
            return;
        }

        try {
            const response = await fetch('/api/management/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                alert('Server is restarting... Please wait a moment and refresh the page.');
                // Close WebSocket connection
                if (this.ws) {
                    this.ws.close();
                }
                // Disable interface during restart
                this.processBtn.disabled = true;
                this.processBtn.textContent = 'Server Restarting...';
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error restarting server:', error);
            alert('Server may be restarting. Please refresh the page in a few seconds.');
        }
    }

    async shutdownServer() {
        if (!confirm('Are you sure you want to shutdown the server? You will need to restart it manually from the command line.')) {
            return;
        }

        try {
            const response = await fetch('/api/management/shutdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                alert('Server is shutting down. You will need to restart it manually.');
                // Close WebSocket connection
                if (this.ws) {
                    this.ws.close();
                }
                // Disable interface
                this.processBtn.disabled = true;
                this.processBtn.textContent = 'Server Offline';
                this.fabricStatus.textContent = 'Server offline';
                this.fabricStatus.style.color = '#e74c3c';
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error shutting down server:', error);
            alert('Server may be shutting down. The interface will become unavailable.');
        }
    }

    async stopProcessing() {
        if (!this.isProcessing && this.currentProcessId === null) {
            alert('No processing jobs are currently active.');
            return;
        }

        if (!confirm('Are you sure you want to stop all active processing jobs?')) {
            return;
        }

        try {
            const response = await fetch('/api/management/stop-processing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                this.resetInterface();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error stopping processing:', error);
            alert('Error stopping processing');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new YouTubeFabricProcessor();
});
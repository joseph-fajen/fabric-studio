// Fabric Studio Client-side JavaScript

class FabricStudio {
    constructor() {
        this.ws = null;
        this.currentProcessId = null;
        this.isProcessing = false;

        this.initializeElements();
        this.setupEventListeners();
        this.checkSystemStatus();
        this.checkAuthStatus();

        // Initial validation after everything is set up
        setTimeout(() => this.validateInput(), 100);
    }

    initializeElements() {
        // OAuth2 authentication elements
        this.authStatus = document.getElementById('auth-status');
        this.authUnauthenticated = document.getElementById('auth-unauthenticated');
        this.authAuthenticated = document.getElementById('auth-authenticated');
        this.authUserInfo = document.getElementById('auth-user-info');
        this.loginBtn = document.getElementById('login-btn');
        this.logoutBtn = document.getElementById('logout-btn');

        // Input elements - Fabric Studio
        this.urlInput = document.getElementById('youtube-url');
        this.transcriptFile = document.getElementById('transcript-file');
        this.transcriptText = document.getElementById('transcript-text');
        this.processBtn = document.getElementById('process-btn');

        // Method selection elements
        this.methodTabs = document.querySelectorAll('.method-tab');
        this.inputMethods = document.querySelectorAll('.input-method');

        // Management elements (removed - using lab-portal instead)

        // Status elements
        this.statusSection = document.getElementById('status-section');
        this.progressSection = document.getElementById('progress-section');
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

        // Document Laboratory elements
        this.documentLaboratorySection = document.getElementById('document-laboratory-section');
        this.documentOpportunities = document.getElementById('document-opportunities');
        this.documentGenerationProgress = document.getElementById('document-generation-progress');
        this.documentResults = document.getElementById('document-results');
        this.selectAllDocumentsBtn = document.getElementById('select-all-documents');
        this.generateDocumentsBtn = document.getElementById('generate-documents-btn');
        this.enhancedDownloadBtn = document.getElementById('enhanced-download-btn');

        // Error elements
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');

        // Footer elements
        this.fabricStatus = document.getElementById('fabric-status');
    }

    setupEventListeners() {
        // OAuth2 authentication listeners
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        this.processBtn.addEventListener('click', () => this.startProcessing());
        this.downloadBtn.addEventListener('click', () => this.downloadEnhancedResults());
        this.retryBtn.addEventListener('click', () => this.resetInterface());

        // Document Laboratory event listeners
        this.selectAllDocumentsBtn.addEventListener('click', () => this.selectAllRecommendedDocuments());
        this.generateDocumentsBtn.addEventListener('click', () => this.generateSelectedDocuments());
        this.enhancedDownloadBtn.addEventListener('click', () => this.downloadEnhancedResults());

        // Management panel (removed - using lab-portal instead)

        // Tab switching (temporarily disabled)
        // document.querySelectorAll('.tab-btn').forEach(btn => {
        //     btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        // });

        // Management controls (temporarily disabled)
        // document.getElementById('refresh-history').addEventListener('click', () => this.loadHistory());
        // document.getElementById('cleanup-old-btn').addEventListener('click', () => this.cleanupOldFiles());

        // Control panel buttons (temporarily disabled)
        // document.getElementById('restart-server-btn').addEventListener('click', () => this.restartServer());
        // document.getElementById('shutdown-server-btn').addEventListener('click', () => this.shutdownServer());
        // document.getElementById('stop-processing-btn').addEventListener('click', () => this.stopProcessing());

        // Input validation for all methods
        if (this.urlInput) {
            this.urlInput.addEventListener('input', () => this.validateInput());
            this.urlInput.addEventListener('paste', () => {
                setTimeout(() => this.validateInput(), 100);
            });
        }

        if (this.transcriptFile) {
            this.transcriptFile.addEventListener('change', () => {
                // Call inline script's handleFile if available to show file info
                if (this.transcriptFile.files.length > 0 && typeof handleFile === 'function') {
                    handleFile(this.transcriptFile.files[0]);
                }
                this.validateInput();
            });
        }

        if (this.transcriptText) {
            this.transcriptText.addEventListener('input', () => this.validateInput());
            this.transcriptText.addEventListener('paste', () => {
                setTimeout(() => this.validateInput(), 100);
            });
        }

        // Method tab switching
        if (this.methodTabs) {
            this.methodTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.switchInputMethod(tab.dataset.method);
                });
            });
        }

        this.initializeUploadHandlers();
    }

    initializeUploadHandlers() {
        const dropzone = document.getElementById('dropzone');
        const browseLink = document.getElementById('browse-link');
        const fileInput = document.getElementById('transcript-file');
        const fileInfo = document.getElementById('file-info');

        if (browseLink && fileInput) {
            browseLink.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (dropzone && fileInput) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.remove('drag-over');
                });
            });

            dropzone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    this.validateInput();
                    this.updateFileInfo(files[0]);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    this.updateFileInfo(fileInput.files[0]);
                }
            });
        }
    }

    updateFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) {
            fileInfo.style.display = 'block';
            fileInfo.innerHTML = `
                <div class="file-info-name">${file.name}</div>
                <div class="file-info-details">${(file.size / 1024).toFixed(1)} KB</div>
            `;
        }
    }

    validateInput() {
        const activeMethod = this.getActiveInputMethod();
        let hasValidContent = false;
        let buttonText = 'Begin Deep Analysis';

        switch (activeMethod) {
            case 'upload':
                // Check both file input and global currentContent (for drag-and-drop)
                hasValidContent = (this.transcriptFile && this.transcriptFile.files.length > 0) ||
                                 (typeof window.currentContent === 'string' && window.currentContent.trim().length > 0);
                buttonText = hasValidContent ? 'Begin Deep Analysis' : 'Upload File First';
                break;
            case 'paste':
                const textContent = this.transcriptText ? this.transcriptText.value.trim() : '';
                hasValidContent = textContent.length > 0;
                buttonText = hasValidContent ? 'Begin Deep Analysis' : 'Paste Content First';
                break;
            case 'youtube':
                const url = this.urlInput ? this.urlInput.value.trim() : '';
                const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
                hasValidContent = url && youtubeRegex.test(url);
                buttonText = hasValidContent ? 'Process YouTube Video' : 'Enter Valid YouTube URL';
                break;
        }

        if (this.processBtn) {
            this.processBtn.disabled = !hasValidContent;
            this.processBtn.textContent = buttonText;
        }
    }

    getActiveInputMethod() {
        const activeTab = document.querySelector('.method-tab.active');
        const method = activeTab ? activeTab.dataset.method : 'upload';
        // Only support upload and paste in cloud deployment
        return ['upload', 'paste'].includes(method) ? method : 'upload';
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

        const activeMethod = this.getActiveInputMethod();
        let payload = null;
        let contentSource = '';

        // Prepare payload based on active input method
        switch (activeMethod) {
            case 'upload':
                let fileContent, fileName;

                // Check if file was uploaded via input or drag-and-drop
                if (this.transcriptFile && this.transcriptFile.files.length > 0) {
                    // File uploaded via input element
                    const file = this.transcriptFile.files[0];
                    fileContent = await this.readFileContent(file);
                    fileName = file.name;
                } else if (typeof window.currentContent === 'string' && window.currentContent.trim().length > 0) {
                    // File loaded via drag-and-drop (stored in global currentContent)
                    fileContent = window.currentContent;
                    fileName = window.currentFile ? window.currentFile.name : 'transcript.txt';
                } else {
                    alert('Please upload a transcript file first');
                    return;
                }

                payload = {
                    contentType: 'transcript',
                    transcript: fileContent,
                    filename: fileName
                };
                contentSource = `uploaded file: ${fileName}`;
                break;

            case 'paste':
                const textContent = this.transcriptText ? this.transcriptText.value.trim() : '';
                if (!textContent) {
                    alert('Please paste your content first');
                    return;
                }
                payload = {
                    contentType: 'transcript',
                    transcript: textContent
                };
                contentSource = 'pasted content';
                break;

            case 'youtube':
                const url = this.urlInput ? this.urlInput.value.trim() : '';
                const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
                if (!url || !youtubeRegex.test(url)) {
                    alert('Please enter a valid YouTube URL');
                    return;
                }
                payload = {
                    contentType: 'youtube',
                    youtubeUrl: url
                };
                contentSource = `YouTube: ${url}`;
                break;

            default:
                alert('Please select a valid input method');
                return;
        }

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.processBtn.textContent = 'Starting...';

        this.hideAllSections();
        this.showSection(this.progressSection);
        this.updateStatusBadge('starting', `Starting analysis of ${contentSource}`);

        try {
            // Start processing with appropriate payload
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start processing');
            }

            this.currentProcessId = data.processId;
            this.setupWebSocket();
            this.updateStatusBadge('processing', 'Processing with Fabric patterns');

        } catch (error) {
            this.showError(error.message);
        }
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    switchInputMethod(method) {
        // Update tab active states
        this.methodTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.method === method);
        });

        // Update input method visibility
        this.inputMethods.forEach(inputMethod => {
            inputMethod.classList.toggle('active', inputMethod.id === `method-${method}`);
        });

        // Re-validate input for new method
        this.validateInput();
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
            case 'document_opportunities':
                this.showDocumentOpportunities(data);
                break;
            case 'document_generation_started':
                this.startDocumentGeneration(data);
                break;
            case 'document_progress':
                this.updateDocumentGenerationProgress(data);
                break;
            case 'document_generation_complete':
                this.completeDocumentGeneration(data);
                break;
            case 'document_generation_failed':
                this.documentGenerationError(data.error);
                break;
        }
    }

    updateProgress(data) {
        // Update progress bar if elements exist
        if (this.progressFill) {
            const percentage = (data.current / data.total) * 100;
            this.progressFill.style.width = `${percentage}%`;
        }
        if (this.progressCurrent) {
            this.progressCurrent.textContent = data.current;
        }

        // Pattern info is displayed through visual highlighting instead of text updates
        // This prevents overwriting the static pattern names in the UI

        // Update pattern visual indicators
        this.updatePatternIndicators(data.pattern, data.phase);
    }

    updatePatternIndicators(currentPattern, currentPhase) {
        // Reset all patterns
        document.querySelectorAll('.pattern-organism').forEach(item => {
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

        // Update final progress if elements exist
        if (this.progressFill) {
            this.progressFill.style.width = '100%';
        }
        if (this.progressCurrent) {
            this.progressCurrent.textContent = data.total;
        }

        // Mark all patterns as completed
        document.querySelectorAll('.pattern-organism').forEach(item => {
            item.classList.remove('active');
            item.classList.add('completed');
        });

        // Show simple results section with download access
        this.showSection(this.resultsSection);

        // Update results count and enable download
        if (this.resultsCount) {
            this.resultsCount.textContent = '13';
        }
        if (this.downloadBtn) {
            this.downloadBtn.disabled = false;
            this.downloadBtn.textContent = 'Download Results ZIP';
        }

        // Add simulation notice if applicable
        if (data.simulated) {
            const notice = document.createElement('div');
            notice.className = 'simulation-notice';
            notice.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px;';
            notice.textContent = 'Note: This was a simulation run. Install Fabric CLI for actual processing: go install github.com/danielmiessler/fabric@latest';
            if (this.resultsSection) {
                this.resultsSection.insertBefore(notice, this.resultsSection.firstChild);
            }
        }

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
        }
    }



    async downloadEnhancedResults() {
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
            a.download = `content_analysis_${this.currentProcessId.substring(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification('Results downloaded successfully!', 'success');
            }

        } catch (error) {
            alert('Download failed: ' + error.message);
        }
    }

    showDocumentOpportunities(data) {
        this.documentOpportunityData = data.opportunities;
        this.selectedDocuments = [];

        this.hideAllSections();
        this.showSection(this.documentLaboratorySection);
        this.documentOpportunities.classList.remove('hidden');
        this.documentOpportunities.style.display = 'block';
        this.documentGenerationProgress.style.display = 'none';
        this.documentResults.style.display = 'none';

        const documentTiers = {
            technical: document.querySelector('[data-tier="technical"] .tier-documents'),
            strategic: document.querySelector('[data-tier="strategic"] .tier-documents'),
            educational: document.querySelector('[data-tier="educational"] .tier-documents'),
            operational: document.querySelector('[data-tier="operational"] .tier-documents'),
        };

        // Clear previous documents
        Object.values(documentTiers).forEach(tierDiv => tierDiv.innerHTML = '');

        data.opportunities.forEach(doc => {
            const docOption = document.createElement('div');
            docOption.className = 'document-option';
            docOption.dataset.id = doc.id;
            docOption.innerHTML = `
                <div class="checkbox"></div>
                <div class="document-title">${doc.title}</div>
                <div class="document-details">${doc.purpose}</div>
                <div class="document-meta">
                    <span>Audience: ${doc.audience}</span>
                    <span>Confidence: ${(doc.confidence_score * 100).toFixed(0)}%</span>
                </div>
            `;
            docOption.addEventListener('click', () => this.toggleDocumentSelection(doc.id));
            documentTiers[doc.tier.toLowerCase()].appendChild(docOption);
        });

        this.updateGenerateButtonState();
    }

    toggleDocumentSelection(docId) {
        const index = this.selectedDocuments.indexOf(docId);
        const docOption = document.querySelector(`[data-id="${docId}"]`);

        if (index > -1) {
            this.selectedDocuments.splice(index, 1);
            docOption.classList.remove('selected');
        } else {
            this.selectedDocuments.push(docId);
            docOption.classList.add('selected');
        }
        this.updateGenerateButtonState();
    }

    selectAllRecommendedDocuments() {
        this.selectedDocuments = [];
        document.querySelectorAll('.document-option').forEach(docOption => {
            const docId = docOption.dataset.id;
            this.selectedDocuments.push(docId);
            docOption.classList.add('selected');
        });
        this.updateGenerateButtonState();
    }

    updateGenerateButtonState() {
        this.generateDocumentsBtn.disabled = this.selectedDocuments.length === 0;
    }

    async generateSelectedDocuments() {
        if (this.selectedDocuments.length === 0) {
            alert('Please select at least one document to generate.');
            return;
        }

        try {
            const response = await fetch(`/api/generate-documents/${this.currentProcessId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ selectedDocuments: this.selectedDocuments })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start document generation');
            }
            console.log('Document generation initiated.');
        } catch (error) {
            console.error('Error initiating document generation:', error);
            this.showError(`Document generation failed: ${error.message}`);
        }
    }

    startDocumentGeneration(data) {
        this.hideAllSections();
        this.showSection(this.documentLaboratorySection);
        this.documentOpportunities.style.display = 'none';
        this.documentGenerationProgress.style.display = 'block';
        this.documentResults.style.display = 'none';

        document.getElementById('total-documents').textContent = data.documentCount;
        document.getElementById('documents-generated').textContent = '0';
        document.getElementById('generation-progress-fill').style.width = '0%';
        document.getElementById('current-document-title').textContent = 'Initializing...';
    }

    updateDocumentGenerationProgress(data) {
        const total = parseInt(document.getElementById('total-documents').textContent);
        const generated = parseInt(document.getElementById('documents-generated').textContent);

        if (data.status === 'completed') {
            document.getElementById('documents-generated').textContent = generated + 1;
        }

        const currentGenerated = parseInt(document.getElementById('documents-generated').textContent);
        const percentage = (currentGenerated / total) * 100;
        document.getElementById('generation-progress-fill').style.width = `${percentage}%`;
        document.getElementById('current-document-title').textContent = `Generating: ${data.title || '...'}`;
    }

    completeDocumentGeneration(data) {
        this.hideAllSections();
        this.showSection(this.documentLaboratorySection);
        this.documentOpportunities.style.display = 'none';
        this.documentGenerationProgress.style.display = 'none';
        this.documentResults.style.display = 'block';

        const generatedDocumentsList = document.getElementById('generated-documents-list');
        generatedDocumentsList.innerHTML = '';

        data.documentsGenerated.forEach(doc => {
            const docCard = document.createElement('div');
            docCard.className = 'generated-document-card';
            docCard.innerHTML = `
                <div class="document-title">${doc.title}</div>
                <div class="document-meta">
                    <span>File: ${doc.fileName}</span>
                    <span>Words: ${doc.wordCount}</span>
                </div>
            `;
            generatedDocumentsList.appendChild(docCard);
        });

        this.enhancedDownloadBtn.href = `/api/download/${this.currentProcessId}`;
    }

    documentGenerationError(error) {
        this.showError(`Document generation failed: ${error}`);
    }

    // OAuth2 Authentication Methods
    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/status');
            const authStatus = await response.json();

            this.updateAuthUI(authStatus);

            // Check for auth callback parameters
            this.handleAuthCallback();

        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showAuthError('Failed to check authentication status');
        }
    }

    updateAuthUI(authStatus) {
        // Hide loading state
        this.authStatus.style.display = 'none';

        if (authStatus.authenticated) {
            // Show authenticated state
            this.authUnauthenticated.style.display = 'none';
            this.authAuthenticated.style.display = 'block';

            // Update user info
            this.authUserInfo.innerHTML = `
                <div class="user-detail">
                    <span class="user-label">Status:</span>
                    <span>✅ Connected to YouTube</span>
                </div>
                ${authStatus.channelTitle ? `
                <div class="user-detail">
                    <span class="user-label">Channel:</span>
                    <span>${authStatus.channelTitle}</span>
                </div>
                ` : ''}
                <div class="user-detail">
                    <span class="user-label">Token expires:</span>
                    <span>${authStatus.expiresAt ? new Date(authStatus.expiresAt).toLocaleString() : 'Unknown'}</span>
                </div>
            `;
        } else {
            // Show unauthenticated state
            this.authUnauthenticated.style.display = 'block';
            this.authAuthenticated.style.display = 'none';
        }
    }

    handleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const authResult = urlParams.get('auth');
        const message = urlParams.get('message');

        if (authResult === 'success') {
            this.showAuthSuccess('Successfully authenticated with Google! You can now process real YouTube videos.');
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refresh auth status
            setTimeout(() => this.checkAuthStatus(), 1000);
        } else if (authResult === 'error') {
            this.showAuthError(`Authentication failed: ${message || 'Unknown error'}`);
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async handleLogin() {
        try {
            // Disable login button
            this.loginBtn.disabled = true;
            this.loginBtn.innerHTML = '<div class="bio-loading-pulse"></div> Redirecting to Google...';

            // Redirect to OAuth2 flow
            window.location.href = '/auth/google';

        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError('Failed to initiate login');
            this.loginBtn.disabled = false;
            this.loginBtn.innerHTML = '<span class="button-icon">🚀</span> Authenticate with Google';
        }
    }

    async handleLogout() {
        try {
            // Disable logout button
            this.logoutBtn.disabled = true;
            this.logoutBtn.textContent = 'Logging out...';

            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showAuthSuccess('Successfully logged out');
                // Refresh auth status
                setTimeout(() => this.checkAuthStatus(), 500);
            } else {
                throw new Error('Logout failed');
            }

        } catch (error) {
            console.error('Logout error:', error);
            this.showAuthError('Failed to logout');
        } finally {
            this.logoutBtn.disabled = false;
            this.logoutBtn.textContent = 'Logout';
        }
    }

    showAuthSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'auth-message auth-success';
        successDiv.innerHTML = `
            <div style="background: rgba(32, 178, 170, 0.1); border: 1px solid rgba(32, 178, 170, 0.3); 
                        border-radius: 8px; padding: 12px; margin: 16px 0; color: rgba(32, 178, 170, 0.95);">
                ✅ ${message}
            </div>
        `;

        const authSection = document.getElementById('auth-section');
        authSection.appendChild(successDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }

    showAuthError(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-message auth-error';
        errorDiv.innerHTML = `
            <div style="background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.3); 
                        border-radius: 8px; padding: 12px; margin: 16px 0; color: rgba(255, 107, 107, 0.95);">
                ❌ ${message}
            </div>
        `;

        const authSection = document.getElementById('auth-section');
        authSection.appendChild(errorDiv);

        // Remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 8000);
    }

    // Utility methods for Fabric Studio
    hideAllSections() {
        const sections = [
            this.statusSection,
            this.progressSection,
            this.resultsSection,
            this.documentLaboratorySection,
            this.errorSection
        ];

        sections.forEach(section => {
            if (section) {
                section.style.display = 'none';
                section.classList.add('hidden');
            }
        });
    }

    showSection(section) {
        if (section) {
            section.style.display = 'block';
            section.classList.remove('hidden');
        }
    }

    updateStatusBadge(status, message) {
        if (this.statusBadge) {
            this.statusBadge.textContent = message;
            this.statusBadge.className = `status-badge ${status}`;
        }
    }

    showError(message) {
        this.isProcessing = false;
        if (this.processBtn) {
            this.processBtn.disabled = false;
            this.processBtn.textContent = 'Begin Deep Analysis';
        }

        this.hideAllSections();
        if (this.errorSection && this.errorMessage) {
            this.showSection(this.errorSection);
            this.errorMessage.textContent = message;
        } else {
            // Fallback to alert if error section not available
            alert('Error: ' + message);
        }

        // Close WebSocket if open
        if (this.ws) {
            this.ws.close();
        }
    }

    resetInterface() {
        this.isProcessing = false;
        this.currentProcessId = null;

        if (this.processBtn) {
            this.processBtn.disabled = false;
        }

        this.hideAllSections();
        this.validateInput(); // Re-validate current input

        // Close WebSocket if open
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FabricStudio();
});
/**
 * OAuth2 Configuration for YouTube Data API v3 Access
 * 
 * This module handles OAuth2 authentication flow for accessing YouTube transcripts
 * via the official YouTube Data API v3, bypassing bot detection issues.
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

class OAuth2Manager {
    constructor() {
        // OAuth2 configuration
        this.oauth2Client = null;
        this.credentials = null;
        this.tokenPath = path.join(__dirname, 'oauth2-tokens.json');
        
        // Required scopes for YouTube Data API access
        this.scopes = [
            'https://www.googleapis.com/auth/youtube.readonly'
        ];
        
        this.initializeOAuth2Client();
    }

    /**
     * Initialize OAuth2 client with credentials from environment or file
     */
    async initializeOAuth2Client() {
        try {
            // Try to load from environment variables first (for Railway deployment)
            if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
                this.credentials = {
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uris: [
                        process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
                        'https://youtube-fabric-processor-production.up.railway.app/auth/google/callback'
                    ]
                };
            } else {
                // Fallback to credentials file for local development
                const credentialsPath = path.join(__dirname, 'google-credentials.json');
                try {
                    const credentialsFile = await fs.readFile(credentialsPath, 'utf8');
                    const credentials = JSON.parse(credentialsFile);
                    this.credentials = credentials.web || credentials.installed;
                } catch (err) {
                    console.error('No OAuth2 credentials found. Please set up Google Cloud credentials.');
                    return;
                }
            }

            // Create OAuth2 client
            this.oauth2Client = new google.auth.OAuth2(
                this.credentials.client_id,
                this.credentials.client_secret,
                this.credentials.redirect_uris[0]
            );

            // Try to load existing tokens
            await this.loadTokens();

        } catch (error) {
            console.error('Failed to initialize OAuth2 client:', error.message);
        }
    }

    /**
     * Generate authorization URL for user authentication
     */
    getAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes,
            prompt: 'consent' // Force consent screen to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code) {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        try {
            // Use getToken instead of getAccessToken for authorization code exchange
            const { tokens } = await this.oauth2Client.getToken(code);
            console.log('OAuth2 tokens received:', tokens);
            
            if (!tokens) {
                throw new Error('No tokens received from OAuth2 response');
            }
            
            // Set tokens on the client
            this.oauth2Client.setCredentials(tokens);
            
            // Save tokens to file
            await this.saveTokens(tokens);
            
            return tokens;
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            throw error;
        }
    }

    /**
     * Load existing tokens from file
     */
    async loadTokens() {
        try {
            const tokensFile = await fs.readFile(this.tokenPath, 'utf8');
            const tokens = JSON.parse(tokensFile);
            
            // Set tokens on the client
            this.oauth2Client.setCredentials(tokens);
            
            // Check if tokens need refresh
            if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
                await this.refreshTokens();
            }
            
            return tokens;
        } catch (error) {
            // No existing tokens found
            return null;
        }
    }

    /**
     * Save tokens to file
     */
    async saveTokens(tokens) {
        try {
            await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
            console.log('OAuth2 tokens saved successfully');
        } catch (error) {
            console.error('Failed to save OAuth2 tokens:', error);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshTokens() {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            await this.saveTokens(credentials);
            return credentials;
        } catch (error) {
            console.error('Failed to refresh tokens:', error);
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (!this.oauth2Client) return false;
        
        const credentials = this.oauth2Client.credentials;
        return credentials && credentials.access_token;
    }

    /**
     * Get authenticated YouTube API client
     */
    getYouTubeClient() {
        if (!this.isAuthenticated()) {
            throw new Error('User not authenticated. Please log in first.');
        }

        return google.youtube({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * Revoke tokens and clear authentication
     */
    async logout() {
        if (this.oauth2Client && this.oauth2Client.credentials.access_token) {
            try {
                await this.oauth2Client.revokeCredentials();
            } catch (error) {
                console.error('Error revoking credentials:', error);
            }
        }

        // Clear tokens
        this.oauth2Client.setCredentials({});
        
        // Delete token file
        try {
            await fs.unlink(this.tokenPath);
        } catch (error) {
            // File doesn't exist, ignore
        }
    }

    /**
     * Get user authentication status and info
     */
    async getAuthStatus() {
        if (!this.isAuthenticated()) {
            return { authenticated: false };
        }

        try {
            const youtube = this.getYouTubeClient();
            
            // Get channel info to verify authentication works
            const response = await youtube.channels.list({
                part: 'snippet',
                mine: true
            });

            return {
                authenticated: true,
                hasRefreshToken: !!this.oauth2Client.credentials.refresh_token,
                expiresAt: this.oauth2Client.credentials.expiry_date,
                channelTitle: response.data.items?.[0]?.snippet?.title || 'Unknown'
            };
        } catch (error) {
            console.error('Error getting auth status:', error);
            return { authenticated: false, error: error.message };
        }
    }
}

// Singleton instance
const oauth2Manager = new OAuth2Manager();

module.exports = oauth2Manager;
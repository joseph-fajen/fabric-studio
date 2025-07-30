/**
 * OAuth2 Authentication Routes
 * 
 * Handles Google OAuth2 authentication flow for YouTube Data API access
 */

const express = require('express');
const oauth2Manager = require('./oauth2-config');
const router = express.Router();

/**
 * GET /auth/status
 * Get current authentication status
 */
router.get('/status', async (req, res) => {
    try {
        const authStatus = await oauth2Manager.getAuthStatus();
        res.json(authStatus);
    } catch (error) {
        console.error('Error getting auth status:', error);
        res.status(500).json({ 
            authenticated: false, 
            error: error.message 
        });
    }
});

/**
 * GET /auth/google
 * Initiate Google OAuth2 authentication flow
 */
router.get('/google', (req, res) => {
    try {
        const authUrl = oauth2Manager.getAuthUrl();
        
        // For API calls, return the URL
        if (req.headers.accept?.includes('application/json')) {
            res.json({ authUrl });
        } else {
            // For browser requests, redirect directly
            res.redirect(authUrl);
        }
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /auth/google/callback
 * Handle Google OAuth2 callback
 */
router.get('/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.error('OAuth2 error:', error);
        return res.redirect('/?auth=error&message=' + encodeURIComponent(error));
    }

    if (!code) {
        return res.redirect('/?auth=error&message=' + encodeURIComponent('No authorization code received'));
    }

    try {
        // Exchange code for tokens
        const tokens = await oauth2Manager.getTokensFromCode(code);
        
        console.log('OAuth2 authentication successful');
        
        // Redirect to main page with success message
        res.redirect('/?auth=success');
        
    } catch (error) {
        console.error('Error in OAuth2 callback:', error);
        res.redirect('/?auth=error&message=' + encodeURIComponent(error.message));
    }
});

/**
 * POST /auth/logout
 * Logout and revoke tokens
 */
router.post('/logout', async (req, res) => {
    try {
        await oauth2Manager.logout();
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /auth/test
 * Test YouTube API access (requires authentication)
 */
router.get('/test', async (req, res) => {
    try {
        if (!oauth2Manager.isAuthenticated()) {
            return res.status(401).json({ 
                error: 'Not authenticated', 
                authUrl: oauth2Manager.getAuthUrl() 
            });
        }

        const youtube = oauth2Manager.getYouTubeClient();
        
        // Test API access by getting user's channel info
        const response = await youtube.channels.list({
            part: 'snippet,statistics',
            mine: true
        });

        const channel = response.data.items?.[0];
        
        if (channel) {
            res.json({
                success: true,
                message: 'YouTube API access working',
                channel: {
                    title: channel.snippet.title,
                    subscriberCount: channel.statistics.subscriberCount,
                    videoCount: channel.statistics.videoCount
                }
            });
        } else {
            res.json({
                success: true,
                message: 'API access working, but no channel found'
            });
        }

    } catch (error) {
        console.error('Error testing YouTube API:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
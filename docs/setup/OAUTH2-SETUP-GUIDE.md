# OAuth2 Setup Guide for YouTube Fabric Processor

This guide will walk you through setting up Google OAuth2 authentication to enable real YouTube transcript access.

## Step 1: Google Cloud Console Setup

### 1.1 Create/Access Google Cloud Project

1. **Go to**: https://console.cloud.google.com/
2. **Select or Create Project**:
   - If you have existing project: Select it from dropdown
   - If creating new: Click "New Project" → Name it "YouTube Fabric Processor"

### 1.2 Enable YouTube Data API v3

1. **Navigate to**: APIs & Services → Library
2. **Search for**: "YouTube Data API v3"
3. **Click** on the result and press **"ENABLE"**

### 1.3 Configure OAuth Consent Screen

1. **Go to**: APIs & Services → OAuth consent screen
2. **Choose**: External (for public use) or Internal (for organization use)
3. **Fill out required fields**:
   - **App name**: YouTube Fabric Processor
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **App domain** (optional): Your domain
   - **Authorized domains**: Add your Railway domain and localhost
     - `localhost` (for local development)
     - `carefree-mindfulness-production.up.railway.app` (or your Railway domain)

4. **Scopes**: Add the following scope:
   - `https://www.googleapis.com/auth/youtube.readonly`

5. **Test Users** (if in testing mode):
   - Add your Google account email
   - Add any other users who need access

### 1.4 Create OAuth2 Credentials

1. **Go to**: APIs & Services → Credentials
2. **Click**: "CREATE CREDENTIALS" → "OAuth client ID"
3. **Application type**: Web application
4. **Name**: YouTube Fabric Processor
5. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/google/callback` (for local development)
   - `https://carefree-mindfulness-production.up.railway.app/auth/google/callback` (for production)

6. **Save** and copy the Client ID and Client Secret

## Step 2: Local Development Setup

### 2.1 Create Credentials File (Optional)

For local development, you can create a credentials file:

```bash
# Create google-credentials.json in project root
{
  "web": {
    "client_id": "your-client-id-here.apps.googleusercontent.com",
    "client_secret": "your-client-secret-here",
    "redirect_uris": [
      "http://localhost:3000/auth/google/callback",
      "https://carefree-mindfulness-production.up.railway.app/auth/google/callback"
    ]
  }
}
```

### 2.2 Environment Variables (Recommended)

Set these environment variables locally:

```bash
export GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret-here"
export OAUTH2_REDIRECT_URI="http://localhost:3000/auth/google/callback"
```

## Step 3: Railway Deployment Setup

### 3.1 Set Environment Variables in Railway

1. **Go to**: Your Railway project dashboard
2. **Navigate to**: Variables tab
3. **Add** the following variables:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth2 client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth2 client secret
   - `OAUTH2_REDIRECT_URI`: `https://your-railway-domain.up.railway.app/auth/google/callback`

### 3.2 Update Redirect URIs

Make sure your Google Cloud Console OAuth2 credentials include your Railway domain in the redirect URIs.

## Step 4: Testing the Setup

### 4.1 Local Testing

1. **Start the server**: `npm start`
2. **Visit**: http://localhost:3000
3. **Check**: Authentication section should appear
4. **Click**: "Authenticate with Google"
5. **Complete**: OAuth2 flow
6. **Verify**: You're logged in and can see your YouTube channel info

### 4.2 Production Testing

1. **Visit**: Your Railway deployment URL
2. **Follow**: Same testing steps as local
3. **Test**: Process a real YouTube video

## Step 5: Troubleshooting

### Common Issues

#### "Access blocked" Error
- **Cause**: App is in testing mode and user not added to test users
- **Solution**: Add user to test users or publish the app

#### "redirect_uri_mismatch" Error
- **Cause**: Redirect URI doesn't match configured URIs
- **Solution**: Verify redirect URIs in Google Cloud Console match exactly

#### "invalid_client" Error
- **Cause**: Client ID or secret incorrect
- **Solution**: Double-check environment variables

#### "insufficient_scope" Error
- **Cause**: Missing YouTube readonly scope
- **Solution**: Add `https://www.googleapis.com/auth/youtube.readonly` scope

### Environment Variable Check

You can test if environment variables are set correctly:

```bash
# Test API endpoints
curl http://localhost:3000/auth/status
curl http://localhost:3000/auth/test
```

## Step 6: Publishing Your App (Optional)

For production use with external users:

1. **Go to**: OAuth consent screen
2. **Click**: "PUBLISH APP"
3. **Complete**: Google's verification process (may take days/weeks)
4. **Update**: Privacy policy and terms of service URLs if required

## Security Notes

- Never commit `google-credentials.json` to git
- Add `google-credentials.json` to `.gitignore`
- Use environment variables for production
- Regularly rotate client secrets
- Monitor OAuth2 usage in Google Cloud Console

## Success Indicators

✅ **OAuth2 Setup Complete When**:
- Authentication section appears on website
- Login button redirects to Google
- After Google login, you return to app successfully
- User info displays (channel name, token expiry)
- Real YouTube videos can be processed (not simulation mode)
- Transcript downloads work without bot detection

## Next Steps

Once OAuth2 is working:
1. Test with various YouTube videos
2. Verify all 13 fabric patterns process real content
3. Monitor usage in Google Cloud Console
4. Consider increasing API quotas if needed

---

**Need Help?** Check the console logs and Network tab in browser developer tools for detailed error messages.
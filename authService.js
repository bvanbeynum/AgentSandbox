import express from 'express';
import { config } from './config.js';

const app = express();
const port = 9201;

// Configuration from config.js (googleOauth: { client_id, client_secret, ... })
const CLIENT_ID = config.googleOauth.client_id;
const CLIENT_SECRET = config.googleOauth.client_secret;
const REDIRECT_URI = 'https://dev.beynum.com/auth/callback';

// Route for the login page
app.get('/auth', (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=openid%20email%20profile&` +
        `access_type=offline&` +
        `prompt=consent`;

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login - The Beynum Company</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f7; }
                .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
                h1 { color: #1d1d1f; margin-bottom: 1.5rem; font-size: 1.5rem; }
                .login-btn { display: inline-block; background-color: #0071e3; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background-color 0.2s; }
                .login-btn:hover { background-color: #0077ed; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>The Beynum Company</h1>
                <p>Sign in to your account to continue.</p>
                <a href="${googleAuthUrl}" class="login-btn">Login with Google</a>
            </div>
        </body>
        </html>
    `);
});

// Route for the OAuth callback
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Authorization code missing');
    }

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).send(`Error from Google: ${data.error_description || data.error}`);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Success - Authentication</title>
                <style>
                    body { font-family: monospace; padding: 2rem; background-color: #1c1c1e; color: #32d74b; line-height: 1.5; }
                    .container { max-width: 800px; margin: 0 auto; background: #2c2c2e; padding: 1.5rem; border-radius: 8px; border: 1px solid #3a3a3c; word-break: break-all; }
                    h2 { color: #fff; margin-top: 0; }
                    .token-box { background: #000; padding: 1rem; border-radius: 4px; margin-top: 1rem; color: #ff375f; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Authentication Successful</h2>
                    <p>Access Token retrieved:</p>
                    <div class="token-box">${data.access_token}</div>
                    <p style="color: #8e8e93; margin-top: 1rem;">Expires in: ${data.expires_in} seconds</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Auth Service listening on port ${port}`);
});

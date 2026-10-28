const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3100);
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1563642497433866250';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://scaling-space-eureka-97976x7jgw5gfxqrw-3000.app.github.dev/';
const COOKIE_SECURE = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const sessions = new Map();
const oauthStates = new Map();
const htmlPath = path.join(__dirname, 'test.html');

function sendJson(response, statusCode, data, headers = {}) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...headers,
    });
    response.end(data === null ? '' : JSON.stringify(data));
}

function sendText(response, statusCode, text) {
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    response.end(text);
}

function getCookies(request) {
    return Object.fromEntries((request.headers.cookie || '')
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
            const separator = value.indexOf('=');
            return [value.slice(0, separator), decodeURIComponent(value.slice(separator + 1))];
        }));
}

function cookie(name, value, maxAge) {
    return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${COOKIE_SECURE}`;
}

function getSession(request) {
    const sessionId = getCookies(request).discord_session;
    const session = sessionId && sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
        if (sessionId) sessions.delete(sessionId);
        return null;
    }
    return session;
}

function avatarUrl(user) {
    if (!user.avatar) return null;
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=256`;
}

async function handleRequest(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && (requestUrl.pathname === '/' || requestUrl.pathname === '/test.html')) {
        response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
        });
        fs.createReadStream(htmlPath).pipe(response);
        return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/login') {
        if (!CLIENT_SECRET) {
            sendText(response, 503, 'Set DISCORD_CLIENT_SECRET on the server before signing in.');
            return;
        }
        for (const [state, expiresAt] of oauthStates) {
            if (expiresAt <= Date.now()) oauthStates.delete(state);
        }
        const state = crypto.randomBytes(32).toString('hex');
        oauthStates.set(state, Date.now() + 5 * 60 * 1000);
        const authorizeUrl = new URL('https://discord.com/oauth2/authorize');
        authorizeUrl.search = new URLSearchParams({
            client_id: CLIENT_ID,
            response_type: 'code',
            redirect_uri: REDIRECT_URI,
            scope: 'identify+connections+guilds+guilds.members.read',
            state,
        }).toString();
        response.writeHead(302, {
            Location: authorizeUrl.toString(),
            'Set-Cookie': cookie('discord_oauth_state', state, 300),
            'Cache-Control': 'no-store',
        });
        response.end();
        return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/callback') {
        const state = requestUrl.searchParams.get('state');
        const cookies = getCookies(request);
        const stateExpiresAt = state && oauthStates.get(state);
        oauthStates.delete(state);
        if (!state || cookies.discord_oauth_state !== state || !stateExpiresAt || stateExpiresAt <= Date.now()) {
            sendText(response, 400, 'Discord sign-in could not be verified. Please try again.');
            return;
        }
        if (requestUrl.searchParams.has('error')) {
            sendText(response, 400, 'Discord sign-in was cancelled or denied.');
            return;
        }

        const code = requestUrl.searchParams.get('code');
        if (!code) {
            sendText(response, 400, 'Discord did not return an authorization code.');
            return;
        }

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
            signal: AbortSignal.timeout(10000),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Discord token exchange failed:', tokenData.error_description || tokenData.error || tokenResponse.status);
            sendText(response, 502, 'Discord sign-in failed while exchanging the authorization code. Check the client secret and redirect URI.');
            return;
        }

        const profileResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
            signal: AbortSignal.timeout(10000),
        });
        const profile = await profileResponse.json();
        if (!profileResponse.ok || !profile.id) {
            console.error('Discord profile request failed:', profile.message || profileResponse.status);
            sendText(response, 502, 'Discord sign-in succeeded, but the profile could not be retrieved.');
            return;
        }

        const sessionId = crypto.randomBytes(32).toString('hex');
        const maxAge = Math.max(0, Number(tokenData.expires_in) || 0);
        sessions.set(sessionId, {
            expiresAt: Date.now() + maxAge * 1000,
            profile: {
                id: profile.id,
                username: profile.username,
                globalName: profile.global_name || null,
                avatarUrl: avatarUrl(profile),
            },
        });
        response.writeHead(302, {
            Location: '/',
            'Set-Cookie': [
                cookie('discord_session', sessionId, maxAge),
                cookie('discord_oauth_state', '', 0),
            ],
            'Cache-Control': 'no-store',
        });
        response.end();
        return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/me') {
        const session = getSession(request);
        if (!session) {
            sendJson(response, 401, { error: 'Not signed in.' });
            return;
        }
        sendJson(response, 200, session.profile);
        return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/presence') {
        const session = getSession(request);
        if (!session) {
            sendJson(response, 401, { error: 'Sign in to load Discord presence.' });
            return;
        }
        const presenceResponse = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(session.profile.id)}`, {
            signal: AbortSignal.timeout(8000),
        });
        const presenceData = await presenceResponse.json();
        if (!presenceResponse.ok || !presenceData.success || !presenceData.data) {
            sendJson(response, 502, { error: 'Live presence is unavailable. The account may not be sharing presence through Lanyard.' });
            return;
        }
        const presence = presenceData.data;
        const activities = (presence.activities || []).map((activity) => ({
            name: activity.name,
            details: activity.details || null,
            state: activity.state || null,
        }));
        if (presence.listening_to_spotify && presence.spotify) {
            activities.unshift({
                name: 'Listening to Spotify',
                details: presence.spotify.song,
                state: `by ${presence.spotify.artist}`,
            });
        }
        sendJson(response, 200, {
            status: presence.discord_status,
            activities,
        });
        return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/logout') {
        const sessionId = getCookies(request).discord_session;
        if (sessionId) sessions.delete(sessionId);
        sendJson(response, 204, null, {
            'Set-Cookie': cookie('discord_session', '', 0),
        });
        return;
    }

    sendText(response, 404, 'Not found.');
}

http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
        console.error('Request failed:', error);
        if (!response.headersSent) {
            sendJson(response, 502, { error: 'The request could not be completed. Check the server logs.' });
        } else {
            response.destroy(error);
        }
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log(`MyBio local server listening on http://localhost:${PORT}`);
});

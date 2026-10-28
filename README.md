# [My Bio - Please Click Here!](https//:www.gamingwitheasa.github.io/MyBio)

## Local Discord profile and presence test

The Discord card in `test.html` uses a small Node.js server for OAuth. The client secret and access token stay on that server; do not put either in browser code or commit them.

1. In the Discord Developer Portal, add `http://localhost:3000/callback` as an OAuth2 redirect URI.
2. Copy `.env.example` to `.env` and set `DISCORD_CLIENT_SECRET` to the app's client secret.
3. Start the server with Node.js 20.6 or newer:

   ```sh
   node --env-file=.env server.js
   ```

4. Open `http://localhost:3000` and sign in with Discord.

OAuth `identify` provides the signed-in user's username and avatar. Current activity is loaded separately from Lanyard; the account must be visible to Lanyard for this part to work. Presence refreshes every 30 seconds.

For production, deploy `server.js` to a Node.js host that supports HTTPS and configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, and `PORT` as server environment variables. Register the production HTTPS callback URL in the Discord Developer Portal and set `DISCORD_REDIRECT_URI` to that exact URL. Static hosting alone cannot run this OAuth callback or keep the client secret private.
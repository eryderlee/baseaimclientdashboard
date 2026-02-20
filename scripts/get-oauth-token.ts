/**
 * One-time script to obtain a Google OAuth2 refresh token.
 *
 * Usage:
 *   1. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env
 *   2. npx tsx scripts/get-oauth-token.ts
 *   3. Open the printed URL in your browser and authorize
 *   4. Copy the printed GOOGLE_OAUTH_REFRESH_TOKEN into .env
 */

import 'dotenv/config'
import { OAuth2Client } from 'google-auth-library'
import * as http from 'http'
import * as url from 'url'

const PORT = 4242
const REDIRECT_URI = `http://localhost:${PORT}`

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error(
    'ERROR: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env'
  )
  process.exit(1)
}

const client = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI })

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces refresh_token to be returned every time
  scope: ['https://www.googleapis.com/auth/drive'],
})

console.log('\n=== Google OAuth2 Token Generator ===\n')
console.log('Open this URL in your browser:\n')
console.log(authUrl)
console.log('\nWaiting for authorization on port', PORT, '...\n')

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url ?? '', true)
  const code = parsed.query.code as string | undefined

  if (!code) {
    res.writeHead(400)
    res.end('Missing authorization code.')
    return
  }

  try {
    const { tokens } = await client.getToken(code)

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(
      '<html><body><h2>Authorization complete!</h2><p>You can close this tab and return to the terminal.</p></body></html>'
    )

    console.log('\n✓ Authorization successful!\n')
    console.log('Add this line to your .env file:\n')
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`)
  } catch (err) {
    res.writeHead(500)
    res.end('Token exchange failed.')
    console.error('Token exchange error:', err)
  } finally {
    server.close()
  }
})

server.listen(PORT)

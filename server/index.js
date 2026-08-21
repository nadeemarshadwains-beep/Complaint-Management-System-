// Simple Express proxy for sending SMS via Twilio, Vonage, or a custom gateway
// Usage: set environment variables (see .env.example) and run `node server/index.js`

const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

function requireSecretAuth(req, res, next) {
  // Optional: simple shared-secret header to avoid open proxy
  const secret = process.env.PROXY_SECRET;
  if (!secret) return next(); // if not configured, allow for local dev convenience
  const header = req.get('x-proxy-secret');
  if (header === secret) return next();
  res.status(401).json({ error: 'Unauthorized (invalid proxy secret)' });
}

app.post('/api/send', requireSecretAuth, async (req, res) => {
  // payload: { provider, to, message, from? }
  try {
    const { provider, to, message, from } = req.body;
    if (!provider || !to || !message) return res.status(400).json({ error: 'provider, to and message are required' });

    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = from || process.env.TWILIO_FROM;
      if (!accountSid || !authToken || !twilioFrom) return res.status(500).json({ error: 'Twilio not configured on server' });

      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', twilioFrom);
      params.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        body: params,
        headers: { 'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64') }
      });

      const json = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: json });
      return res.json({ success: true, provider: 'twilio', result: json });

    } else if (provider === 'vonage' || provider === 'nexmo') {
      const apiKey = process.env.VONAGE_API_KEY;
      const apiSecret = process.env.VONAGE_API_SECRET;
      const vonageFrom = from || process.env.VONAGE_FROM;
      if (!apiKey || !apiSecret || !vonageFrom) return res.status(500).json({ error: 'Vonage not configured on server' });

      const url = 'https://rest.nexmo.com/sms/json';
      const params = new URLSearchParams();
      params.append('api_key', apiKey);
      params.append('api_secret', apiSecret);
      params.append('to', to.replace(/^\+/, ''));
      params.append('from', vonageFrom);
      params.append('text', message);

      const response = await fetch(url, { method: 'POST', body: params });
      const json = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: json });
      return res.json({ success: true, provider: 'vonage', result: json });

    } else if (provider === 'custom') {
      // forward to a custom gateway URL specified in env
      const customUrl = process.env.CUSTOM_GATEWAY_URL;
      const customKey = process.env.CUSTOM_GATEWAY_KEY;
      if (!customUrl) return res.status(500).json({ error: 'Custom gateway URL not configured on server' });

      const payload = { to, message, from };
      const headers = { 'Content-Type': 'application/json' };
      if (customKey) headers['Authorization'] = 'Bearer ' + customKey;

      const response = await fetch(customUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
      const json = await response.json().catch(() => null);
      if (!response.ok) return res.status(response.status).json({ error: json || 'Gateway error' });
      return res.json({ success: true, provider: 'custom', result: json });

    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }
  } catch (err) {
    console.error('Proxy /api/send error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`SMS proxy listening on http://localhost:${PORT}`);
});

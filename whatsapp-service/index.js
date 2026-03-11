/**
 * PINTAR.ai — WhatsApp Native Microservice (Stealth-Passive)
 * 
 * Runs whatsapp-web.js with puppeteer-extra-plugin-stealth to avoid
 * WhatsApp's anti-bot detection. Uses a minimal-footprint approach:
 * - No msg.getChat() calls (string-based group detection)
 * - Random 2-5 second delays before processing
 * - Auto-reconnect with exponential backoff
 * - Stealth Puppeteer to mask headless fingerprints
 * 
 * Communicates with:
 * - Frontend (Next.js :3000) via Socket.io → sends QR codes & status
 * - Backend (FastAPI :8000) via HTTP POST → sends extracted transactions
 */

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');

// ─── Stealth Puppeteer Setup ────────────────────────────────
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ─── Configuration ──────────────────────────────────────────
const PORT = process.env.WA_SERVICE_PORT || 3001;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'pintar-internal-dev';

// Real Chrome user-agent to avoid fingerprinting
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── Active Sessions ────────────────────────────────────────
const sessions = new Map(); // clerkId → { client, status, reconnectAttempts }

// ─── Selective Transaction Filter ───────────────────────────
const TRANSACTION_KEYWORDS = [
    // Payment indicators
    'rm', 'ringgit', 'bayar', 'paid', 'payment', 'transfer', 'bank in',
    'dah bayar', 'received', 'settled', 'duit', 'wang',
    // Order indicators
    'order', 'tempah', 'pesan', 'beli', 'nak', 'want', 'kirim', 'send',
    'hantar', 'pos', 'delivery', 'cod',
    // Quantity/pricing
    'kg', 'unit', 'pcs', 'dozen', 'harga', 'price', 'total', 'bungkus',
    // Invoice/receipt
    'invoice', 'resit', 'receipt', 'bil', 'bill',
    // Complaint indicators
    'rosak', 'broken', 'refund', 'salah', 'wrong', 'problem', 'tak sampai',
    'missing', 'defect', 'return',
    // Product names common in Sarawak MSME trade
    'beras', 'rice', 'lada', 'pepper', 'kain', 'pua kumbu',
];

/**
 * Check if a message is likely a financial transaction.
 */
function isTransactionMessage(messageBody, hasMedia) {
    if (hasMedia) return true;
    if (!messageBody) return false;

    const lowerBody = messageBody.toLowerCase();
    return TRANSACTION_KEYWORDS.some(keyword => lowerBody.includes(keyword));
}

/**
 * Random delay to mimic human-like processing speed.
 * WhatsApp flags instant-response bots.
 */
function humanDelay() {
    const ms = 2000 + Math.random() * 3000; // 2-5 seconds
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay for reconnection.
 */
function reconnectDelay(attempt) {
    const base = 5000; // 5 seconds
    const max = 60000; // 60 seconds
    const delay = Math.min(base * Math.pow(2, attempt), max);
    // Add jitter (±20%) to avoid thundering herd
    return delay + (Math.random() - 0.5) * delay * 0.4;
}

// ─── Create WhatsApp Client with Stealth ─────────────────────
function createClient(clerkId) {
    return new Client({
        authStrategy: new LocalAuth({ clientId: clerkId }),
        puppeteer: {
            headless: false, // Visible browser — much harder for WhatsApp to detect
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                `--user-agent=${CHROME_UA}`,
                '--window-size=1280,800',
            ],
            // Let whatsapp-web.js use its own bundled Chromium
        },
    });
}

// ─── Socket.io Connection Handler ───────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('start_session', ({ clerkId }) => {
        if (!clerkId) {
            socket.emit('session_error', { message: 'Missing clerkId' });
            return;
        }

        console.log(`[Session] Start requested for: ${clerkId}`);

        // Check if session already exists and is connected
        if (sessions.has(clerkId)) {
            const existing = sessions.get(clerkId);
            if (existing.status === 'connected') {
                socket.emit('session_status', { status: 'already_connected' });
                return;
            }
            // If there's a stale session, destroy it before creating new one
            try { existing.client.destroy(); } catch (_) { /* ignore */ }
        }

        initializeSession(clerkId, socket);
    });

    // ─── Disconnect Session ─────────────────────────────────
    socket.on('stop_session', ({ clerkId }) => {
        if (sessions.has(clerkId)) {
            const session = sessions.get(clerkId);
            session.autoReconnect = false; // Prevent auto-reconnect
            try { session.client.destroy(); } catch (_) { /* ignore */ }
            sessions.delete(clerkId);
            console.log(`[Stop] Session destroyed for: ${clerkId}`);
            socket.emit('session_status', { status: 'disconnected' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// ─── Initialize Session ──────────────────────────────────────
function initializeSession(clerkId, socket) {
    const client = createClient(clerkId);

    const sessionData = {
        client,
        status: 'initializing',
        socket,
        reconnectAttempts: 0,
        autoReconnect: true,
    };
    sessions.set(clerkId, sessionData);

    // ─── QR Code Event ──────────────────────────────────
    client.on('qr', (qr) => {
        console.log(`[QR] Generated for: ${clerkId}`);
        sessionData.status = 'waiting_qr';
        socket.emit('qr_code', { qr });
    });

    // ─── Ready Event ────────────────────────────────────
    client.on('ready', () => {
        console.log(`[Ready] ✅ WhatsApp linked for: ${clerkId}`);
        sessionData.status = 'connected';
        sessionData.reconnectAttempts = 0; // Reset backoff on success
        socket.emit('session_status', { status: 'connected' });
    });

    // ─── Authentication Failure ─────────────────────────
    client.on('auth_failure', (msg) => {
        console.error(`[Auth Failure] ${clerkId}: ${msg}`);
        sessionData.status = 'auth_failed';
        socket.emit('session_error', { message: 'Authentication failed. Please try again.' });
    });

    // ─── Disconnected — Auto-Reconnect ──────────────────
    client.on('disconnected', (reason) => {
        console.log(`[Disconnected] ${clerkId}: ${reason}`);
        sessionData.status = 'disconnected';
        socket.emit('session_status', { status: 'disconnected', reason });

        // Auto-reconnect with exponential backoff
        if (sessionData.autoReconnect && sessionData.reconnectAttempts < 5) {
            const delay = reconnectDelay(sessionData.reconnectAttempts);
            sessionData.reconnectAttempts++;
            console.log(
                `[Reconnect] Attempt ${sessionData.reconnectAttempts}/5 ` +
                `for ${clerkId} in ${Math.round(delay / 1000)}s...`
            );
            socket.emit('session_status', {
                status: 'reconnecting',
                attempt: sessionData.reconnectAttempts,
                nextRetryMs: Math.round(delay),
            });

            setTimeout(() => {
                if (!sessionData.autoReconnect) return; // User cancelled
                console.log(`[Reconnect] Re-initializing ${clerkId}...`);
                try { client.destroy(); } catch (_) { /* ignore */ }
                initializeSession(clerkId, socket);
            }, delay);
        } else if (sessionData.reconnectAttempts >= 5) {
            console.log(`[Reconnect] Max attempts reached for ${clerkId}`);
            sessions.delete(clerkId);
            socket.emit('session_status', {
                status: 'disconnected',
                reason: 'Max reconnection attempts reached. Please re-scan QR.',
            });
        }
    });

    // ─── Message Interceptor (Stealth-Passive) ──────────
    client.on('message', async (msg) => {
        try {
            // Skip outgoing messages
            if (msg.fromMe) return;

            // STEALTH: String-based group detection instead of msg.getChat()
            // Group messages have "@g.us" suffix, private chats have "@c.us"
            if (msg.from && msg.from.endsWith('@g.us')) return;

            const hasMedia = msg.hasMedia;
            const messageBody = msg.body || '';

            // Selective filter — only process transaction messages
            if (!isTransactionMessage(messageBody, hasMedia)) {
                // Silent skip — don't even log to minimize footprint
                return;
            }

            // STEALTH: Random human-like delay before processing
            await humanDelay();

            console.log(`[Intercept] Transaction from ${msg.from}: "${messageBody.substring(0, 80)}"`);

            // Download media if present (receipt photo, voice note)
            let mediaBase64 = null;
            let mediaType = null;
            if (hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        mediaBase64 = media.data;
                        mediaType = media.mimetype;
                    }
                } catch (mediaErr) {
                    console.warn(`[Media] Download failed: ${mediaErr.message}`);
                }
            }

            // Forward to FastAPI ingestion endpoint
            await axios.post(`${FASTAPI_URL}/api/internal/ingest-native`, {
                clerk_id: clerkId,
                message_body: messageBody,
                media_base64: mediaBase64,
                media_type: mediaType,
                sender: msg.from,
                timestamp: msg.timestamp,
            }, {
                headers: {
                    'X-Internal-Key': INTERNAL_API_KEY,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });

            console.log(`[Sent] ✅ Transaction forwarded for ${clerkId}`);

            // Notify frontend
            socket.emit('transaction_ingested', {
                sender: msg.from,
                preview: messageBody.substring(0, 60),
                hasMedia,
                timestamp: Date.now(),
            });

        } catch (error) {
            console.error(`[Error] Message processing failed: ${error.message}`);
        }
    });

    // Initialize the client
    console.log(`[Init] Starting WhatsApp client for: ${clerkId} (stealth mode)`);
    client.initialize();
}

// ─── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
    const activeSessions = [];
    for (const [clerkId, session] of sessions) {
        activeSessions.push({
            clerkId,
            status: session.status,
            reconnectAttempts: session.reconnectAttempts,
        });
    }
    res.json({
        service: 'PINTAR.ai WhatsApp Microservice (Stealth)',
        status: 'running',
        activeSessions,
    });
});

// ─── Start Server ───────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`\n🤖 PINTAR.ai WhatsApp Microservice (Stealth-Passive)`);
    console.log(`   Port: ${PORT}`);
    console.log(`   FastAPI: ${FASTAPI_URL}`);
    console.log(`   Mode: Non-headless + stealth plugin`);
    console.log(`   Auto-reconnect: Enabled (max 5 attempts)`);
    console.log(`   Socket.io: Ready for frontend connections\n`);
});

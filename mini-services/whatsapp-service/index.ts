import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

const PORT = 3004
const SESSION_PATH = './.wwebjs_auth'

// WhatsApp Client
let client: Client | null = null
let connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'qr' = 'disconnected'
let qrCodeData: string | null = null
let qrCodeImage: string | null = null  // Base64 image for web display
let lastError: string | null = null

// Message queue for when client is ready
const messageQueue: Array<{
  to: string
  message: string
  resolve: (success: boolean) => void
}> = []

// Initialize WhatsApp Client
function initClient() {
  connectionStatus = 'connecting'
  lastError = null

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: SESSION_PATH
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  })

  client.on('qr', async (qr) => {
    connectionStatus = 'qr'
    qrCodeData = qr
    
    // Generate QR code for terminal
    console.log('\n📱 Scan this QR code with WhatsApp:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    qrcode.generate(qr, { small: true })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Open WhatsApp > Settings > Linked Devices > Link a Device\n')
    
    // Generate QR code as base64 image for web display
    try {
      qrCodeImage = await QRCode.toDataURL(qr, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      console.log('✅ QR code image generated for web display')
    } catch (err) {
      console.error('Failed to generate QR image:', err)
      qrCodeImage = null
    }
  })

  client.on('ready', () => {
    connectionStatus = 'connected'
    qrCodeData = null
    qrCodeImage = null
    console.log('✅ WhatsApp Client is ready!')
    console.log('📱 Connected and ready to send messages!\n')
    
    // Process queued messages
    processQueue()
  })

  client.on('authenticated', () => {
    console.log('🔐 WhatsApp authenticated!')
  })

  client.on('auth_failure', (msg) => {
    connectionStatus = 'disconnected'
    lastError = msg
    console.error('❌ Auth failure:', msg)
  })

  client.on('disconnected', (reason) => {
    connectionStatus = 'disconnected'
    lastError = reason
    qrCodeImage = null
    console.log('⚠️ WhatsApp disconnected:', reason)
    
    // Try to reconnect
    setTimeout(() => {
      console.log('🔄 Attempting to reconnect...')
      initClient()
    }, 5000)
  })

  client.on('message', (message) => {
    console.log('📩 Message received:', message.body)
  })

  client.initialize().catch((err) => {
    console.error('Failed to initialize WhatsApp client:', err)
    connectionStatus = 'disconnected'
    lastError = err.message
  })
}

// Process message queue
async function processQueue() {
  while (messageQueue.length > 0 && client && connectionStatus === 'connected') {
    const item = messageQueue.shift()
    if (item) {
      try {
        await sendMessage(item.to, item.message)
        item.resolve(true)
      } catch {
        item.resolve(false)
      }
    }
  }
}

// Send WhatsApp message
async function sendMessage(to: string, message: string): Promise<boolean> {
  if (!client || connectionStatus !== 'connected') {
    return new Promise((resolve) => {
      messageQueue.push({ to, message, resolve })
    })
  }

  try {
    // Format phone number properly
    let chatId = to.replace(/[^0-9]/g, '')
    
    // Add country code if missing (assume India +91 if 10 digits)
    if (chatId.length === 10) {
      chatId = '91' + chatId
    }
    
    // Add @c.us suffix for WhatsApp
    if (!chatId.includes('@')) {
      chatId = `${chatId}@c.us`
    }

    console.log(`📱 Sending message to: ${chatId}`)
    await client.sendMessage(chatId, message)
    console.log(`✅ Message sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to send message to ${to}:`, error)
    return false
  }
}

// Initialize client on startup
console.log('🚀 WhatsApp Service starting on port', PORT)
initClient()

// HTTP Server for API
Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // GET /status - Get connection status
    if (url.pathname === '/status') {
      return Response.json({
        status: connectionStatus,
        qr: qrCodeData,
        qrImage: qrCodeImage,
        error: lastError,
        connected: connectionStatus === 'connected'
      }, { headers: corsHeaders })
    }

    // GET /qr - Get QR code image for web display
    if (url.pathname === '/qr') {
      return Response.json({
        status: connectionStatus,
        qr: qrCodeData,
        qrImage: qrCodeImage,
        connected: connectionStatus === 'connected'
      }, { headers: corsHeaders })
    }

    // POST /send - Send message
    if (url.pathname === '/send' && req.method === 'POST') {
      try {
        const body = await req.json()
        const { to, message } = body

        if (!to || !message) {
          return Response.json({ 
            success: false, 
            error: 'Phone number and message are required' 
          }, { status: 400, headers: corsHeaders })
        }

        if (connectionStatus !== 'connected') {
          return Response.json({ 
            success: false, 
            error: 'WhatsApp not connected', 
            status: connectionStatus,
            qr: connectionStatus === 'qr' ? qrCodeData : null,
            qrImage: connectionStatus === 'qr' ? qrCodeImage : null
          }, { status: 503, headers: corsHeaders })
        }

        const sent = await sendMessage(to, message)
        
        return Response.json({
          success: sent,
          message: sent ? 'Message sent successfully' : 'Failed to send message'
        }, { headers: corsHeaders })
      } catch (error) {
        return Response.json({ 
          success: false, 
          error: 'Invalid request body' 
        }, { status: 400, headers: corsHeaders })
      }
    }

    // POST /disconnect - Disconnect and reset
    if (url.pathname === '/disconnect' && req.method === 'POST') {
      if (client) {
        await client.destroy()
        client = null
        connectionStatus = 'disconnected'
        qrCodeImage = null
        
        // Clear session
        try {
          fs.rmSync(SESSION_PATH, { recursive: true, force: true })
        } catch {}
        
        // Reinitialize
        setTimeout(initClient, 1000)
      }
      
      return Response.json({ 
        success: true, 
        message: 'Disconnected. Reinitializing...' 
      }, { headers: corsHeaders })
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ 
        status: 'healthy', 
        whatsapp: connectionStatus 
      }, { headers: corsHeaders })
    }

    return Response.json({ 
      service: 'WhatsApp Message Service',
      version: '1.0.0',
      endpoints: ['/status', '/qr', '/send', '/disconnect', '/health']
    }, { headers: corsHeaders })
  }
})

console.log(`📡 API available at http://localhost:${PORT}`)

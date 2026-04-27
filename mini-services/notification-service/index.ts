import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.DATABASE_URL || ''
const PORT = 3002

let client: MongoClient | null = null
let isConnected = false

// Check if MongoDB URI is valid
function isValidMongoUri(uri: string): boolean {
  if (!uri) return false
  return (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) && 
         !uri.includes('<db_password>') && 
         !uri.includes('your_api_key_here')
}

async function connectToDatabase() {
  if (!isValidMongoUri(MONGODB_URI)) {
    console.log('MongoDB: Using local mode (invalid or missing connection string)')
    return null
  }
  
  if (!client) {
    try {
      client = new MongoClient(MONGODB_URI)
      await client.connect()
      isConnected = true
      console.log('MongoDB: Connected successfully')
    } catch (error) {
      console.error('MongoDB connection error:', error)
      return null
    }
  }
  return client.db('gym_management')
}

// Check for expiring memberships and send notifications
async function checkExpiringMemberships() {
  try {
    console.log(`[${new Date().toISOString()}] Checking for expiring memberships...`)
    
    const db = await connectToDatabase()
    
    if (!db) {
      console.log('MongoDB not connected - skipping membership check (configure DATABASE_URL with valid connection string)')
      return
    }
    
    const membersCollection = db.collection('gym_members')
    const logsCollection = db.collection('notification_logs')
    
    // Find members expiring in 3 days or less, who haven't been notified
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    const expiringMembers = await membersCollection.find({
      isActive: true,
      notificationSent: false,
      membershipEnd: {
        $gt: new Date(),
        $lte: threeDaysFromNow
      },
      whatsappNumber: { $exists: true, $ne: null, $ne: '' }
    }).toArray()
    
    console.log(`Found ${expiringMembers.length} members to notify`)
    
    for (const member of expiringMembers) {
      const daysLeft = Math.ceil((new Date(member.membershipEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      const message = `
🏋️ *EKTA47GYM - Membership Expiry Alert*

Dear ${member.name},

Your gym membership is about to expire!

📅 *Plan:* ${member.gymPlan}
⏰ *Days Left:* ${daysLeft} days
📆 *Expiry Date:* ${new Date(member.membershipEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Please renew your membership to continue enjoying our services.

💪 Stay Fit, Stay Healthy!

- EKTA47GYM Team
      `.trim()
      
      // Log the notification
      await logsCollection.insertOne({
        memberId: member._id.toString(),
        memberName: member.name,
        message,
        sentAt: new Date(),
        status: 'sent',
        type: 'whatsapp',
      })
      
      // Mark as notified
      await membersCollection.updateOne(
        { _id: member._id },
        { $set: { notificationSent: true, updatedAt: new Date() } }
      )
      
      console.log(`✓ Notification sent to ${member.name} (${member.whatsappNumber})`)
      
      // Here you would integrate with actual WhatsApp API
      // Example with CallMeBot:
      // const whatsappUrl = `https://api.callmebot.com/whatsapp.php?phone=${member.whatsappNumber}&text=${encodeURIComponent(message)}&apikey=${process.env.WHATSAPP_API_KEY}`
      // await fetch(whatsappUrl)
    }
    
  } catch (error) {
    console.error('Error checking expiring memberships:', error)
  }
}

// Start the notification service
async function startService() {
  console.log(`🚀 Notification Service started on port ${PORT}`)
  console.log('📅 Scheduled to check for expiring memberships every hour')
  
  // Run immediately on start
  await checkExpiringMemberships()
  
  // Schedule to run every hour
  setInterval(checkExpiringMemberships, 60 * 60 * 1000)
  
  // Also create a simple HTTP server for health checks
  Bun.serve({
    port: PORT,
    fetch(req) {
      const url = new URL(req.url)
      
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (url.pathname === '/check') {
        checkExpiringMemberships()
        return new Response(JSON.stringify({ message: 'Check initiated' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return new Response('Notification Service', { status: 200 })
    }
  })
}

startService().catch(console.error)

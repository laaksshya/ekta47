import { NextRequest, NextResponse } from 'next/server'
import { getMembersCollection, getNotificationLogsCollection, isMongoConnected } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { format, differenceInDays } from 'date-fns'

// WhatsApp Service URL
const WHATSAPP_SERVICE_URL = 'http://localhost:3004'

// Generate welcome message for new members
function generateWelcomeMessage(member: {
  name: string
  gymPlan: string
  membershipStart: Date | string
  membershipEnd: Date | string
}): string {
  return `🎉 *Welcome to A2V FitnesGYM!* 🏋️

Dear ${member.name},

We're thrilled to have you join our fitness family! 💪

📅 *Your Membership Details:*
━━━━━━━━━━━━━━━━━━━━━
🔖 *Plan:* ${member.gymPlan}
📆 *Start Date:* ${format(new Date(member.membershipStart), 'dd MMMM yyyy')}
🏁 *Valid Until:* ${format(new Date(member.membershipEnd), 'dd MMMM yyyy')}

✨ *What's Next?*
• Visit our gym during operating hours
• Bring a valid ID for verification
• Our trainers are ready to help you achieve your fitness goals!

📞 Need help? Contact us anytime!

💪 Let's make every workout count!

*Stay Fit, Stay Healthy!*
— A2V FitnesGYM Team`
}

// Generate expiry reminder message
function generateExpiryMessage(member: {
  name: string
  gymPlan: string
  membershipEnd: Date | string
}, daysLeft: number): string {
  return `🏋️ *A2V FitnesGYM - Membership Reminder*

Dear ${member.name},

Your gym membership is expiring soon!

📅 *Plan:* ${member.gymPlan}
⏰ *Days Left:* ${daysLeft} days
📆 *Expiry Date:* ${format(new Date(member.membershipEnd), 'dd MMMM yyyy')}

Please renew your membership to continue enjoying our services.

💪 Stay Fit, Stay Healthy!

- A2V FitnesGYM Team`
}

// Send message via WhatsApp service
async function sendViaWhatsAppService(phone: string, message: string): Promise<{
  success: boolean
  status: string
  error?: string
  qr?: string
  qrImage?: string
}> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message })
    })
    
    const data = await response.json()
    return {
      success: data.success,
      status: data.status || (data.success ? 'sent' : 'failed'),
      error: data.error,
      qr: data.qr,
      qrImage: data.qrImage
    }
  } catch (error) {
    return {
      success: false,
      status: 'service_unavailable',
      error: 'WhatsApp service not running. Start it from the dashboard.'
    }
  }
}

// POST - Send WhatsApp notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, phone, message, type = 'expiry' } = body
    
    const membersCollection = await getMembersCollection()
    const logsCollection = await getNotificationLogsCollection()
    
    let member = null
    
    if (memberId) {
      const id = isMongoConnected() ? new ObjectId(memberId) : memberId
      member = await membersCollection.findOne({ _id: id })
    }
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    
    const whatsappNumber = member.whatsappNumber || phone
    
    if (!whatsappNumber) {
      return NextResponse.json({ error: 'No WhatsApp number provided' }, { status: 400 })
    }
    
    // Generate appropriate message based on type
    let notificationMessage: string
    
    if (type === 'welcome') {
      notificationMessage = message || generateWelcomeMessage(member)
    } else {
      const daysLeft = differenceInDays(new Date(member.membershipEnd), new Date())
      notificationMessage = message || generateExpiryMessage(member, daysLeft)
    }
    
    // Send via WhatsApp service
    const result = await sendViaWhatsAppService(whatsappNumber, notificationMessage)
    
    // Update member notification status for expiry reminders
    if (type === 'expiry' && result.success) {
      const id = isMongoConnected() ? new ObjectId(memberId) : memberId
      await membersCollection.updateOne(
        { _id: id },
        { $set: { notificationSent: true, updatedAt: new Date() } }
      )
    }
    
    // Log the notification
    await logsCollection.insertOne({
      memberId: memberId || member._id?.toString() || member._id,
      memberName: member.name,
      message: notificationMessage,
      sentAt: new Date(),
      status: result.success ? 'sent' : 'failed',
      type: type === 'welcome' ? 'welcome' : 'expiry',
    })
    
    return NextResponse.json({
      success: result.success,
      status: result.status,
      message: result.success 
        ? `WhatsApp ${type === 'welcome' ? 'welcome' : 'expiry'} message sent successfully`
        : result.error || 'Failed to send message',
      qr: result.qr,
      qrImage: result.qrImage,
      details: {
        to: whatsappNumber,
        memberName: member.name,
        type: type,
      }
    })
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

// GET - Get notification logs or WhatsApp status
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  
  // Check if requesting WhatsApp status
  if (url.searchParams.get('whatsapp') === 'status') {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/status`)
      const data = await response.json()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({
        status: 'service_unavailable',
        connected: false,
        error: 'WhatsApp service not running'
      })
    }
  }
  
  // Get notification logs
  try {
    const logsCollection = await getNotificationLogsCollection()
    const logs = await logsCollection.find({}).sort({ sentAt: -1 }).limit(50).toArray()
    
    return NextResponse.json({ logs: logs.map(l => ({ ...l, _id: l._id?.toString() || l._id })) })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

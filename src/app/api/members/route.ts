import { NextRequest, NextResponse } from 'next/server'
import { getMembersCollection, getNotificationLogsCollection, isMongoConnected } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { format } from 'date-fns'

// WhatsApp Service URL
const WHATSAPP_SERVICE_URL = 'http://localhost:3004'

// Generate welcome message for new members
function generateWelcomeMessage(member: {
  name: string
  gymPlan: string
  membershipStart: Date
  membershipEnd: Date
}): string {
  return `🎉 *Welcome to EKTA47GYM!* 🏋️

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
— EKTA47GYM Team`
}

// Send message via WhatsApp service
async function sendViaWhatsAppService(phone: string, message: string): Promise<{
  success: boolean
  status: string
  error?: string
  qr?: string
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
      qr: data.qr
    }
  } catch (error) {
    return {
      success: false,
      status: 'service_unavailable',
      error: 'WhatsApp service not running'
    }
  }
}

// GET - Fetch all members
export async function GET() {
  try {
    const collection = await getMembersCollection()
    const members = await collection.find({}).sort({ createdAt: -1 }).toArray()
    
    return NextResponse.json({ 
      members: members.map(m => ({ ...m, _id: m._id.toString() })) 
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

// POST - Create new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST /api/members - Request body:', body)
    
    const collection = await getMembersCollection()
    
    // Check if email already exists
    console.log('Checking email:', body.email)
    const existingMember = await collection.findOne({ email: body.email })
    console.log('Existing member found:', !!existingMember, existingMember)
    
    if (existingMember) {
      console.log('Duplicate email rejected:', body.email)
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }
    
    const membershipStart = new Date(body.membershipStart)
    const membershipEnd = new Date(body.membershipEnd)
    
    const newMember = {
      name: body.name,
      email: body.email,
      contact: body.contact,
      photo: body.photo || null,
      gymPlan: body.gymPlan,
      memberFees: body.memberFees || 0,
      membershipStart,
      membershipEnd,
      whatsappNumber: body.whatsappNumber || null,
      isActive: true,
      notificationSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    console.log('Inserting new member:', newMember)
    
    const result = await collection.insertOne(newMember)
    const memberId = result.insertedId.toString()
    console.log('✅ Member inserted successfully. ID:', memberId)
    
    // Send welcome message on WhatsApp if number is provided
    let welcomeStatus = null
    if (body.whatsappNumber) {
      try {
        const welcomeMessage = generateWelcomeMessage({
          name: body.name,
          gymPlan: body.gymPlan,
          membershipStart,
          membershipEnd,
        })
        
        const welcomeResult = await sendViaWhatsAppService(body.whatsappNumber, welcomeMessage)
        
        welcomeStatus = {
          sent: welcomeResult.success,
          status: welcomeResult.status,
          error: welcomeResult.error,
          qr: welcomeResult.qr,
        }
        
        console.log('WhatsApp welcome result:', welcomeStatus)
        
        // Log the welcome message
        const logsCollection = await getNotificationLogsCollection()
        await logsCollection.insertOne({
          memberId,
          memberName: body.name,
          message: welcomeMessage,
          sentAt: new Date(),
          status: welcomeResult.success ? 'sent' : 'failed',
          type: 'welcome',
        })
        
      } catch (error) {
        console.error('Error sending welcome message:', error)
        welcomeStatus = {
          sent: false,
          status: 'failed',
          error: 'Failed to send welcome message',
        }
      }
    }
    
    return NextResponse.json({
      message: 'Member created successfully',
      memberId,
      welcomeMessage: welcomeStatus,
    })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getMembersCollection, getNotificationLogsCollection } from '@/lib/mongodb'

// Helper function to check if request is local
function isLocalRequest(request: NextRequest): boolean {
  try {
    const headersList = headers()
    const host = headersList.get('host') || ''
    return host.includes('localhost') || host.includes('127.0.0.1')
  } catch {
    // If headers() fails, assume it's not local
    return false
  }
}

// GET status endpoint for WhatsApp service
export async function GET(request: NextRequest) {
  try {
    let searchParams: URLSearchParams
    try {
      searchParams = new URL(request.url).searchParams
    } catch {
      // Fallback for invalid URLs
      searchParams = new URLSearchParams()
    }
    
    const status = searchParams.get('whatsapp')
    
    if (status === 'status') {
      const local = isLocalRequest(request)
      
      if (local) {
        try {
          const response = await fetch('http://localhost:3004/status', {
            headers: {
              'Access-Control-Allow-Origin': '*'
            },
            signal: AbortSignal.timeout(3000)
          })
          const data = await response.json()
          return NextResponse.json(data)
        } catch {
          // Fallback - local service not available
        }
      }
      
      // Prod or fallback - WhatsApp service not available in production
      return NextResponse.json({
        status: 'service_unavailable',
        connected: false,
        error: 'WhatsApp service is only available when running locally'
      })
    }
    
    return NextResponse.json({ 
      error: 'Invalid status parameter',
      available: ['whatsapp=status']
    }, { status: 400 })
  } catch (error) {
    console.error('Status endpoint error:', error)
    return NextResponse.json({ 
      status: 'error',
      connected: false,
      error: 'Internal server error'
    }, { status: 500 })
  }

}

// POST send notification endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ 
        success: false, 
        error: 'memberId required' 
      }, { status: 400 })
    }

    // Get member by ID
    const members = await getMembersCollection()
    const member = await members.findOne({ _id: memberId })

    if (!member) {
      return NextResponse.json({ 
        success: false, 
        error: 'Member not found' 
      }, { status: 404 })
    }

    // Log notification attempt
    const logs = await getNotificationLogsCollection()
    await logs.insertOne({
      memberId,
      memberName: member.name,
      message: `Reminder: Your membership expires on ${new Date(member.membershipEnd).toLocaleDateString()}`,
      sentAt: new Date(),
      status: 'failed', // No WhatsApp service
      type: 'whatsapp'
    })

    return NextResponse.json({
      success: true,
      status: 'sent',
      message: 'Notification logged (WhatsApp service not connected)'
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send notification' 
    }, { status: 500 })
  }
}


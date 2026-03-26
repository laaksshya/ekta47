import { NextResponse } from 'next/server'
import { getMembersCollection } from '@/lib/mongodb'
import { differenceInDays } from 'date-fns'

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    const collection = await getMembersCollection()
    
    const totalMembers = await collection.countDocuments({})
    
    const activeMembers = await collection.countDocuments({
      isActive: true,
      membershipEnd: { $gt: new Date() }
    })
    
    // Members expiring in 3 days or less
    const expiringSoon = await collection.countDocuments({
      isActive: true,
      membershipEnd: { 
        $gt: new Date(), 
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    })
    
    // Get active members for revenue calculation
    const members = await (collection.find({
      isActive: true,
      membershipEnd: { $gt: new Date() }
    }) as any).sort({ createdAt: -1 }).toArray()
    
    // Sum actual memberFees for revenue
    let totalRevenue = 0
    members.forEach((member: any) => {
      totalRevenue += member.memberFees || 1500
    })
    
    return NextResponse.json({
      totalMembers,
      activeMembers,
      expiringSoon,
      totalRevenue: Math.round(totalRevenue),
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}

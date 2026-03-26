import { NextRequest, NextResponse } from 'next/server'
import { getMembersCollection, isMongoConnected } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Fetch single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const collection = await getMembersCollection()
    
    const member = await collection.findOne({ 
      _id: isMongoConnected() ? new ObjectId(id) : id 
    })
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    
    return NextResponse.json({ member: { ...member, _id: member._id?.toString() || member._id } })
  } catch (error) {
    console.error('Error fetching member:', error)
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const collection = await getMembersCollection()
    
    const updateData: Record<string, unknown> = {
      name: body.name,
      email: body.email,
      contact: body.contact,
      whatsappNumber: body.whatsappNumber || null,
      gymPlan: body.gymPlan,
      memberFees: body.memberFees,
      updatedAt: new Date(),
    }
    
    // Only update photo if provided
    if (body.photo) {
      updateData.photo = body.photo
    }
    
    // Update membership dates if provided
    if (body.membershipStart) {
      updateData.membershipStart = new Date(body.membershipStart)
    }
    if (body.membershipEnd) {
      updateData.membershipEnd = new Date(body.membershipEnd)
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }
    if (body.notificationSent !== undefined) {
      updateData.notificationSent = body.notificationSent
    }
    
    const memberId = isMongoConnected() ? new ObjectId(id) : id
    const result = await collection.updateOne(
      { _id: memberId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    
    return NextResponse.json({ message: 'Member updated successfully' })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE - Delete member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log(`🗑️ DELETE request for member: ${id}`)
    
    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }
    
    const collection = await getMembersCollection()
    
    // When MongoDB is not connected, use the ID directly as a string
    // When connected, convert to ObjectId
    const memberId = isMongoConnected() ? new ObjectId(id) : id
    console.log(`🔍 Looking for member with ID: ${memberId}`)
    
    const result = await collection.deleteOne({ _id: memberId })
    console.log(`📊 Delete result:`, result)
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        error: 'Member not found',
        details: `No member found with ID: ${id}` 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      message: 'Member deleted successfully',
      deletedId: id
    })
  } catch (error) {
    console.error('Error deleting member:', error)
    return NextResponse.json({ 
      error: 'Failed to delete member',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

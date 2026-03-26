import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'

const uri = process.env.DATABASE_URL || ''

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null
let isConnected = false

// File-based local storage for persistence
const LOCAL_DATA_FILE = path.join(process.cwd(), 'db', 'local_storage.json')

interface LocalData {
  members: Record<string, any>
  logs: Record<string, any>
  memberIdCounter: number
  logIdCounter: number
}

// Check if MongoDB URI is valid
function isValidMongoUri(uri: string): boolean {
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')
}

// Check if the URI has placeholder
function hasPlaceholder(uri: string): boolean {
  return uri.includes('<db_password>') || uri.includes('your_api_key_here')
}

// Load local data from file
function loadLocalData(): LocalData {
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf-8'))
      return data
    }
  } catch (error) {
    console.error('Error loading local data:', error)
  }
  return {
    members: {},
    logs: {},
    memberIdCounter: 1,
    logIdCounter: 1
  }
}

// Save local data to file
function saveLocalData(data: LocalData) {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2))
    console.log('💾 Data saved successfully. Members:', Object.keys(data.members).length)
  } catch (error) {
    console.error('Error saving local data:', error)
  }
}

export async function getMongoClient(): Promise<MongoClient | null> {
  // Return null if URI is invalid or has placeholder
  if (!uri || !isValidMongoUri(uri) || hasPlaceholder(uri)) {
    console.log('MongoDB: Using local storage fallback (invalid or placeholder connection string)')
    return null
  }

  try {
    if (!clientPromise) {
      client = new MongoClient(uri)
      clientPromise = client.connect()
    }
    
    await clientPromise
    isConnected = true
    return client
  } catch (error) {
    console.error('MongoDB connection error:', error)
    return null
  }
}

export async function getDatabase() {
  const client = await getMongoClient()
  if (!client) {
    return null
  }
  return client.db('gym_management')
}

// Get members collection (with local storage fallback)
export async function getMembersCollection() {
  const db = await getDatabase()
  if (db) {
    return db.collection('gym_members')
  }
  
  // Return a mock collection that uses local file storage
  return {
    find: (query: any = {}) => ({
      sort: (sort: any) => ({
        toArray: async () => {
          const data = loadLocalData()
          let members = Object.values(data.members)
          
          // Apply filters
          if (query.isActive !== undefined) {
            members = members.filter((m: any) => m.isActive === query.isActive)
          }
          if (query.membershipEnd) {
            if (query.membershipEnd.$gt) {
              members = members.filter((m: any) => new Date(m.membershipEnd) > new Date(query.membershipEnd.$gt))
            }
            if (query.membershipEnd.$lte) {
              members = members.filter((m: any) => new Date(m.membershipEnd) <= new Date(query.membershipEnd.$lte))
            }
          }
          if (query.email) {
            members = members.filter((m: any) => m.email === query.email)
          }
          if (query.notificationSent !== undefined) {
            members = members.filter((m: any) => m.notificationSent === query.notificationSent)
          }
          if (query.whatsappNumber) {
            members = members.filter((m: any) => m.whatsappNumber !== null && m.whatsappNumber !== '')
          }
          
          // Sort by createdAt descending
          members.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          
          return members
        }
      })
    }),
    findOne: async (query: any) => {
      const data = loadLocalData()
      
      if (query._id) {
        const id = typeof query._id === 'string' ? query._id : query._id.toString()
        return data.members[id] || null
      }
      if (query.email) {
        for (const member of Object.values(data.members)) {
          if ((member as any).email === query.email) return member
        }
      }
      return null
    },
    insertOne: async (doc: any) => {
      const data = loadLocalData()
      const id = `local_${data.memberIdCounter++}`
      const member = { ...doc, _id: id }
      data.members[id] = member
      saveLocalData(data)
      console.log(`✅ Member saved: ${id} - ${doc.name}`)
      return { insertedId: id }
    },
    updateOne: async (query: any, update: any) => {
      const data = loadLocalData()
      const id = typeof query._id === 'string' ? query._id : query._id?.toString()
      
      if (id && data.members[id]) {
        data.members[id] = { ...data.members[id], ...update.$set }
        saveLocalData(data)
        console.log(`✅ Member updated: ${id}`)
        return { matchedCount: 1 }
      }
      console.log(`⚠️ Member not found for update: ${id}`)
      return { matchedCount: 0 }
    },
    deleteOne: async (query: any) => {
      const data = loadLocalData()
      let id = query._id
      
      // Handle ObjectId-like objects
      if (id && typeof id === 'object' && id.toString) {
        id = id.toString()
      }
      
      console.log(`🗑️ Attempting to delete member: ${id}`)
      console.log(`📋 Available members: ${Object.keys(data.members).join(', ')}`)
      
      if (id && data.members[id]) {
        const deletedMember = data.members[id]
        delete data.members[id]
        saveLocalData(data)
        console.log(`✅ Member deleted: ${id} (${deletedMember.name})`)
        return { deletedCount: 1 }
      }
      
      // Try to find member by string matching
      for (const memberId of Object.keys(data.members)) {
        if (memberId === id || memberId.includes(String(id)) || String(id).includes(memberId)) {
          const deletedMember = data.members[memberId]
          delete data.members[memberId]
          saveLocalData(data)
          console.log(`✅ Member deleted by fuzzy match: ${memberId} (${deletedMember.name})`)
          return { deletedCount: 1 }
        }
      }
      
      console.log(`⚠️ Member not found for deletion: ${id}`)
      return { deletedCount: 0 }
    },
    countDocuments: async (query: any = {}) => {
      const data = loadLocalData()
      let members = Object.values(data.members)
      
      if (query.isActive !== undefined) {
        members = members.filter((m: any) => m.isActive === query.isActive)
      }
      if (query.membershipEnd) {
        if (query.membershipEnd.$gt) {
          members = members.filter((m: any) => new Date(m.membershipEnd) > new Date(query.membershipEnd.$gt))
        }
        if (query.membershipEnd.$lte) {
          members = members.filter((m: any) => new Date(m.membershipEnd) <= new Date(query.membershipEnd.$lte))
        }
      }
      if (query.notificationSent !== undefined) {
        members = members.filter((m: any) => m.notificationSent === query.notificationSent)
      }
      if (query.whatsappNumber) {
        members = members.filter((m: any) => m.whatsappNumber !== null && m.whatsappNumber !== '')
      }
      
      return members.length
    }
  }
}

export async function getNotificationLogsCollection() {
  const db = await getDatabase()
  if (db) {
    return db.collection('notification_logs')
  }
  
  // Return a mock collection for local storage
  return {
    find: (query: any = {}) => ({
      sort: (sort: any) => ({
        limit: (limit: number) => ({
          toArray: async () => {
            const data = loadLocalData()
            let logs = Object.values(data.logs)
            logs.sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
            return logs.slice(0, limit)
          }
        })
      })
    }),
    insertOne: async (doc: any) => {
      const data = loadLocalData()
      const id = `log_${data.logIdCounter++}`
      const log = { ...doc, _id: id }
      data.logs[id] = log
      saveLocalData(data)
      return { insertedId: id }
    }
  }
}

export function isMongoConnected() {
  return isConnected
}

"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Users, UserPlus, Calendar, Bell, TrendingUp, DollarSign, 
  Edit, Trash2, Search, Sparkles,
  AlertCircle, CheckCircle2, Clock, Phone, Camera,
  MessageCircle, QrCode, RefreshCw, Wifi, WifiOff,
  Dumbbell, Heart, Activity, Zap, ChevronRight,
  X, Upload, ArrowUpRight, Medal, Target, Flame
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { format, addMonths, addYears, differenceInDays, differenceInCalendarDays } from "date-fns"

// Types
interface GymMember {
  _id: string
  name: string
  email: string
  contact: string
  photo?: string
  gymPlan: string
  memberFees?: number
  membershipStart: string
  membershipEnd: string
  whatsappNumber?: string
  isActive: boolean
  notificationSent: boolean
  createdAt: string
  updatedAt: string
}

interface Stats {
  totalMembers: number
  activeMembers: number
  expiringSoon: number
  totalRevenue: number
}

interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr' | 'service_unavailable'
  qr?: string | null
  qrImage?: string | null
  connected: boolean
  error?: string
}

// Gym Plan Configuration
const GYM_PLANS = [
  { name: "1 Month", price: 1500, duration: 1, unit: "months" },
  { name: "3 Months", price: 4000, duration: 3, unit: "months" },
  { name: "6 Months", price: 7500, duration: 6, unit: "months" },
  { name: "1 Year", price: 14000, duration: 1, unit: "years" },
]

// Animated Counter Component
function AnimatedCounter({ value, duration = 2000, prefix = "", suffix = "" }: { value: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    
    let startTime: number
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * value))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [isInView, value, duration])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// Skeleton Card Component
function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black/60 border border-cyan-500/20 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-full bg-slate-800" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32 bg-slate-800" />
          <Skeleton className="h-4 w-48 bg-slate-800" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full bg-slate-800" />
        <Skeleton className="h-3 w-3/4 bg-slate-800" />
      </div>
    </div>
  )
}

// Stat Card Component - Neon Style
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  neonColor,
  delay = 0,
  prefix = "",
  suffix = ""
}: { 
  title: string
  value: number
  icon: React.ElementType
  neonColor: "cyan" | "magenta" | "lime" | "purple"
  delay?: number
  prefix?: string
  suffix?: string
}) {
  const colorClasses = {
    cyan: {
      border: "border-cyan-500/50",
      glow: "shadow-[0_0_30px_rgba(0,255,255,0.3)]",
      icon: "text-cyan-400",
      text: "text-cyan-300",
      gradient: "from-cyan-500/20 to-transparent",
      boxGlow: "group-hover:shadow-[0_0_50px_rgba(0,255,255,0.5)]"
    },
    magenta: {
      border: "border-fuchsia-500/50",
      glow: "shadow-[0_0_30px_rgba(255,0,255,0.3)]",
      icon: "text-fuchsia-400",
      text: "text-fuchsia-300",
      gradient: "from-fuchsia-500/20 to-transparent",
      boxGlow: "group-hover:shadow-[0_0_50px_rgba(255,0,255,0.5)]"
    },
    lime: {
      border: "border-lime-500/50",
      glow: "shadow-[0_0_30px_rgba(0,255,0,0.3)]",
      icon: "text-lime-400",
      text: "text-lime-300",
      gradient: "from-lime-500/20 to-transparent",
      boxGlow: "group-hover:shadow-[0_0_50px_rgba(0,255,0,0.5)]"
    },
    purple: {
      border: "border-purple-500/50",
      glow: "shadow-[0_0_30px_rgba(168,85,247,0.3)]",
      icon: "text-purple-400",
      text: "text-purple-300",
      gradient: "from-purple-500/20 to-transparent",
      boxGlow: "group-hover:shadow-[0_0_50px_rgba(168,85,247,0.5)]"
    }
  }

  const colors = colorClasses[neonColor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className={`group relative overflow-hidden rounded-2xl bg-black/60 backdrop-blur-xl border ${colors.border} ${colors.glow} transition-all duration-300 p-6 ${colors.boxGlow}`}
    >
      {/* Neon Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient}`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className={`p-2.5 rounded-xl bg-black/50 border ${colors.border}`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
        </div>
        <p className={`text-4xl font-bold ${colors.text} tracking-tight`}>
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </p>
      </div>
      
      {/* Animated Corner Glow */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full ${colors.icon} bg-current opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
    </motion.div>
  )
}

// Member Card Component - Neon Style
function MemberCard({ 
  member, 
  onEdit, 
  onRenew, 
  onNotify, 
  onDelete,
  index 
}: { 
  member: GymMember
  onEdit: () => void
  onRenew: () => void
  onNotify: () => void
  onDelete: () => void
  index: number
}) {
  const status = getMembershipStatus(member)
  const progress = getMembershipProgress(member)
  const daysLeft = differenceInDays(new Date(member.membershipEnd), new Date())
  
  const statusColors = {
    active: {
      border: "border-lime-500/50",
      glow: "group-hover:shadow-[0_0_40px_rgba(0,255,0,0.2)]",
      badge: "bg-lime-500/20 text-lime-400 border-lime-500/50",
      progress: "from-lime-400 to-emerald-500",
      dot: "bg-lime-400",
      avatar: "from-lime-500 to-emerald-600"
    },
    expiring: {
      border: "border-amber-500/50",
      glow: "group-hover:shadow-[0_0_40px_rgba(255,200,0,0.2)]",
      badge: "bg-amber-500/20 text-amber-400 border-amber-500/50",
      progress: "from-amber-400 to-orange-500",
      dot: "bg-amber-400 animate-pulse",
      avatar: "from-amber-500 to-orange-600"
    },
    expired: {
      border: "border-rose-500/50",
      glow: "group-hover:shadow-[0_0_40px_rgba(255,50,50,0.2)]",
      badge: "bg-rose-500/20 text-rose-400 border-rose-500/50",
      progress: "from-rose-400 to-red-500",
      dot: "bg-rose-400",
      avatar: "from-slate-500 to-slate-600"
    }
  }
  
  const colors = statusColors[status.status as keyof typeof statusColors] || statusColors.expired
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={`group relative`}
    >
      {/* Outer Glow */}
      <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colors.border} ${colors.glow}`} />
      
      <div className={`relative overflow-hidden rounded-2xl bg-black/60 backdrop-blur-xl border ${colors.border} p-6 transition-all duration-300`}>
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.2)_1px,transparent_1px)] bg-[size:30px_30px]" />
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant="outline"
            className={`px-3 py-1 text-xs font-medium backdrop-blur-sm border ${colors.badge}`}
          >
            <span className={`mr-1.5 h-2 w-2 rounded-full ${colors.dot}`} />
            {status.label}
          </Badge>
        </div>

        {/* Avatar & Info */}
        <div className="flex items-start gap-4 mb-5 relative z-10">
          <div className="relative">
            <Avatar className="w-16 h-16 ring-2 ring-cyan-500/30 ring-offset-2 ring-offset-black">
              <AvatarImage src={member.photo || undefined} alt={member.name} />
              <AvatarFallback className={`text-lg font-bold bg-gradient-to-br ${colors.avatar} text-white`}>
                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-black ${colors.dot}`} />
          </div>
          
          <div className="flex-1 min-w-0 pr-20">
            <h3 className="font-semibold text-white truncate text-lg">{member.name}</h3>
            <p className="text-sm text-slate-400 truncate">{member.email}</p>
            <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs bg-slate-800/50 text-cyan-400 border border-cyan-500/30">
                    {member.gymPlan}
                  </Badge>
                  {member.memberFees && (
                    <Badge variant="outline" className="text-xs bg-slate-800/50 text-emerald-400 border-emerald-500/30">
                      ₹{member.memberFees.toLocaleString()}
                    </Badge>
                  )}
                </div>
              {member.whatsappNumber && (
                <span className="flex items-center text-xs text-fuchsia-400">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  WhatsApp
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Membership Progress */}
        <div className="space-y-2 mb-5 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Membership Progress</span>
            <span className={`font-medium ${
              status.status === 'expired' ? 'text-rose-400' : 
              daysLeft <= 7 ? 'text-amber-400' : 'text-lime-400'
            }`}>
              {status.status === 'expired' ? 'Expired' : `${daysLeft} days left`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800/50 overflow-hidden border border-slate-700/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className={`h-full rounded-full bg-gradient-to-r ${colors.progress}`}
              style={{ boxShadow: `0 0 20px ${status.status === 'active' ? 'rgba(0,255,0,0.5)' : status.status === 'expiring' ? 'rgba(255,200,0,0.5)' : 'rgba(255,50,50,0.5)'}` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{format(new Date(member.membershipStart), "dd MMM yyyy")}</span>
            <span>{format(new Date(member.membershipEnd), "dd MMM yyyy")}</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-5 relative z-10">
          <Phone className="w-4 h-4 text-cyan-500" />
          <span>{member.contact}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-cyan-500/10 relative z-10">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onEdit}
            className="flex-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          
          {status.status !== 'active' && (
            <Button 
              size="sm"
              onClick={onRenew}
              className="flex-1 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black font-semibold shadow-[0_0_20px_rgba(0,255,0,0.3)]"
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Renew
            </Button>
          )}
          
          {member.whatsappNumber && status.status === 'expiring' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onNotify}
              className="flex-1 border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
            >
              <Bell className="w-4 h-4 mr-1.5" />
              Notify
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="px-2 text-slate-400 hover:text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-black/90 border-cyan-500/20">
              <DropdownMenuLabel className="text-cyan-400">More Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-cyan-500/20" />
              <DropdownMenuItem onClick={onRenew} className="text-slate-300 focus:text-cyan-400 focus:bg-cyan-500/10">
                <Calendar className="w-4 h-4 mr-2" />
                Renew Membership
              </DropdownMenuItem>
              {member.whatsappNumber && (
                <DropdownMenuItem onClick={onNotify} className="text-slate-300 focus:text-fuchsia-400 focus:bg-fuchsia-500/10">
                  <Bell className="w-4 h-4 mr-2" />
                  Send WhatsApp Alert
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-cyan-500/20" />
              <DropdownMenuItem 
                className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  )
}

// Helper Functions
function getMembershipStatus(member: GymMember) {
  const endDate = new Date(member.membershipEnd)
  const today = new Date()
  const daysLeft = differenceInDays(endDate, today)
  
  if (daysLeft < 0) {
    return { status: "expired", label: "Expired", variant: "destructive" as const }
  } else if (daysLeft <= 3) {
    return { status: "expiring", label: `${daysLeft} days left`, variant: "secondary" as const }
  } else {
    return { status: "active", label: "Active", variant: "default" as const }
  }
}

function getMembershipProgress(member: GymMember) {
  const startDate = new Date(member.membershipStart)
  const endDate = new Date(member.membershipEnd)
  const today = new Date()
  
  const totalDays = differenceInCalendarDays(endDate, startDate)
  const daysPassed = differenceInCalendarDays(today, startDate)
  
  if (daysPassed < 0) return 100
  if (daysPassed > totalDays) return 0
  
  return Math.max(0, Math.min(100, ((totalDays - daysPassed) / totalDays) * 100))
}

// Floating Neon Elements Component
function FloatingNeonElements() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Neon Grid Floor */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Neon Orbs */}
      <motion.div 
        animate={{ 
          y: [-20, 20, -20],
          x: [-10, 10, -10],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl"
        style={{ boxShadow: '0 0 100px rgba(0,255,255,0.2)' }}
      />
      <motion.div 
        animate={{ 
          y: [20, -20, 20],
          x: [10, -10, 10],
          scale: [1.1, 1, 1.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl"
        style={{ boxShadow: '0 0 100px rgba(255,0,255,0.2)' }}
      />
      <motion.div 
        animate={{ 
          y: [-15, 15, -15],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-3/4 left-1/2 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"
        style={{ boxShadow: '0 0 80px rgba(168,85,247,0.2)' }}
      />
      
      {/* Floating Neon Icons */}
      <motion.div 
        animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-[15%] text-cyan-500/30"
        style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,255,0.5))' }}
      >
        <Dumbbell className="w-16 h-16" />
      </motion.div>
      <motion.div 
        animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-[10%] text-fuchsia-500/30"
        style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,255,0.5))' }}
      >
        <Heart className="w-12 h-12" />
      </motion.div>
      <motion.div 
        animate={{ y: [-5, 15, -5], rotate: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-[20%] text-lime-500/30"
        style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,0,0.5))' }}
      >
        <Activity className="w-14 h-14" />
      </motion.div>
      <motion.div 
        animate={{ y: [15, -5, 15], rotate: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 left-[20%] text-purple-500/20"
        style={{ filter: 'drop-shadow(0 0 15px rgba(168,85,247,0.5))' }}
      >
        <Target className="w-20 h-20" />
      </motion.div>
      <motion.div 
        animate={{ y: [-8, 12, -8], rotate: [5, -5, 5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 right-[8%] text-amber-500/20"
        style={{ filter: 'drop-shadow(0 0 10px rgba(255,200,0,0.5))' }}
      >
        <Medal className="w-10 h-10" />
      </motion.div>
      <motion.div 
        animate={{ y: [12, -8, 12], rotate: [-5, 5, -5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[30%] text-rose-500/20"
        style={{ filter: 'drop-shadow(0 0 10px rgba(255,50,50,0.5))' }}
      >
        <Flame className="w-12 h-12" />
      </motion.div>
    </div>
  )
}

export default function GYMManagementSystem() {
  const [members, setMembers] = useState<GymMember[]>([])
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    expiringSoon: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlan, setFilterPlan] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  
  // WhatsApp state
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
    status: 'service_unavailable',
    connected: false
  })
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    whatsappNumber: "",
    gymPlan: "1 Month",
    memberFees: 1500,
    photo: "",
  })

  // Fetch members on mount
  useEffect(() => {
    fetchMembers()
    fetchStats()
    fetchWhatsAppStatus()
    
    const interval = setInterval(fetchWhatsAppStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchWhatsAppStatus = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch("/api/notifications/send?whatsapp=status", {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error("Request failed")
      const data = await response.json()
      setWhatsappStatus(data)
    } catch (error) {
      // Silently handle fetch errors - set fallback state
      setWhatsappStatus({
        status: 'service_unavailable',
        connected: false,
        error: 'Unable to connect'
      })
    }
  }

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch("/api/members", {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error("Failed to fetch members")
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error) {
      // Silently set empty state on error
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch("/api/members/stats", {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error("Failed to fetch stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      // Keep existing stats on error
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processPhoto(file)
    }
  }

  const processPhoto = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setPhotoPreview(base64)
      setFormData({ ...formData, photo: base64 })
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processPhoto(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log("Adding member:", formData)
      
      const plan = GYM_PLANS.find(p => p.name === formData.gymPlan)
      const startDate = new Date()
      let endDate: Date
      
      if (plan?.unit === "years") {
        endDate = addYears(startDate, plan.duration)
      } else {
        endDate = addMonths(startDate, plan?.duration || 1)
      }

      const body = {
        ...formData,
        memberFees: Number(formData.memberFees),
        membershipStart: startDate.toISOString(),
        membershipEnd: endDate.toISOString(),
      }
      
      console.log("POST body:", body)

      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      console.log("Response status:", response.status, response.statusText)

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = await response.json()
        } catch {
          // Non-JSON response
        }
        console.error("Add member API error:", response.status, errorData)
        const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        toast.error(errorMsg)
        return
      }
      
      const data = await response.json()
      console.log("Add member success:", data)
      
      if (data.welcomeMessage) {
        if (data.welcomeMessage.sent) {
          toast.success("Member added! Welcome message sent on WhatsApp")
        } else {
          toast.success("Member added successfully!")
          toast.warning("Welcome message could not be sent")
        }
      } else {
        toast.success("Member added successfully!")
      }
      
      setIsAddDialogOpen(false)
      resetForm()
      fetchMembers()
      fetchStats()
    } catch (error) {
      console.error("Error adding member:", error)
      toast.error("Network error. Please try again.")
    }
  }

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMember) return

    try {
      console.log("Updating member:", selectedMember._id, formData)
      
      const body = {
        ...formData,
        memberFees: Number(formData.memberFees),
      }
      
      console.log("PUT body:", body)

      const response = await fetch(`/api/members/${selectedMember._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      console.log("Update response status:", response.status)

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = await response.json()
        } catch {
          // Non-JSON
        }
        console.error("Update member API error:", response.status, errorData)
        const errorMsg = errorData.error || `HTTP ${response.status}`
        toast.error(errorMsg)
        return
      }
      
      toast.success("Member updated successfully!")
      setIsEditDialogOpen(false)
      resetForm()
      fetchMembers()
      fetchStats()
    } catch (error) {
      console.error("Error updating member:", error)
      toast.error("Network error. Please try again.")
    }
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return

    try {
      console.log("Deleting member:", selectedMember._id)

      const response = await fetch(`/api/members/${selectedMember._id}`, {
        method: "DELETE",
      })

      console.log("Delete response status:", response.status)

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = await response.json()
        } catch {
          // Non-JSON
        }
        console.error("Delete member API error:", response.status, errorData)
        const errorMsg = errorData.error || `HTTP ${response.status}`
        toast.error(errorMsg)
        return
      }
      
      toast.success("Member deleted successfully!")
      setIsDeleteDialogOpen(false)
      setSelectedMember(null)
      fetchMembers()
      fetchStats()
    } catch (error) {
      console.error("Error deleting member:", error)
      toast.error("Network error. Please try again.")
    }
  }

  const handleRenewMembership = async (member: GymMember) => {
    try {
      const plan = GYM_PLANS.find(p => p.name === member.gymPlan)
      const startDate = new Date()
      let endDate: Date
      
      if (plan?.unit === "years") {
        endDate = addYears(startDate, plan.duration)
      } else {
        endDate = addMonths(startDate, plan?.duration || 1)
      }

      const response = await fetch(`/api/members/${member._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipStart: startDate.toISOString(),
          membershipEnd: endDate.toISOString(),
          isActive: true,
          notificationSent: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Renew membership failed:", response.status, response.statusText, errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      toast.success("Membership renewed successfully!")
      fetchMembers()
      fetchStats()
    } catch (error) {
      console.error("Error renewing membership:", error)
      toast.error("Failed to renew membership")
    }
  }

  const handleSendNotification = async (member: GymMember) => {
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member._id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Send notification failed:", response.status, response.statusText, errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      toast.success("WhatsApp notification sent!")
      fetchMembers()
    } catch (error) {
      console.error("Error sending notification:", error)
      toast.error("Failed to send notification")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      contact: "",
      whatsappNumber: "",
gymPlan: "1 Month",
      photo: "",
    })
    setPhotoPreview("")
  }

  const openEditDialog = (member: GymMember) => {
    setSelectedMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      contact: member.contact,
      whatsappNumber: member.whatsappNumber || "",
      gymPlan: member.gymPlan,
      photo: member.photo || "",
    })
    setPhotoPreview(member.photo || "")
    setIsEditDialogOpen(true)
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.contact.includes(searchQuery)
    
    const matchesPlan = filterPlan === "all" || member.gymPlan === filterPlan
    
    let matchesStatus = true
    if (filterStatus === "active") {
      matchesStatus = member.isActive && new Date(member.membershipEnd) > new Date()
    } else if (filterStatus === "expired") {
      matchesStatus = !member.isActive || new Date(member.membershipEnd) <= new Date()
    } else if (filterStatus === "expiring") {
      const daysLeft = differenceInDays(new Date(member.membershipEnd), new Date())
      matchesStatus = daysLeft >= 0 && daysLeft <= 3
    }
    
    return matchesSearch && matchesPlan && matchesStatus
  })

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Floating Neon Background */}
      <FloatingNeonElements />
      
      {/* Vignette Effect */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-black/50 border-b border-cyan-500/20"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="relative"
              >
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
                  <Dumbbell className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-lime-400 rounded-full border-2 border-black animate-pulse" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                    A2V Fitnes
                  </span>
                  <span className="text-white ml-1">GYM</span>
                </h1>
                <p className="text-xs text-slate-500 tracking-widest uppercase">Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* WhatsApp Status - Local only */}

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden sm:flex">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsQRDialogOpen(true)}
                    disabled
                    className="backdrop-blur-sm border-cyan-500/30 bg-black/50 text-slate-400 cursor-not-allowed opacity-50"
                  >
                    <WifiOff className="w-4 h-4 mr-2" />
                    WhatsApp (Local Only)
                  </Button>
                </motion.div>

              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:flex">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchMembers()}
                  className="bg-black/50 border-purple-500/30 text-slate-400 hover:text-purple-400"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 md:flex-none">
                <Button 
                  onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                  className="w-full md:w-auto bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-500 hover:from-cyan-400 hover:via-fuchsia-400 hover:to-purple-400 text-white font-semibold border-0 shadow-[0_0_30px_rgba(0,255,255,0.3)]"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400 tracking-widest uppercase">Dashboard</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">
            Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">Admin</span>
          </h2>
          <p className="text-slate-500">
            Here's what's happening with your gym today.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Members" 
            value={stats.totalMembers} 
            icon={Users}
            neonColor="cyan"
            delay={0}
          />
          <StatCard 
            title="Active Members" 
            value={stats.activeMembers} 
            icon={CheckCircle2}
            neonColor="lime"
            delay={0.1}
          />
          <StatCard 
            title="Expiring Soon" 
            value={stats.expiringSoon} 
            icon={Clock}
            neonColor="magenta"
            delay={0.2}
          />
          <StatCard 
            title="Monthly Revenue" 
            value={stats.totalRevenue} 
            icon={TrendingUp}
            neonColor="purple"
            delay={0.3}
            prefix="₹"
          />
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-500/50" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-black/60 backdrop-blur-xl border-cyan-500/30 rounded-xl text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-[160px] h-12 bg-black/60 backdrop-blur-xl border-cyan-500/30 rounded-xl text-slate-300">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-cyan-500/30">
                  <SelectItem value="all">All Plans</SelectItem>
                  {GYM_PLANS.map(plan => (
                    <SelectItem key={plan.name} value={plan.name}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] h-12 bg-black/60 backdrop-blur-xl border-cyan-500/30 rounded-xl text-slate-300">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-cyan-500/30">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <SkeletonCard />
                </motion.div>
              ))
            ) : filteredMembers.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full"
              >
                <div className="text-center py-16 rounded-2xl bg-black/60 backdrop-blur-xl border border-cyan-500/20">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 border border-cyan-500/20 flex items-center justify-center">
                    <Users className="w-10 h-10 text-cyan-500/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No members found
                  </h3>
                  <p className="text-slate-500 mb-4">
                    {searchQuery || filterPlan !== "all" || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first member to get started!"}
                  </p>
                  <Button 
                    onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                    className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </motion.div>
            ) : (
              filteredMembers.map((member, index) => (
                <MemberCard
                  key={member._id}
                  member={member}
                  index={index}
                  onEdit={() => openEditDialog(member)}
                  onRenew={() => handleRenewMembership(member)}
                  onNotify={() => handleSendNotification(member)}
                  onDelete={() => { setSelectedMember(member); setIsDeleteDialogOpen(true); }}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg bg-black/90 backdrop-blur-2xl border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              Add New Member
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Register a new gym member with their details
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddMember} className="space-y-5">
            {/* Photo Upload */}
            <div 
              className={`relative mx-auto w-28 h-28 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                isDragging 
                  ? 'border-cyan-500 bg-cyan-500/10 scale-105' 
                  : 'border-slate-700 hover:border-cyan-500/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Avatar className="w-full h-full rounded-xl">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="rounded-xl bg-slate-800">
                  <Upload className="w-6 h-6 text-slate-500" />
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoChange}
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(""); setFormData({ ...formData, photo: "" }); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-cyan-400">Full Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required 
                  placeholder="John Doe"
                  className="bg-black/50 border-cyan-500/30 text-white placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyan-400">Email *</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required 
                  placeholder="john@example.com"
                  className="bg-black/50 border-cyan-500/30 text-white placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-cyan-400">Contact *</Label>
                  <Input 
                    id="contact" 
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    required 
                    placeholder="9876543210"
                    className="bg-black/50 border-cyan-500/30 text-white placeholder:text-slate-600 focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-fuchsia-400">WhatsApp</Label>
                  <Input 
                    id="whatsapp" 
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="91 9876543210"
                    className="bg-black/50 border-fuchsia-500/30 text-white placeholder:text-slate-600 focus:border-fuchsia-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plan" className="text-cyan-400">Gym Plan *</Label>
                <Select value={formData.gymPlan} onValueChange={(value) => {
                  const plan = GYM_PLANS.find(p => p.name === value)
                  setFormData({ 
                    ...formData, 
                    gymPlan: value,
                    memberFees: plan?.price || 1500
                  })
                }}>
                  <SelectTrigger className="bg-black/50 border-cyan-500/30 text-slate-300">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/30">
                    {GYM_PLANS.map(plan => (
                      <SelectItem key={plan.name} value={plan.name} className="text-slate-300">
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fees" className="text-cyan-400">Member Fees (₹) *</Label>
                <Input 
                  id="fees"
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.memberFees || ''}
                  onChange={(e) => setFormData({ ...formData, memberFees: parseFloat(e.target.value) || 0 })}
                  placeholder="1500"
                  className="bg-black/50 border-cyan-500/30 text-white focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              >
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg bg-black/90 backdrop-blur-2xl border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              Edit Member
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Update member information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateMember} className="space-y-5">
            {/* Photo Upload */}
            <div 
              className={`relative mx-auto w-28 h-28 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                isDragging 
                  ? 'border-cyan-500 bg-cyan-500/10 scale-105' 
                  : 'border-slate-700 hover:border-cyan-500/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Avatar className="w-full h-full rounded-xl">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="rounded-xl bg-slate-800">
                  <Upload className="w-6 h-6 text-slate-500" />
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoChange}
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(""); setFormData({ ...formData, photo: "" }); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-cyan-400">Full Name *</Label>
                <Input 
                  id="edit-name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required 
                  className="bg-black/50 border-cyan-500/30 text-white focus:border-cyan-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-cyan-400">Email *</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required 
                  className="bg-black/50 border-cyan-500/30 text-white focus:border-cyan-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact" className="text-cyan-400">Contact *</Label>
                  <Input 
                    id="edit-contact" 
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    required 
                    className="bg-black/50 border-cyan-500/30 text-white focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-whatsapp" className="text-fuchsia-400">WhatsApp</Label>
                  <Input 
                    id="edit-whatsapp" 
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="bg-black/50 border-fuchsia-500/30 text-white focus:border-fuchsia-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-plan" className="text-cyan-400">Gym Plan *</Label>
                <Select value={formData.gymPlan} onValueChange={(value) => {
                  const plan = GYM_PLANS.find(p => p.name === value)
                  setFormData({ 
                    ...formData, 
                    gymPlan: value,
                    memberFees: plan?.price || 1500
                  })
                }}>
                  <SelectTrigger className="bg-black/50 border-cyan-500/30 text-slate-300">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/30">
                    {GYM_PLANS.map(plan => (
                      <SelectItem key={plan.name} value={plan.name} className="text-slate-300">
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-fees" className="text-cyan-400">Member Fees (₹) *</Label>
                <Input 
                  id="edit-fees"
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.memberFees || ''}
                  onChange={(e) => setFormData({ ...formData, memberFees: parseFloat(e.target.value) || 0 })}
                  placeholder="1500"
                  className="bg-black/50 border-cyan-500/30 text-white focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              >
                Update Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-black/90 backdrop-blur-2xl border-rose-500/30 shadow-[0_0_50px_rgba(255,50,50,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-400">
              Delete Member
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete <span className="text-white font-medium">{selectedMember?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteMember}
              className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-[0_0_20px_rgba(255,50,50,0.3)]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-md bg-black/90 backdrop-blur-2xl border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              Connect WhatsApp
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Scan this QR code with your WhatsApp to link your account
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {whatsappStatus.status === 'service_unavailable' ? (
              <div className="text-center">
                <div className="w-64 h-64 mx-auto rounded-xl border border-slate-700 flex items-center justify-center bg-slate-800/50">
                  <div className="text-center">
                    <WifiOff className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">WhatsApp Local Only</p>
                    <p className="text-slate-500 text-sm mt-2">Run locally for WhatsApp features</p>
                  </div>
                </div>
              </div>
            ) : whatsappStatus.connected ? (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-lime-500/20 flex items-center justify-center border border-lime-500/50 shadow-[0_0_30px_rgba(0,255,0,0.3)]">
                  <CheckCircle2 className="w-12 h-12 text-lime-400" />
                </div>
                <p className="text-lime-400 font-semibold">WhatsApp Connected!</p>
                <p className="text-slate-500 text-sm mt-1">Ready to send messages</p>
              </div>
            ) : whatsappStatus.qrImage ? (
              <div className="relative">
                <img 
                  src={whatsappStatus.qrImage} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl pointer-events-none" />
              </div>
            ) : (
              <div className="text-center">
                <div className="w-64 h-64 mx-auto rounded-xl border border-slate-700 flex items-center justify-center bg-slate-800/50">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-400">Generating QR Code...</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center text-sm text-slate-500">
              <p>1. Open WhatsApp on your phone</p>
              <p>2. Go to Settings → Linked Devices</p>
              <p>3. Tap on "Link a Device"</p>
              <p>4. Scan the QR code above</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setIsQRDialogOpen(false)}
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative w-10 h-10">
        <div className="w-5 h-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative w-10 h-10 rounded-full border border-cyan-500/30 hover:border-cyan-500/50 bg-black/50 dark:bg-black/50 light:bg-white/50 backdrop-blur-sm"
    >
      <motion.div
        initial={false}
        animate={{ 
          rotate: theme === "dark" ? 0 : 180,
          scale: 1
        }}
        transition={{ duration: 0.3 }}
      >
        {theme === "dark" ? (
          <Moon className="h-5 w-5 text-cyan-400" />
        ) : (
          <Sun className="h-5 w-5 text-amber-500" />
        )}
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

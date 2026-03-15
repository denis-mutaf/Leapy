'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'
import { SidebarNav } from './sidebar-nav'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function Sidebar() {
  const [open, setOpen] = useState(true)
  return (
    <aside
      className={`shrink-0 flex flex-col transition-all duration-200 relative ${open ? 'w-64' : 'w-14'}`}
      style={{ background: 'var(--sidebar-gradient)' }}
    >
      {/* Header */}
      <div className={`flex items-center border-b px-3 ${open ? 'justify-between' : 'justify-center'}`} style={{ borderColor: 'var(--sidebar-border)', height: 'var(--panel-header-height)' }}>
        {open && (
          <Link href="/">
            <Image src="/leadleap_logo.svg" alt="LeadLeap" width={110} height={30} className="h-auto" priority />
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={() => setOpen(v => !v)} className="shrink-0 h-8 w-8">
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 p-4">
            <SidebarNav />
          </motion.div>
        ) : (
          <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1">
            <CollapsedNav />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className={`p-3 border-t flex items-center ${open ? 'justify-between' : 'justify-center'}`} style={{ borderColor: 'var(--sidebar-border)' }}>
        {open && <span className="text-xs" style={{ color: 'var(--sidebar-text)' }}>Leapy © 2026</span>}
        <ThemeToggle />
      </div>

      <div
        className="absolute right-0 top-0 h-full w-[2px] z-10"
        style={{ background: 'var(--sidebar-divider)' }}
      />
    </aside>
  )
}

function CollapsedNav() {
  const pathname = usePathname()
  const [hoveredHref, setHoveredHref] = useState(null)
  const items = [
    { href: '/', icon: BookOpen, label: 'База знаний' },
    { href: '/creatives', icon: Sparkles, label: 'Креативы' },
  ]
  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          const isHovered = hoveredHref === href
          const linkStyle = isActive
            ? { background: 'var(--sidebar-active)', color: 'var(--sidebar-text-active)' }
            : isHovered
              ? { background: 'var(--sidebar-hover)', color: 'var(--sidebar-text-active)' }
              : { color: 'var(--sidebar-text)' }
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className="flex items-center justify-center h-9 w-9 rounded-lg transition-colors mx-auto"
                  style={linkStyle}
                  onMouseEnter={() => setHoveredHref(href)}
                  onMouseLeave={() => setHoveredHref(null)}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}

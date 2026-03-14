'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'
import { SidebarNav } from './sidebar-nav'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [open, setOpen] = useState(true)
  return (
    <aside className={`shrink-0 border-r border-border bg-card flex flex-col transition-all duration-200 ${open ? 'w-64' : 'w-14'}`}>
      {/* Header */}
      <div className={`flex items-center border-b border-border h-14 px-3 ${open ? 'justify-between' : 'justify-center'}`}>
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
      {open ? (
        <div className="flex-1 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Навигация
          </p>
          <SidebarNav />
        </div>
      ) : (
        <CollapsedNav />
      )}

      {/* Footer */}
      <div className={`p-3 border-t border-border flex items-center ${open ? 'justify-between' : 'justify-center'}`}>
        {open && <span className="text-xs text-muted-foreground">Leapy © 2026</span>}
        <ThemeToggle />
      </div>
    </aside>
  )
}

function CollapsedNav() {
  const pathname = usePathname()
  const items = [
    { href: '/', icon: BookOpen, label: 'База знаний' },
    { href: '/creatives', icon: Sparkles, label: 'Креативы' },
  ]
  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(({ href, icon: Icon, label }) => (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <Link href={href} className={cn(
                'flex items-center justify-center h-9 w-9 rounded-lg transition-colors mx-auto',
                pathname === href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}>
                <Icon className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </TooltipProvider>
  )
}

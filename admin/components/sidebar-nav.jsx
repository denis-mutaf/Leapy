'use client'
import { NavLink } from './nav-link'
import { BookOpen, Sparkles } from 'lucide-react'

export function SidebarNav() {
  return (
    <nav className="space-y-1">
      <NavLink href="/" icon={BookOpen} label="База знаний" />
      <NavLink href="/creatives" icon={Sparkles} label="Креативы" />
    </nav>
  )
}

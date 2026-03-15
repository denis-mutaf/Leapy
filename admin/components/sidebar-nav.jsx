'use client'
import { NavLink } from './nav-link'
import { BookOpen, Sparkles } from 'lucide-react'

export function SidebarNav() {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wider px-3 mb-3" style={{ color: 'var(--sidebar-label)' }}>
        Навигация
      </p>
      <nav className="space-y-1">
        <NavLink href="/" icon={BookOpen} label="База знаний" />
        <NavLink href="/creatives" icon={Sparkles} label="Креативы" />
      </nav>
    </>
  )
}

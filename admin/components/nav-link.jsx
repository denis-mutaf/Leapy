'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
export function NavLink({ href, icon: Icon, label }) {
  const pathname = usePathname()
  const isActive = pathname === href
  const [hovered, setHovered] = useState(false)
  const linkStyle = isActive
    ? { background: 'var(--sidebar-active)', color: 'var(--sidebar-text-active)' }
    : hovered
      ? { background: 'var(--sidebar-hover)', color: 'var(--sidebar-text-active)' }
      : { color: 'var(--sidebar-text)' }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 w-full"
      style={linkStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {label}
    </Link>
  )
}

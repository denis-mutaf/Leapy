'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Nav link with active state from current pathname.
 */
export default function NavLink({ href, label }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`
        px-4 py-1.5 rounded-lg text-sm transition-default
        ${isActive ? 'opacity-100 bg-section font-medium text-text' : 'text-text opacity-60 hover:opacity-100 hover:bg-section'}
      `}
    >
      {label}
    </Link>
  );
}

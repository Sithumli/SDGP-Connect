// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarNavProps {
  items: SidebarItem[];
  footerItems?: SidebarItem[];
  isOpen: boolean;
  /** Root href that should only match exactly, so it does not stay active on every sub-route. */
  rootHref: string;
}

/**
 * Shared sidebar body. Labels stay mounted and animate their width and opacity: unmounting them on
 * collapse is what made the old sidebar snap rather than glide.
 */
export function SidebarNav({ items, footerItems = [], isOpen, rootHref }: SidebarNavProps) {
  const pathname = usePathname();

  const renderItem = (item: SidebarItem) => {
    const isActive = item.href === rootHref ? pathname === item.href : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        title={isOpen ? undefined : item.title}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium',
          'transition-colors duration-200 ease-out',
          isOpen ? 'justify-start' : 'justify-center',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span
          className={cn(
            'overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out',
            isOpen ? 'ml-3 w-40 opacity-100' : 'ml-0 w-0 opacity-0'
          )}
        >
          {item.title}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden pt-20 pb-4">
      <nav className="flex-1 space-y-1 px-3">{items.map(renderItem)}</nav>

      {footerItems.length > 0 && (
        <nav className="mt-4 space-y-1 border-t px-3 pt-4">{footerItems.map(renderItem)}</nav>
      )}
    </div>
  );
}

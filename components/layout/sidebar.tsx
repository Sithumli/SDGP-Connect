// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
'use client';

import {
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { SidebarNav, type SidebarItem } from './sidebar-nav';

const sidebarItems: SidebarItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'User Management', href: '/admin/users', icon: Users },
  { title: 'Project Overview', href: '/admin/projects', icon: FolderKanban },
  { title: 'Edit Requests', href: '/admin/edit-requests', icon: FolderKanban },
  { title: 'Blog Management', href: '/admin/blogs', icon: BookOpen },
  { title: 'Competitions', href: '/admin/competitions', icon: FolderKanban },
  { title: 'Awards', href: '/admin/awards', icon: FolderKanban },
  { title: 'Email Outbox', href: '/admin/email', icon: Mail },
];

const footerItems: SidebarItem[] = [
  { title: 'My Account', href: '/admin/profile', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 z-40 h-full border-r bg-background',
        'transition-[width] duration-300 ease-in-out will-change-[width]',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <SidebarNav items={sidebarItems} footerItems={footerItems} isOpen={isOpen} rootHref="/admin" />
    </aside>
  );
}

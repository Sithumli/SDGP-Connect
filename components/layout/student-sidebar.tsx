'use client';

import { Award, BookOpen, LayoutDashboard, Settings, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SidebarNav, type SidebarItem } from './sidebar-nav';

const sidebarItems: SidebarItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Submit Details', href: '/dashboard/submit/project', icon: Upload },
  { title: 'Projects', href: '/dashboard/projects', icon: LayoutDashboard },
  { title: 'Blogs', href: '/dashboard/blogs', icon: BookOpen },
  { title: 'Awards', href: '/dashboard/awards', icon: Award },
];

const footerItems: SidebarItem[] = [
  { title: 'My Account', href: '/dashboard/profile', icon: Settings },
];

interface StudentSidebarProps {
  isOpen: boolean;
}

export function StudentSidebar({ isOpen }: StudentSidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 z-40 h-full border-r bg-background',
        'transition-[width] duration-300 ease-in-out will-change-[width]',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <SidebarNav items={sidebarItems} footerItems={footerItems} isOpen={isOpen} rootHref="/dashboard" />
    </aside>
  );
}

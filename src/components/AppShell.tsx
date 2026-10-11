import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import {
  BookOpen, Calendar, ShoppingCart, Globe, Menu, X, Settings,
} from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/',              labelKey: 'nav.recipes',         icon: BookOpen,     end: true  },
  { to: '/meal-planner',  labelKey: 'nav.mealPlanner',     icon: Calendar,     end: false },
  { to: '/grocery',       labelKey: 'nav.groceryList',     icon: ShoppingCart, end: false },
  { to: '/explore',       labelKey: 'nav.cuisineExplorer', icon: Globe,        end: false },
  { to: '/settings',      labelKey: 'nav.settings',        icon: Settings,     end: false },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border">
        <span className="font-bold text-base text-primary">🍴 {t('app.name')}</span>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Language switcher at bottom */}
      <div className="border-t border-border px-4 py-4">
        <LanguageSwitcher />
      </div>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col border-r border-border shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 w-56 bg-background border-r border-border">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex md:hidden items-center gap-3 border-b border-border px-4 py-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">🍴 {t('app.name')}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
    <Toaster richColors position="top-center" />
    </>
  );
}

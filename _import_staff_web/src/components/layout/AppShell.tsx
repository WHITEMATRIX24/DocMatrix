import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrentUser, useLogoutMutation } from '@/hooks/useAuth'
import { DemoBanner } from '@/components/DemoBanner'
import { MedicalCrossMark } from '@/components/MedicalCrossMark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FEATURE_REGISTRY,
  getNavFeaturesByArea,
  getRoadmapFeatures,
} from '@/features/registry'
import { env } from '@/lib/env'
import {
  Menu,
  ChevronRight,
  LogOut,
  User,
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  Receipt,
  BookOpen,
  Package,
  MessageSquare,
  Globe,
  BarChart3,
  Settings,
  Milestone,
} from 'lucide-react'

const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Appointments: Calendar,
  Patients: Users,
  Clinical: Stethoscope,
  Billing: Receipt,
  Accounts: BookOpen,
  Inventory: Package,
  WhatsApp: MessageSquare,
  Website: Globe,
  Reports: BarChart3,
  Settings: Settings,
  Roadmap: Milestone,
}

export const AppShell: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogoutMutation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Find matching feature entry for breadcrumbs & document title
  const currentPath = location.pathname
  const matchedFeature = FEATURE_REGISTRY.find((f) => {
    if (f.route === currentPath) return true
    if (f.route.includes(':id')) {
      const pattern = new RegExp(`^${f.route.replace(':id', '[^/]+')}$`)
      return pattern.test(currentPath)
    }
    return false
  })

  // Dynamic document.title update (C1 requirement)
  useEffect(() => {
    if (currentPath === '/dashboard') {
      document.title = `DocMatrix Staff - ${t('dashboard.title')}`
    } else if (matchedFeature) {
      document.title = `DocMatrix Staff - ${matchedFeature.name}`
    } else {
      document.title = 'DocMatrix Staff'
    }
  }, [currentPath, matchedFeature, t])

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    navigate('/login')
  }

  const navAreas = getNavFeaturesByArea(user?.role)
  const roadmapItems = env.showRoadmap ? getRoadmapFeatures() : []

  const renderNavList = (onNavigate?: () => void) => (
    <div className="space-y-4 py-2">
      {/* Dashboard Top Link */}
      <div>
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`
          }
          data-testid="nav-dashboard"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>{t('dashboard.title')}</span>
        </NavLink>
      </div>

      {/* Grouped Areas */}
      {Object.entries(navAreas).map(([areaName, features]) => {
        const IconComponent = AREA_ICONS[areaName] || Calendar
        return (
          <div key={areaName} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
              <IconComponent className="h-3 w-3 text-muted-foreground/80" />
              <span>{areaName}</span>
            </div>
            <div className="space-y-0.5">
              {features.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.route}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`
                  }
                  data-testid={`nav-item-${item.id}`}
                >
                  <span className="truncate">{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}

      {/* Roadmap Group (when VITE_SHOW_ROADMAP=true) */}
      {roadmapItems.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border/50">
          <div className="px-3 py-1 text-[11px] font-bold text-indigo-600 tracking-wider uppercase flex items-center gap-1.5">
            <Milestone className="h-3 w-3" />
            <span>{t('common.roadmap')}</span>
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {roadmapItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.route}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`
                }
              >
                <span className="truncate">{item.name}</span>
                <span className="text-[10px] uppercase font-mono text-muted-foreground ml-1">
                  {item.phase}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" data-testid="app-shell">
      {/* Permanent visible non-dismissible demo banner */}
      <DemoBanner />

      {/* Skip to content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-12 focus:left-4 focus:z-[70] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('common.skipToContent')}
      </a>

      {/* Top Header */}
      <header className="sticky top-[37px] z-40 w-full border-b bg-background/95 backdrop-blur px-4 sm:px-6 h-14 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Button */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Open navigation menu"
                data-testid="mobile-menu-trigger"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
                  <MedicalCrossMark />
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-primary uppercase">DOC MATRIX</div>
                    <div className="text-sm font-semibold text-foreground">{user?.clinicName || 'Staff Portal'}</div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-2">
                {renderNavList(() => setMobileOpen(false))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Brand Logo & Clinic Name */}
          <Link to="/dashboard" className="hidden sm:flex items-center gap-2.5 group">
            <MedicalCrossMark />
            <div className="flex flex-col">
              <span className="font-black text-[11px] tracking-wider text-primary uppercase leading-tight">DOC MATRIX</span>
              <span className="font-semibold text-xs tracking-tight text-foreground/90 leading-tight truncate max-w-[170px]">
                {user?.clinicName || 'Staff Portal'}
              </span>
            </div>
          </Link>

          {/* Breadcrumbs from registry */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground pl-3 border-l border-border/80">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Home
            </Link>
            {matchedFeature && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <span>{matchedFeature.area}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <span className="font-semibold text-foreground truncate max-w-xs">
                  {matchedFeature.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Header items */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5173` : '#'}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-white text-foreground hover:border-primary hover:text-primary transition-all shadow-xs"
            title="Return to Main Website (localhost:5173)"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>Main Website</span>
          </a>
          <LanguageSwitcher variant="ghost" />

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8 px-2 text-xs font-medium"
                  data-testid="user-menu-trigger"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold text-foreground max-w-[120px] truncate hidden sm:inline">
                    {user.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {user.role}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-semibold leading-none text-foreground">
                      {user.name}
                    </p>
                    <p className="text-[11px] leading-none text-muted-foreground font-mono">
                      {user.role}
                    </p>
                    <p className="text-[11px] leading-none text-primary font-medium pt-1">
                      {user.clinicName}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer gap-2"
                  data-testid="user-menu-logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t('common.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Main Layout Area: Desktop Sidebar + Content */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar (hidden on phone, visible on md+) */}
        <aside
          className="hidden md:block w-64 lg:w-72 shrink-0 border-r bg-muted/10 h-[calc(100vh-91px)] sticky top-[91px] overflow-y-auto px-3 py-4"
          aria-label="Sidebar navigation"
          data-testid="desktop-sidebar"
        >
          {renderNavList()}
        </aside>

        {/* Content Outlet */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell

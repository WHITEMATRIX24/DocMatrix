export interface DashboardMetric {
  id: string
  titleKey: string
  value: string
  subtext: string
  route: string
  badgeText?: string
}

export const DEMO_DASHBOARD_METRICS: DashboardMetric[] = [
  {
    id: 'today-appointments',
    titleKey: 'dashboard.todayAppointments',
    value: '14',
    subtext: '8 confirmed, 3 arrived, 3 waiting',
    route: '/appointments/queue',
    badgeText: 'Live Today',
  },
  {
    id: 'in-queue',
    titleKey: 'dashboard.inQueue',
    value: '3',
    subtext: 'Average wait: 12 mins',
    route: '/appointments/queue',
    badgeText: 'Waiting Room',
  },
  {
    id: 'collections-today',
    titleKey: 'dashboard.collectionsToday',
    value: '₹18,500',
    subtext: '₹12k UPI, ₹6.5k Cash',
    route: '/billing/collection',
    badgeText: 'Daily Accounts',
  },
  {
    id: 'pending-dues',
    titleKey: 'dashboard.pendingDues',
    value: '₹42,300',
    subtext: 'Across 9 patients',
    route: '/billing/dues',
    badgeText: 'Outstanding',
  },
  {
    id: 'low-stock',
    titleKey: 'dashboard.lowStock',
    value: '2 Items',
    subtext: 'Lignocaine, Composite A2',
    route: '/inventory/alerts',
    badgeText: 'Re-order',
  },
  {
    id: 'missed-enquiries',
    titleKey: 'dashboard.missedEnquiries',
    value: '1',
    subtext: 'Online slot booking unconfirmed',
    route: '/appointments/missed-enquiries',
    badgeText: 'Action Required',
  },
]

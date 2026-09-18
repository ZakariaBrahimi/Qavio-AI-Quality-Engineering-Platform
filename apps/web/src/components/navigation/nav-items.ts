import {
  BarChart3,
  Bug,
  FlaskConical,
  LayoutDashboard,
  Plug,
  Settings,
  Shield,
  Smartphone,
  SquareStack,
  Users,
  Eye,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: SquareStack },
  { label: 'Test Runs', href: '/test-runs', icon: FlaskConical },
  { label: 'Issues', href: '/issues', icon: Bug },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Design QA', href: '/design-qa', icon: Eye },
  { label: 'Responsive QA', href: '/responsive-qa', icon: Smartphone },
  { label: 'Security QA', href: '/security-qa', icon: Shield },
  { label: 'Integrations', href: '/integrations', icon: Plug },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

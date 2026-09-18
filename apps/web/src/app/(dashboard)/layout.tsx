import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/navigation/app-sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

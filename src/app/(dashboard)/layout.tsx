import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardTopbar } from "@/components/dashboard-topbar"



export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <DashboardTopbar />
          <main className="flex-1 overflow-y-auto bg-[#F7F9F5] p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
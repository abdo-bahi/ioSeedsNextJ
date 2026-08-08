import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardTopbar } from "@/components/dashboard-topbar"
import { auth } from "@/lib/auth"
import { getUserFarms } from "@/lib/get-user-farms"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AppInitializer } from "@/components/app-initializer"



export default async function Layout({ children }: { children: React.ReactNode }) {

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/login")

    
  // Fetch farms this user has access to
  const farms = await getUserFarms(session.user.id)


  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar farms={farms} user={session.user} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <DashboardTopbar />
          <main className="flex-1 overflow-y-auto bg-[#F7F9F5] p-6">
          <AppInitializer />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
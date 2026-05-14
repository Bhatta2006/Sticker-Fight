import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/AppSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  if (user.role !== "admin") redirect("/unauthorized");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <SidebarProvider>
      <AppSidebar
        userName={user.name ?? null}
        userEmail={user.email ?? null}
        userImage={user.image ?? null}
        signOutAction={signOutAction}
      />

      <SidebarInset>
        {/* Top bar with trigger */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">Admin</span>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

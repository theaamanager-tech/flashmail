import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Plus,
  Inbox,
  Mail,
  Globe,
  Key,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

import { getCurrentUserFn } from "@/lib/server-fns/auth-fns";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  beforeLoad: async () => {
    const session = await getCurrentUserFn();
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
});

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/create", label: "Create Email", icon: Plus },
  { to: "/dashboard/mailboxes", label: "My Mailboxes", icon: Inbox },
  { to: "/dashboard/emails", label: "Email History", icon: Mail },
  { to: "/dashboard/domains", label: "My Domains", icon: Globe },
  { to: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { to: "/dashboard/api-usage", label: "API Usage", icon: Activity },
  { to: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

function DashboardLayout() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    router.navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#303030] bg-[#181818] px-4 lg:hidden">
        <span className="font-display text-lg font-medium">FlashMail</span>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-[#303030] bg-[#181818] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="mb-8 hidden px-2 pt-2 lg:block">
              <span className="font-display text-lg font-medium">Member Dashboard</span>
            </div>

            <nav className="flex-1 space-y-1">
              {nav.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center gap-3 border-t border-[#303030] px-3 py-3 text-left text-sm text-muted-foreground transition hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </aside>

        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClick?: () => void;
}) {
  const router = useRouter();
  const active = exact
    ? router.state.location.pathname === to
    : router.state.location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "border-l-2 border-primary bg-[#303030] text-white"
          : "text-muted-foreground hover:bg-[#303030]/50 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

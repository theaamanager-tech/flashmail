import { Link, useNavigate } from "@tanstack/react-router";
import { Mail, LogOut, User, LayoutDashboard, Shield } from "lucide-react";
import { useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

function Brand({ onSecretClick }: { onSecretClick: () => void }) {
  return (
    <Link to="/" onClick={onSecretClick} className="flex items-center gap-3 shrink-0">
      <div className="flex h-9 w-9 items-center justify-center bg-primary">
        <Mail className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      <span className="font-display text-lg tracking-tight" style={{ fontWeight: 500 }}>
        FlashMail
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const clicksRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLogoClick() {
    clicksRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clicksRef.current = 0;
    }, 1500);
    if (clicksRef.current >= 5) {
      clicksRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
      navigate({ to: profile?.is_admin ? "/admin" : "/" });
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#303030] bg-[#181818]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
        <Brand onSecretClick={handleLogoClick} />

        <div className="flex items-center gap-4">
          <div className="nav-link flex items-center gap-2 text-white/60">
            <span className="hidden sm:inline">Realtime</span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              {profile?.is_admin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => navigate({ to: "/admin" })}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/login" })}>
                <User className="h-4 w-4" />
                Masuk
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/register" })}>
                Daftar
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

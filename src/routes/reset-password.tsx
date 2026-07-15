import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/password-strength";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Password tidak cocok",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" }) as { code?: string };
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function validateCode() {
      const code = search.code;
      if (!code) {
        setError("Link reset tidak valid");
        setValidating(false);
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      setValidating(false);
      if (error) {
        setError(error.message);
      }
    }
    validateCode();
  }, [search.code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form tidak valid");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    toast.success("Password berhasil diubah");
    navigate({ to: "/login" });
  }

  return (
    <div className="relative min-h-screen">
      <SiteHeader />
      <main className="flex items-center justify-center px-4 py-20">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md border border-[#303030] bg-[#181818] p-8 animate-slide-in"
        >
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-medium">Reset Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Buat password baru</p>
          </div>

          {validating ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error && !password ? (
            <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Password Baru</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div>
                <Label htmlFor="confirm">Konfirmasi Password Baru</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Password
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

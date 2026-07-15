import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

const schema = z.object({
  email: z.string().email("Email tidak valid"),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Email tidak valid");
      return;
    }

    setLoading(true);
    const { error: supaError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (supaError) {
      setError(supaError.message);
      return;
    }

    setSent(true);
    toast.success("Link reset password telah dikirim");
  }

  return (
    <div className="relative min-h-screen">
      <SiteHeader />
      <main className="flex items-center justify-center px-4 py-20">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md border border-[#303030] bg-[#181818] p-8 animate-slide-in"
        >
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke login
          </Link>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-medium">Lupa Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Kami akan mengirimkan link reset password.
            </p>
          </div>

          {sent ? (
            <div className="rounded border border-[#303030] bg-[#303030]/30 p-4 text-sm">
              Jika email terdaftar, link reset password telah dikirim ke <b>{email}</b>.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="pl-10"
                  />
                </div>
                {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim Link Reset
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

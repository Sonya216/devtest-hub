import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Daxil ol — DevTest Hub" },
      {
        name: "description",
        content:
          "DevTest Hub-a e-poçt və ya Google ilə daxil olun: layihələr, səhv izləmə və CV.",
      },
      { property: "og:title", content: "Daxil ol — DevTest Hub" },
      {
        property: "og:description",
        content: "Developer və testerlər üçün əməkdaşlıq platformasına giriş.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email({ message: "Düzgün e-poçt daxil edin" }).max(255),
  password: z.string().min(6, { message: "Şifrə ən az 6 simvol olmalıdır" }).max(100),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("developer");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const signIn = async () => {
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      setLastError(error.message);
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/dashboard" });
  };

  const signUp = async () => {
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error("Ad və soyad daxil edin");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName.trim(), role },
      },
    });
    setBusy(false);
    if (error) {
      setLastError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success("Hesab yaradıldı. E-poçtunuzu təsdiqləyin.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLastError(result.error.message ?? 'Google auth error');
      toast.error("Google ilə giriş alınmadı");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  };


  return (
    <div className="hero-surface flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="gradient-primary flex size-9 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
            DT
          </span>
          <span className="font-display text-lg font-bold">DevTest Hub</span>
        </Link>

        <div className="surface-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Daxil ol</TabsTrigger>
              <TabsTrigger value="signup">Qeydiyyat</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-poçt</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad@sirket.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifrə</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={signIn}>
                Daxil ol
              </Button>
              {lastError ? <div className="mt-3 text-sm text-destructive">{lastError}</div> : null}
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad və soyad</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aygün Məmmədova"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">E-poçt</Label>
                <Input
                  id="email2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Şifrə</Label>
                <Input
                  id="password2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rolunuz</Label>
                <RadioGroup value={role} onValueChange={setRole} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="developer" id="r-dev" />
                    <Label htmlFor="r-dev" className="font-normal">
                      Developer
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="tester" id="r-test" />
                    <Label htmlFor="r-test" className="font-normal">
                      Tester
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Button className="w-full" disabled={busy} onClick={signUp}>
                Hesab yarat
              </Button>
              {lastError ? <div className="mt-3 text-sm text-destructive">{lastError}</div> : null}
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            və ya
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Google ilə davam et
          </Button>
        </div>
      </div>
    </div>
  );
}

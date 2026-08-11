import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { SignedImage } from "@/components/SignedMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE, uploadToBucket } from "@/lib/platform";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Profil tənzimləmələri — DevTest Hub" },
      {
        name: "description",
        content: "Profil məlumatlarınızı, bacarıqlarınızı və avatarınızı yeniləyin.",
      },
      { property: "og:title", content: "Profil tənzimləmələri — DevTest Hub" },
      { property: "og:description", content: "Profilinizi idarə edin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, { message: "Ad ən az 2 simvol" }).max(120),
  headline: z.string().trim().max(160),
  bio: z.string().trim().max(2000),
});

function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    role: "developer",
    headline: "",
    bio: "",
    location: "",
    website_url: "",
    github_url: "",
    skills: "",
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "",
      role: data.role ?? "developer",
      headline: data.headline ?? "",
      bio: data.bio ?? "",
      location: data.location ?? "",
      website_url: data.website_url ?? "",
      github_url: data.github_url ?? "",
      skills: (data.skills ?? []).join(", "),
    });
    setAvatar(data.avatar_url);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        role: form.role,
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        website_url: form.website_url.trim(),
        github_url: form.github_url.trim(),
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil yeniləndi");
  };

  const changeAvatar = async (file: File | null) => {
    if (!file || !user) return;
    try {
      const path = await uploadToBucket("avatars", user.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (error) throw error;
      setAvatar(path);
      toast.success("Avatar yeniləndi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükləmə alınmadı");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tənzimləmələr</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profil məlumatlarınızı yeniləyin.</p>
      </div>

      <div className="surface-card flex flex-wrap items-center gap-6 p-6">
        {avatar ? (
          <SignedImage
            bucket="avatars"
            path={avatar}
            alt="Avatar"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl font-bold">
            {form.full_name.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="avatar">Profil şəkli</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={(e) => void changeAvatar(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="surface-card grid gap-4 p-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="s-name">Ad Soyad</Label>
          <Input
            id="s-name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="s-headline">Başlıq</Label>
          <Input
            id="s-headline"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="s-bio">Haqqında</Label>
          <Textarea
            id="s-bio"
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-loc">Yer</Label>
          <Input
            id="s-loc"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-skills">Bacarıqlar (vergüllə)</Label>
          <Input
            id="s-skills"
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-web">Veb sayt</Label>
          <Input
            id="s-web"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-gh">GitHub</Label>
          <Input
            id="s-gh"
            value={form.github_url}
            onChange={(e) => setForm({ ...form, github_url: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Button disabled={busy} onClick={save}>
            Yadda saxla
          </Button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { SignedImage } from "@/components/SignedMedia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE, formatDate } from "@/lib/platform";

export const Route = createFileRoute("/people/$userId")({
  head: () => ({
    meta: [
      { title: "İstifadəçi profili — DevTest Hub" },
      {
        name: "description",
        content: "İstifadəçinin bacarıqları, CV-ləri və platformadakı fəaliyyəti.",
      },
      { property: "og:title", content: "İstifadəçi profili — DevTest Hub" },
      { property: "og:description", content: "Bacarıqlar, təcrübə və əlaqə." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

type Profile = {
  id: string;
  full_name: string;
  role: string;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  location: string | null;
  website_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
  created_at: string;
};

type CV = { id: string; title: string; summary: string | null; is_public: boolean };

function ProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cvs, setCvs] = useState<CV[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("cvs")
          .select("id,title,summary,is_public")
          .eq("user_id", userId)
          .eq("is_public", true),
      ]);
      setProfile((p as Profile) ?? null);
      setCvs((c as CV[]) ?? []);
    };
    void load();
  }, [userId]);

  if (!profile) return <p className="text-sm text-muted-foreground">Yüklənir...</p>;

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-start gap-6 p-6">
        {profile.avatar_url ? (
          <SignedImage
            bucket="avatars"
            path={profile.avatar_url}
            alt={profile.full_name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <Badge variant="outline">{ROLE[profile.role] ?? profile.role}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{profile.headline || "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile.location} · Qeydiyyat: {formatDate(profile.created_at)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate({ to: "/messages" })}>Mesaj göndər</Button>
            {profile.github_url ? (
              <a href={profile.github_url} target="_blank" rel="noreferrer">
                <Button variant="outline">GitHub</Button>
              </a>
            ) : null}
            {profile.website_url ? (
              <a href={profile.website_url} target="_blank" rel="noreferrer">
                <Button variant="outline">Veb sayt</Button>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="text-lg font-semibold">Haqqında</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {profile.bio || "Məlumat yoxdur."}
          </p>
          <div className="mt-4 flex flex-wrap gap-1">
            {(profile.skills ?? []).map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-semibold">Açıq CV-lər</h2>
          <ul className="mt-3 space-y-3">
            {cvs.map((cv) => (
              <li key={cv.id} className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">{cv.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{cv.summary}</p>
              </li>
            ))}
            {cvs.length === 0 && <li className="text-sm text-muted-foreground">Açıq CV yoxdur.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

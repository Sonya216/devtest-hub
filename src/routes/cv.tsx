import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/platform";

export const Route = createFileRoute("/cv")({
  head: () => ({
    meta: [
      { title: "CV yaradıcısı — DevTest Hub" },
      {
        name: "description",
        content: "Peşəkar CV-nizi yaradın, saxlayın və icma ilə paylaşın.",
      },
      { property: "og:title", content: "CV yaradıcısı — DevTest Hub" },
      { property: "og:description", content: "CV yaradın, saxlayın və çap edin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CvPage />
    </RequireAuth>
  ),
});

type ExperienceItem = { role: string; company: string; period: string; details: string };
type EducationItem = { degree: string; school: string; period: string };

type CV = {
  id: string;
  user_id: string;
  title: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  is_public: boolean;
  updated_at: string;
};

const cvSchema = z.object({
  title: z.string().trim().min(2, { message: "Başlıq ən az 2 simvol" }).max(120),
  full_name: z.string().trim().max(120),
  email: z.string().trim().max(255),
  summary: z.string().trim().max(2000),
});

const emptyDraft = {
  title: "Yeni CV",
  full_name: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  skills: "",
  is_public: false,
};

function CvPage() {
  const { user } = useAuth();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setCvs((data as unknown as CV[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const select = (cv: CV) => {
    setActiveId(cv.id);
    setDraft({
      title: cv.title,
      full_name: cv.full_name ?? "",
      email: cv.email ?? "",
      phone: cv.phone ?? "",
      location: cv.location ?? "",
      summary: cv.summary ?? "",
      skills: (cv.skills ?? []).join(", "),
      is_public: cv.is_public,
    });
    setExperience(Array.isArray(cv.experience) ? cv.experience : []);
    setEducation(Array.isArray(cv.education) ? cv.education : []);
  };

  const reset = () => {
    setActiveId(null);
    setDraft({ ...emptyDraft });
    setExperience([]);
    setEducation([]);
  };

  const save = async () => {
    if (!user) return;
    const parsed = cvSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    setBusy(true);
    const payload = {
      user_id: user.id,
      title: draft.title.trim(),
      full_name: draft.full_name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      location: draft.location.trim(),
      summary: draft.summary.trim(),
      skills: draft.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      experience: experience as unknown as never,
      education: education as unknown as never,
      is_public: draft.is_public,
      updated_at: new Date().toISOString(),
    };
    const { error } = activeId
      ? await supabase.from("cvs").update(payload).eq("id", activeId)
      : await supabase.from("cvs").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("CV saxlanıldı");
    reset();
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("cvs").delete().eq("id", id);
    if (activeId === id) reset();
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">CV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CV yaradın, saxlayın və profilinizdə paylaşın.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            Yeni CV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Çap et / PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="surface-card space-y-2 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Saxlanılmış CV-lər
          </h2>
          {cvs.map((cv) => (
            <div key={cv.id} className="rounded-md border border-border p-3">
              <button
                onClick={() => select(cv)}
                className="text-left text-sm font-medium hover:text-primary"
              >
                {cv.title}
              </button>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(cv.updated_at)}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant={cv.is_public ? "default" : "secondary"}>
                  {cv.is_public ? "Açıq" : "Gizli"}
                </Badge>
                <button
                  onClick={() => void remove(cv.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
          {cvs.length === 0 && (
            <p className="text-sm text-muted-foreground">Hələ CV yoxdur.</p>
          )}
        </aside>

        <section className="surface-card space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cv-title">CV başlığı</Label>
              <Input
                id="cv-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-name">Ad Soyad</Label>
              <Input
                id="cv-name"
                value={draft.full_name}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-email">E-poçt</Label>
              <Input
                id="cv-email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-phone">Telefon</Label>
              <Input
                id="cv-phone"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-loc">Yer</Label>
              <Input
                id="cv-loc"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-skills">Bacarıqlar (vergüllə)</Label>
              <Input
                id="cv-skills"
                value={draft.skills}
                onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-summary">Qısa məlumat</Label>
            <Textarea
              id="cv-summary"
              rows={4}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">İş təcrübəsi</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setExperience([...experience, { role: "", company: "", period: "", details: "" }])
                }
              >
                Əlavə et
              </Button>
            </div>
            {experience.map((item, idx) => (
              <div key={idx} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-3">
                <Input
                  placeholder="Vəzifə"
                  value={item.role}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, role: e.target.value };
                    setExperience(next);
                  }}
                />
                <Input
                  placeholder="Şirkət"
                  value={item.company}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, company: e.target.value };
                    setExperience(next);
                  }}
                />
                <Input
                  placeholder="Dövr"
                  value={item.period}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, period: e.target.value };
                    setExperience(next);
                  }}
                />
                <Textarea
                  className="md:col-span-3"
                  rows={2}
                  placeholder="Təfərrüat"
                  value={item.details}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...item, details: e.target.value };
                    setExperience(next);
                  }}
                />
                <button
                  className="text-left text-xs text-destructive hover:underline"
                  onClick={() => setExperience(experience.filter((_, i) => i !== idx))}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Təhsil</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEducation([...education, { degree: "", school: "", period: "" }])}
              >
                Əlavə et
              </Button>
            </div>
            {education.map((item, idx) => (
              <div key={idx} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-3">
                <Input
                  placeholder="İxtisas"
                  value={item.degree}
                  onChange={(e) => {
                    const next = [...education];
                    next[idx] = { ...item, degree: e.target.value };
                    setEducation(next);
                  }}
                />
                <Input
                  placeholder="Təhsil müəssisəsi"
                  value={item.school}
                  onChange={(e) => {
                    const next = [...education];
                    next[idx] = { ...item, school: e.target.value };
                    setEducation(next);
                  }}
                />
                <Input
                  placeholder="Dövr"
                  value={item.period}
                  onChange={(e) => {
                    const next = [...education];
                    next[idx] = { ...item, period: e.target.value };
                    setEducation(next);
                  }}
                />
                <button
                  className="text-left text-xs text-destructive hover:underline"
                  onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted p-3">
            <div>
              <p className="text-sm font-medium">Profildə açıq göstər</p>
              <p className="text-xs text-muted-foreground">
                Açıq CV-lər profil səhifənizdə hamıya görünür.
              </p>
            </div>
            <Switch
              checked={draft.is_public}
              onCheckedChange={(v) => setDraft({ ...draft, is_public: v })}
            />
          </div>

          <Button disabled={busy} onClick={save}>
            {activeId ? "Yenilə" : "CV saxla"}
          </Button>
        </section>
      </div>
    </div>
  );
}

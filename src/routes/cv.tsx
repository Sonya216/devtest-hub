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
import { formatDate, uploadToBucket } from "@/lib/platform";

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

const TEMPLATE_PREVIEWS = [
  {
    id: "modern-1",
    title: "Modern (Pulsuz)",
    price: 0,
    accent: "#4f46e5",
    sample: {
      title: "Frontend Developer CV",
      full_name: "Nigar Məmmədova",
      email: "nigar@example.com",
      phone: "+994 50 000 0000",
      summary: "5+ il React/TypeScript təcrübəsi. Performant və accessibility yönümlü ön tərəf layihələri hazırlamışam.",
      skills: "React,TypeScript,Next.js,GraphQL",
    },
  },
  {
    id: "modern-2",
    title: "Creative (2 AZN)",
    price: 2,
    accent: "#0f766e",
    sample: {
      title: "UI/UX Designer CV",
      full_name: "Elnur Əliyev",
      email: "elnur@example.com",
      phone: "+994 55 111 1111",
      summary: "Dizayn sistemi və istifadəçi yönümlü interfeyslər yaradıram. Prototiplər və istifadəçi testləri edirəm.",
      skills: "Figma,Sketch,User Research,Prototyping",
    },
  },
  {
    id: "modern-3",
    title: "Professional (2 AZN)",
    price: 2,
    accent: "#e11d48",
    sample: {
      title: "Backend Developer CV",
      full_name: "Aysel Rzayeva",
      email: "aysel@example.com",
      phone: "+994 70 222 2222",
      summary: "Node.js və PostgreSQL üzrə 6+ il təcrübə. Mikrosayıt arxitekturaları və performans optimizasiyası üzrə işləyirəm.",
      skills: "Node.js,Postgres,Docker,Kubernetes",
    },
  },
  {
    id: "minimal-1",
    title: "Minimal (Pulsuz)",
    price: 0,
    accent: "#111827",
    sample: {
      title: "Junior Developer CV",
      full_name: "Tural Həsənov",
      email: "tural@example.com",
      phone: "+994 51 333 3333",
      summary: "Təməl proqramlaşdırma bacarıqları, React və Node əsasları. Tez öyrənirəm və komanda işinə uyğunam.",
      skills: "JavaScript,HTML,CSS,Git",
    },
  },
  {
    id: "corporate-1",
    title: "Corporate (2 AZN)",
    price: 2,
    accent: "#0f172a",
    sample: {
      title: "Project Manager CV",
      full_name: "Leyla Məmmədli",
      email: "leyla@example.com",
      phone: "+994 77 444 4444",
      summary: "Layihə idarəetmə, Scrum təcrübəsi və komanda koordinasiyası. Müştəri yönümlü yanaşma.",
      skills: "Scrum,Agile,Stakeholder Management,Planning",
    },
  },
  {
    id: "creative-2",
    title: "Creative Pro (2 AZN)",
    price: 2,
    accent: "#f59e0b",
    sample: {
      title: "Content Strategist CV",
      full_name: "Səidə Quliyeva",
      email: "saida@example.com",
      phone: "+994 99 555 5555",
      summary: "Kontent strategiyası, SEO və marka storytelling sahəsində təcrübə. Kampaniyalar hazırlamışam.",
      skills: "SEO,Content Strategy,Analytics,Copywriting",
    },
  },
];

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
  template?: string | null;
  theme?: string | null;
  photo_path?: string | null;
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
  template: "modern-1",
  theme: "indigo",
  photo_path: "",
};

function CvPage() {
  const { user } = useAuth();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setCvs((data as unknown as CV[]) ?? []);
  }, [user]);

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATE_PREVIEWS.find((x) => x.id === templateId);
    if (!t) return;
    setDraft({
      ...draft,
      template: t.id,
      title: t.sample.title,
      full_name: t.sample.full_name,
      email: t.sample.email,
      phone: t.sample.phone,
      summary: t.sample.summary,
      skills: t.sample.skills,
    });
    setExperience([]);
    setEducation([]);
    toast.success(`${t.title} şablonu tətbiq olundu`);
  };

  useEffect(() => {
    void load();
    if (user) {
      const key = `cv-purchased-${user.id}`;
      setPurchased(Boolean(localStorage.getItem(key)));
    }
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
    // Billing: first CV is free, subsequent CV saves require purchase of template pack (2 AZN)
    if (cvs.length >= 1 && !purchased) {
      setShowPurchase(true);
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
      template: draft.template,
      theme: draft.theme,
      photo_path: draft.photo_path,
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

  const doPurchase = async () => {
    if (!user) return;
    // Simulate payment: mark as purchased in localStorage
    const key = `cv-purchased-${user.id}`;
    localStorage.setItem(key, "1");
    setPurchased(true);
    setShowPurchase(false);
    toast.success("Ödəniş tamamlandı. İndi CV-ni saxlaya bilərsiniz.");
  };

  const onFile = async (file?: File) => {
    if (!file || !user) return;
    try {
      const path = await uploadToBucket("avatars", user.id, file);
      setDraft({ ...draft, photo_path: path });
      toast.success("Şəkil yükləndi");
    } catch (e: any) {
      toast.error(e?.message ?? "Yükləmə alınmadı");
    }
  };

  const exportPdf = () => {
    const el = document.getElementById("cv-print-area");
    if (!el) return;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>CV</title>`);
    w.document.write(`<style>body{font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px} .cv-container{max-width:800px;margin:0 auto} img{max-width:120px;border-radius:8px}</style>`);
    w.document.write(`</head><body>`);
    w.document.write(el.innerHTML);
    w.document.write(`</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
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

      <div className="mt-4">
        <h2 className="text-lg font-semibold">CV Nümunələri</h2>
        <p className="text-sm text-muted-foreground">Hazır şablonlardan birini seçin və dərhal redaktə edin. İlk şablon pulsuzdur.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TEMPLATE_PREVIEWS.map((t) => (
            <div key={t.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{t.title}</h4>
                  <p className="text-xs text-muted-foreground">{t.sample.title} nümunəsi</p>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 6, background: t.accent }} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.sample.summary.slice(0, 80)}...</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => applyTemplate(t.id)}>Şablonu istifadə et</Button>
                {t.price > 0 && <Button variant="outline" size="sm">{t.price} AZN</Button>}
              </div>
            </div>
          ))}
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Şəkil (profil)</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFile(e.target.files?.[0])}
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label>Şablon</Label>
              <select
                value={draft.template}
                onChange={(e) => setDraft({ ...draft, template: e.target.value })}
                className="w-full rounded-md border px-2 py-1"
              >
                <option value="modern-1">Modern — Pulsuz</option>
                <option value="modern-2">Creative — 2 AZN</option>
                <option value="modern-3">Professional — 2 AZN</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Rəng</Label>
              <div className="flex gap-2">
                {['indigo','teal','rose','amber'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, theme: c })}
                    className={`h-8 w-8 rounded ${c === draft.theme ? 'ring-2 ring-offset-1' : ''}`}
                    style={{ background: c === 'indigo' ? '#4f46e5' : c === 'teal' ? '#0f766e' : c === 'rose' ? '#e11d48' : '#f59e0b' }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold">Önizləmə</h3>
            <div id="cv-print-area" className="cv-container mt-2 rounded-md border p-4">
              <div className="flex items-center gap-4">
                {draft.photo_path ? (
                  // show uploaded image via signed url when available
                  <img src={draft.photo_path.startsWith('http') ? draft.photo_path : `/` + draft.photo_path} alt="profile" />
                ) : (
                  <div className="h-24 w-24 rounded bg-muted" />
                )}
                <div>
                  <h2 className="text-lg font-bold">{draft.full_name || 'Ad Soyad'}</h2>
                  <p className="text-sm text-muted-foreground">{draft.title}</p>
                  <p className="text-sm">{draft.email} {draft.phone ? `· ${draft.phone}` : ''}</p>
                </div>
              </div>
              <div className="mt-3">
                <p>{draft.summary}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={exportPdf}>PDF saxla</Button>
              <Button variant="outline" onClick={() => window.print()}>Çap et</Button>
            </div>
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

          <div>
            <Button disabled={busy} onClick={save}>
              {activeId ? "Yenilə" : "CV saxla"}
            </Button>
            {showPurchase && (
              <div className="mt-4 rounded-md border border-border bg-background p-4">
                <h3 className="text-lg font-semibold">Ödəniş tələb olunur</h3>
                <p className="mt-1 text-sm text-muted-foreground">Bu xidmətdən sonra əlavə CV-lər üçün 2 AZN ödəniş tələb olunur. İlk CV pulsuzdur.</p>
                <div className="mt-3 flex gap-2">
                  <Button onClick={doPurchase}>Ödə 2 AZN</Button>
                  <Button variant="outline" onClick={() => setShowPurchase(false)}>Ləğv</Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

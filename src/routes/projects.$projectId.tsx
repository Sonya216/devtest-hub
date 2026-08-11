import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SEVERITY, STATUS, formatDate, notify, uploadToBucket } from "@/lib/platform";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Layihə səhifəsi — DevTest Hub" },
      {
        name: "description",
        content: "Layihə detalları, komanda üzvləri və layihəyə aid səhv hesabatları.",
      },
      { property: "og:title", content: "Layihə səhifəsi — DevTest Hub" },
      { property: "og:description", content: "Komanda, texnologiyalar və səhv izləmə lövhəsi." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProjectPage />
    </RequireAuth>
  ),
});

type Project = {
  id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  tech_stack: string[];
  status: string;
  owner_id: string;
  created_at: string;
};

type Member = { id: string; user_id: string; role: string };
type Profile = { id: string; full_name: string; role: string; headline: string | null };
type BugRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  reporter_id: string;
};

const bugSchema = z.object({
  title: z.string().trim().min(4, { message: "Başlıq ən az 4 simvol" }).max(160),
  description: z.string().trim().max(4000),
  steps: z.string().trim().max(4000),
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<(Member & { profile?: Profile })[]>([]);
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    steps: "",
    severity: "medium",
  });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: b }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase.from("project_members").select("id,user_id,role").eq("project_id", projectId),
      supabase
        .from("bugs")
        .select("id,title,severity,status,created_at,reporter_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
    setProject((p as Project) ?? null);
    setBugs((b as BugRow[]) ?? []);
    const rows = (m as Member[]) ?? [];
    if (rows.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,role,headline")
        .in(
          "id",
          rows.map((r) => r.user_id),
        );
      setMembers(
        rows.map((r) => ({
          ...r,
          profile: (profiles as Profile[] | null)?.find((pr) => pr.id === r.user_id),
        })),
      );
    } else {
      setMembers([]);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const join = async (role: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: user.id, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (project && project.owner_id !== user.id) {
      await notify(
        project.owner_id,
        "Yeni komanda üzvü",
        `${project.name} layihəsinə yeni ${role} qoşuldu.`,
        `/projects/${projectId}`,
      );
    }
    toast.success("Layihəyə qoşuldunuz");
    void load();
  };

  const leave = async () => {
    if (!user) return;
    await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    void load();
  };

  const reportBug = async () => {
    const parsed = bugSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      let screenshot = "";
      if (file) screenshot = await uploadToBucket("screenshots", user.id, file);
      const { data, error } = await supabase
        .from("bugs")
        .insert({
          project_id: projectId,
          reporter_id: user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          steps: parsed.data.steps,
          severity: form.severity,
          screenshot_url: screenshot,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (project && project.owner_id !== user.id) {
        await notify(
          project.owner_id,
          "Yeni səhv hesabatı",
          `${project.name}: ${parsed.data.title}`,
          `/bugs/${data.id}`,
          "bug",
        );
      }
      toast.success("Səhv hesabatı göndərildi");
      setOpen(false);
      setForm({ title: "", description: "", steps: "", severity: "medium" });
      setFile(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta baş verdi");
    } finally {
      setBusy(false);
    }
  };

  if (!project) return <p className="text-sm text-muted-foreground">Yüklənir...</p>;

  const isMember = members.some((m) => m.user_id === user?.id);

  return (
    <div className="space-y-8">
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-1">
              {project.tech_stack.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
            {project.repo_url ? (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-2"
              >
                Repozitoriya
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isMember ? (
              <Button variant="outline" onClick={leave}>
                Layihədən çıx
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => join("developer")}>
                  Developer kimi qoşul
                </Button>
                <Button variant="outline" onClick={() => join("tester")}>
                  Tester kimi qoşul
                </Button>
              </>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Səhv bildir</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Səhv hesabatı</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="b-title">Başlıq</Label>
                    <Input
                      id="b-title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-desc">Təsvir</Label>
                    <Textarea
                      id="b-desc"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-steps">Təkrarlama addımları</Label>
                    <Textarea
                      id="b-steps"
                      rows={3}
                      value={form.steps}
                      onChange={(e) => setForm({ ...form, steps: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciddiyyət</Label>
                    <Select
                      value={form.severity}
                      onValueChange={(v) => setForm({ ...form, severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SEVERITY).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-shot">Ekran görüntüsü</Label>
                    <Input
                      id="b-shot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button disabled={busy} onClick={reportBug}>
                    Göndər
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Səhvlər</h2>
          <div className="mt-4 divide-y divide-border">
            {bugs.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">Bu layihədə səhv yoxdur.</p>
            )}
            {bugs.map((bug) => (
              <Link
                key={bug.id}
                to="/bugs/$bugId"
                params={{ bugId: bug.id }}
                className="flex flex-wrap items-center gap-3 py-3 transition-colors hover:text-primary"
              >
                <span className="flex-1 text-sm font-medium">{bug.title}</span>
                <Badge variant="outline">{SEVERITY[bug.severity] ?? bug.severity}</Badge>
                <Badge variant="secondary">{STATUS[bug.status] ?? bug.status}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(bug.created_at)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-semibold">Komanda</h2>
          <ul className="mt-4 space-y-3">
            {members.length === 0 && (
              <li className="text-sm text-muted-foreground">Hələ üzv yoxdur.</li>
            )}
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <button
                  className="text-left text-sm font-medium hover:text-primary"
                  onClick={() => navigate({ to: "/people/$userId", params: { userId: m.user_id } })}
                >
                  {m.profile?.full_name || "İstifadəçi"}
                </button>
                <Badge variant="outline">{m.role}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/platform";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Layihələr — DevTest Hub" },
      {
        name: "description",
        content: "Developer və testerlərin birgə işlədiyi layihələri kəşf edin və yenisini yaradın.",
      },
      { property: "og:title", content: "Layihələr — DevTest Hub" },
      { property: "og:description", content: "Komanda layihələri, texnologiya yığını və statuslar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProjectsPage />
    </RequireAuth>
  ),
});

type Project = {
  id: string;
  name: string;
  description: string | null;
  tech_stack: string[];
  status: string;
  created_at: string;
  owner_id: string;
};

const schema = z.object({
  name: z.string().trim().min(2, { message: "Layihə adı ən az 2 simvol" }).max(120),
  description: z.string().trim().max(2000),
  repo_url: z.string().trim().max(300),
});

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", repo_url: "", tech: "" });
  const [query, setQuery] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id,name,description,tech_stack,status,created_at,owner_id")
      .order("created_at", { ascending: false });
    setProjects((data as Project[]) ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    if (!user) return;
    const { error } = await supabase.from("projects").insert({
      owner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      repo_url: parsed.data.repo_url,
      tech_stack: form.tech
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Layihə yaradıldı");
    setOpen(false);
    setForm({ name: "", description: "", repo_url: "", tech: "" });
    void load();
  };

  const filtered = projects.filter((p) =>
    (p.name + " " + (p.description ?? "")).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Layihələr</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Layihə səhifələri, komanda üzvləri və səhv izləmə.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Yeni layihə</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni layihə</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Ad</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Təsvir</Label>
                <Textarea
                  id="p-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-repo">Repozitoriya linki</Label>
                <Input
                  id="p-repo"
                  value={form.repo_url}
                  onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-tech">Texnologiyalar (vergüllə)</Label>
                <Input
                  id="p-tech"
                  value={form.tech}
                  onChange={(e) => setForm({ ...form, tech: e.target.value })}
                  placeholder="React, Node.js, Cypress"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>Yarat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Layihə axtar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            to="/projects/$projectId"
            params={{ projectId: p.id }}
            className="surface-card lift-on-hover flex flex-col gap-3 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
            </div>
            <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
            <div className="flex flex-wrap gap-1">
              {p.tech_stack.slice(0, 5).map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
            <span className="mt-auto text-xs text-muted-foreground">
              {formatDate(p.created_at)}
            </span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Layihə tapılmadı.</p>
        )}
      </div>
    </div>
  );
}

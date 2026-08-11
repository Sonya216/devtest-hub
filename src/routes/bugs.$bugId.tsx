import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { SignedImage, SignedLink } from "@/components/SignedMedia";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { SEVERITY, STATUS, formatDate, notify, uploadToBucket } from "@/lib/platform";

export const Route = createFileRoute("/bugs/$bugId")({
  head: () => ({
    meta: [
      { title: "Səhv detalları — DevTest Hub" },
      {
        name: "description",
        content: "Səhv hesabatının təsviri, addımları, ekran görüntüsü, faylları və şərhləri.",
      },
      { property: "og:title", content: "Səhv detalları — DevTest Hub" },
      { property: "og:description", content: "Səhv hesabatı, status dəyişikliyi və müzakirə." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <BugPage />
    </RequireAuth>
  ),
});

type Bug = {
  id: string;
  project_id: string;
  reporter_id: string;
  assignee_id: string | null;
  title: string;
  description: string | null;
  steps: string | null;
  severity: string;
  status: string;
  screenshot_url: string | null;
  created_at: string;
};

type Comment = { id: string; author_id: string; body: string; created_at: string };
type Attachment = {
  id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  uploader_id: string;
};

function BugPage() {
  const { bugId } = Route.useParams();
  const { user } = useAuth();
  const [bug, setBug] = useState<Bug | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [projectName, setProjectName] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [body, setBody] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data: b } = await supabase.from("bugs").select("*").eq("id", bugId).maybeSingle();
    const bugRow = (b as Bug) ?? null;
    setBug(bugRow);
    if (!bugRow) return;
    const [{ data: c }, { data: a }, { data: p }] = await Promise.all([
      supabase
        .from("bug_comments")
        .select("id,author_id,body,created_at")
        .eq("bug_id", bugId)
        .order("created_at", { ascending: true }),
      supabase
        .from("attachments")
        .select("id,bucket,storage_path,file_name,uploader_id")
        .eq("bug_id", bugId),
      supabase.from("projects").select("name").eq("id", bugRow.project_id).maybeSingle(),
    ]);
    setComments((c as Comment[]) ?? []);
    setAttachments((a as Attachment[]) ?? []);
    setProjectName((p as { name: string } | null)?.name ?? "");

    const ids = new Set<string>([bugRow.reporter_id]);
    if (bugRow.assignee_id) ids.add(bugRow.assignee_id);
    for (const cm of (c as Comment[]) ?? []) ids.add(cm.author_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", Array.from(ids));
    const map: Record<string, string> = {};
    for (const pr of (profiles as { id: string; full_name: string }[]) ?? [])
      map[pr.id] = pr.full_name;
    setNames(map);
  }, [bugId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateBug = async (patch: Partial<Bug>) => {
    const { error } = await supabase.from("bugs").update(patch).eq("id", bugId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Yeniləndi");
    void load();
  };

  const addComment = async () => {
    if (!user || body.trim().length < 2) return;
    const { error } = await supabase
      .from("bug_comments")
      .insert({ bug_id: bugId, author_id: user.id, body: body.trim().slice(0, 2000) });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (bug && bug.reporter_id !== user.id) {
      await notify(bug.reporter_id, "Yeni şərh", bug.title, `/bugs/${bugId}`, "comment");
    }
    setBody("");
    void load();
  };

  const upload = async (file: File | null) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = await uploadToBucket("files", user.id, file);
      const { error } = await supabase.from("attachments").insert({
        bug_id: bugId,
        uploader_id: user.id,
        bucket: "files",
        storage_path: path,
        file_name: file.name,
        file_type: file.type,
      });
      if (error) throw error;
      toast.success("Fayl yükləndi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükləmə alınmadı");
    } finally {
      setUploading(false);
    }
  };

  if (!bug) return <p className="text-sm text-muted-foreground">Yüklənir...</p>;

  const canEdit = user?.id === bug.reporter_id || user?.id === bug.assignee_id;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="surface-card p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              to="/projects/$projectId"
              params={{ projectId: bug.project_id }}
              className="text-primary hover:underline"
            >
              {projectName}
            </Link>
            <span>·</span>
            <span>{formatDate(bug.created_at)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{bug.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{SEVERITY[bug.severity] ?? bug.severity}</Badge>
            <Badge variant="secondary">{STATUS[bug.status] ?? bug.status}</Badge>
            <Badge variant="outline">Bildirən: {names[bug.reporter_id] ?? "—"}</Badge>
          </div>

          {bug.description ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Təsvir
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{bug.description}</p>
            </div>
          ) : null}

          {bug.steps ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Təkrarlama addımları
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{bug.steps}</p>
            </div>
          ) : null}

          {bug.screenshot_url ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Ekran görüntüsü
              </h2>
              <SignedImage
                bucket="screenshots"
                path={bug.screenshot_url}
                alt={`${bug.title} ekran görüntüsü`}
                className="mt-2 w-full rounded-lg border border-border"
              />
            </div>
          ) : null}
        </div>

        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold">Şərhlər</h2>
          <ul className="mt-4 space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-md bg-muted p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{names[c.author_id] ?? "—"}</span>
                  <span>{formatDate(c.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
            {comments.length === 0 && (
              <li className="text-sm text-muted-foreground">Hələ şərh yoxdur.</li>
            )}
          </ul>
          <div className="mt-4 space-y-2">
            <Textarea
              rows={3}
              placeholder="Şərh yazın..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button onClick={addComment}>Şərh əlavə et</Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface-card space-y-4 p-6">
          <h2 className="text-lg font-semibold">İdarəetmə</h2>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={bug.status}
              onValueChange={(v) => void updateBug({ status: v })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ciddiyyət</Label>
            <Select
              value={bug.severity}
              onValueChange={(v) => void updateBug({ severity: v })}
              disabled={!canEdit}
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
          {user && bug.assignee_id !== user.id && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void updateBug({ assignee_id: user.id })}
            >
              Üzərimə götür
            </Button>
          )}
          {bug.assignee_id && (
            <p className="text-xs text-muted-foreground">
              Məsul: {names[bug.assignee_id] ?? "—"}
            </p>
          )}
        </div>

        <div className="surface-card space-y-3 p-6">
          <h2 className="text-lg font-semibold">Fayllar</h2>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id}>
                <SignedLink bucket={a.bucket} path={a.storage_path} label={a.file_name} />
              </li>
            ))}
            {attachments.length === 0 && (
              <li className="text-sm text-muted-foreground">Fayl yoxdur.</li>
            )}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="att">Fayl yüklə</Label>
            <Input
              id="att"
              type="file"
              disabled={uploading}
              onChange={(e) => void upload(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

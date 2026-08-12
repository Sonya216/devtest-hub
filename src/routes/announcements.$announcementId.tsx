import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { notify } from "@/lib/platform";

export const Route = createFileRoute("/announcements/$announcementId")({
  head: () => ({
    meta: [{ title: "Elan — DevTest Hub" }],
  }),
  component: () => (
    <RequireAuth>
      <AnnouncementPage />
    </RequireAuth>
  ),
});

type Announcement = { id: string; title: string; body: string | null; created_at: string; owner_id: string };

type Comment = { id: string; announcement_id: string; author_id: string; body: string; created_at: string };

type Profile = { id: string; full_name: string };

function AnnouncementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { announcementId } = Route.useParams();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);

  const bookmarkKey = `devtest-hub-saved-announcements`;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(bookmarkKey) ?? "[]") as string[];
    const ids = new Set<string>(stored);
    setSaved(ids.has(announcementId));
  }, [announcementId]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("announcements").select("*").eq("id", announcementId).maybeSingle();
    const announcement = (data as Announcement) ?? null;
    setAnn(announcement);
    if (announcement?.owner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,full_name")
        .eq("id", announcement.owner_id)
        .maybeSingle();
      setOwner((profile as Profile) ?? null);
    }
    const { data: c } = await supabase
      .from("announcement_comments")
      .select("id,announcement_id,author_id,body,created_at")
      .eq("announcement_id", announcementId)
      .order("created_at", { ascending: true });
    setComments((c as Comment[]) ?? []);
  }, [announcementId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addComment = async () => {
    if (!user || body.trim().length < 2) return;
    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: announcementId,
      author_id: user.id,
      body: body.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (ann?.owner_id && ann.owner_id !== user.id) {
      await notify(ann.owner_id, "Yeni elan şərhi", `Sənin elanına yeni şərh yazıldı.`, `/announcements/${announcementId}`);
    }
    setBody("");
    void load();
  };

  const toggleSave = () => {
    if (!announcementId) return;
    const current = new Set<string>(JSON.parse(localStorage.getItem(bookmarkKey) ?? "[]") as string[]);
    if (current.has(announcementId)) {
      current.delete(announcementId);
      setSaved(false);
      toast.success("Elan qeydiyyatdan silindi");
    } else {
      current.add(announcementId);
      setSaved(true);
      toast.success("Elan yadda saxlanıldı");
    }
    localStorage.setItem(bookmarkKey, JSON.stringify(Array.from(current)));
  };

  const shareAnnouncement = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Keçid kopyalandı");
    } catch {
      toast.error("Keçidi kopyalamaq alınmadı");
    }
  };

  if (!ann) return <p className="text-sm text-muted-foreground">Yüklənir...</p>;

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <h1 className="text-2xl font-bold">{ann.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{ann.body}</p>
        {owner && (
          <p className="mt-3 text-sm text-muted-foreground">
            Müəllif: <span className="font-medium text-foreground">{owner.full_name}</span>
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/announcements/">
            <Button variant="outline">Geri</Button>
          </Link>
          <Button variant="outline" onClick={toggleSave}>
            {saved ? "Yadda saxlanıb" : "Yadda saxla"}
          </Button>
          <Button variant="outline" onClick={shareAnnouncement}>Paylaş</Button>
          {owner && (
            <Button onClick={() => navigate({ to: "/messages", search: `?target=${owner.id}` })}>
              Mesaj göndər
            </Button>
          )}
        </div>
      </div>

      <section className="surface-card p-6">
        <h2 className="text-lg font-semibold">Şərhlər</h2>
        <div className="mt-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md bg-muted p-3">
              <p className="text-sm">{c.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <input className="flex-1 rounded-md border px-3 py-2" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Şərh yazın..." />
            <Button onClick={addComment}>Göndər</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

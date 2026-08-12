import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/announcements/")({
  head: () => ({
    meta: [{ title: "Elanlar — DevTest Hub" }],
  }),
  component: () => (
    <RequireAuth>
      <AnnouncementsPage />
    </RequireAuth>
  ),
});

type Announcement = { id: string; title: string; body: string | null; created_at: string; owner_id: string };

function AnnouncementsPage() {
  const [ann, setAnn] = useState<Announcement[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewSaved, setViewSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const bookmarkKey = `devtest-hub-saved-announcements`;

  const loadSavedIds = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(bookmarkKey) ?? "[]") as string[];
      setSavedIds(new Set(stored));
    } catch {
      setSavedIds(new Set());
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("announcements").select("id,title,body,created_at,owner_id").order("created_at", { ascending: false }).limit(200);
      setAnn((data as Announcement[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    loadSavedIds();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === bookmarkKey) {
        loadSavedIds();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const filtered = ann.filter((a) => (a.title + " " + (a.body ?? "")).toLowerCase().includes(query.toLowerCase()));
  const displayed = filtered.filter((a) => (viewSaved ? savedIds.has(a.id) : true));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Elanlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elanları baxın və yeni elan yaradın.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={viewSaved ? "outline" : "secondary"} onClick={() => setViewSaved(false)}>
            Hamısı
          </Button>
          <Button variant={viewSaved ? "secondary" : "outline"} onClick={() => setViewSaved(true)}>
            Yadda saxlanmışlar ({savedIds.size})
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Axtar..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Link to="/announcements/new">
            <Button>Yeni elan</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {loading && <p className="text-sm text-muted-foreground">Yüklənir...</p>}
        {!loading && displayed.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {viewSaved ? "Saxlanmış elan tapılmadı." : "Elan tapılmadı."}
          </p>
        )}
        {displayed.map((a) => (
          <Link key={a.id} to="/announcements/$announcementId" params={{ announcementId: a.id }} className="surface-card p-4 block">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{a.title}</h2>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{a.body ? a.body.slice(0, 200) : "-"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

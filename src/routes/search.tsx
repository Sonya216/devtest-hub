import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { formatDate } from "@/lib/platform";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Axtarış — DevTest Hub" },
      { name: "description", content: "Axtarış nəticələri: istifadəçilər, layihələr və səhvlər." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SearchPage />
    </RequireAuth>
  ),
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const search = useRouterState({ select: (s) => s.location.search });

  useEffect(() => {
    try {
      const params = new URLSearchParams(search || "");
      const q = params.get("query") ?? "";
      setQuery(q);
    } catch {
      // ignore
    }
  }, [search]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const q = `%${query}%`;
        const [p, pr, b] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,full_name,role,headline,skills,location")
            .ilike("full_name", q)
            .limit(10),
          supabase
            .from("projects")
            .select("id,name,description")
            .ilike("name", q)
            .limit(10),
          supabase
            .from("bugs")
            .select("id,title,severity,status,created_at,project_id")
            .ilike("title", q)
            .limit(10),
        ]);
        if (cancelled) return;
        setProfiles((p.data as any[]) ?? []);
        setProjects((pr.data as any[]) ?? []);
        setBugs((b.data as any[]) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Axtarış</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nəticələr: istifadəçilər, layihələr və səhvlər.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface-card p-4">
          <h2 className="text-lg font-semibold">İstifadəçilər</h2>
          {loading && <p className="text-sm text-muted-foreground">Yüklənir...</p>}
          {!loading && profiles.length === 0 && <p className="text-sm text-muted-foreground">Tapılmadı.</p>}
          <ul className="mt-3 space-y-2">
            {profiles.map((p) => (
              <li key={p.id}>
                <Link to="/people/$userId" params={{ userId: p.id }} className="block">
                  <div className="text-sm font-medium">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">{p.headline || "-"}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-4">
          <h2 className="text-lg font-semibold">Layihələr</h2>
          {!loading && projects.length === 0 && <p className="text-sm text-muted-foreground">Tapılmadı.</p>}
          <ul className="mt-3 space-y-2">
            {projects.map((prj) => (
              <li key={prj.id}>
                <Link to="/projects/$projectId" params={{ projectId: prj.id }} className="block">
                  <div className="text-sm font-medium">{prj.name}</div>
                  <div className="text-xs text-muted-foreground">{prj.description || "-"}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-4">
          <h2 className="text-lg font-semibold">Səhvlər</h2>
          {!loading && bugs.length === 0 && <p className="text-sm text-muted-foreground">Tapılmadı.</p>}
          <ul className="mt-3 space-y-2">
            {bugs.map((b) => (
              <li key={b.id}>
                <Link to="/bugs/$bugId" params={{ bugId: b.id }} className="block">
                  <div className="text-sm font-medium">{b.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(b.created_at)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

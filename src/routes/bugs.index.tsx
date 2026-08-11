import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEVERITY, STATUS, formatDate } from "@/lib/platform";

export const Route = createFileRoute("/bugs/")({
  head: () => ({
    meta: [
      { title: "Səhv izləmə — DevTest Hub" },
      {
        name: "description",
        content: "Bütün səhv hesabatlarını statusa və ciddiyyətə görə filtrləyin və izləyin.",
      },
      { property: "og:title", content: "Səhv izləmə — DevTest Hub" },
      { property: "og:description", content: "Səhv hesabatları, statuslar və ciddiyyət səviyyələri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <BugsPage />
    </RequireAuth>
  ),
});

type BugRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  project_id: string;
};

function BugsPage() {
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      const [{ data: b }, { data: p }] = await Promise.all([
        supabase
          .from("bugs")
          .select("id,title,severity,status,created_at,project_id")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("projects").select("id,name"),
      ]);
      setBugs((b as BugRow[]) ?? []);
      const map: Record<string, string> = {};
      for (const row of (p as { id: string; name: string }[]) ?? []) map[row.id] = row.name;
      setProjects(map);
    };
    void load();
  }, []);

  const filtered = bugs.filter(
    (b) =>
      (status === "all" || b.status === status) &&
      (severity === "all" || b.severity === severity) &&
      b.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Səhv izləmə</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Səhv bildirmək üçün müvafiq layihə səhifəsinə keçin.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Başlıqda axtar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            {Object.entries(STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün ciddiyyətlər</SelectItem>
            {Object.entries(SEVERITY).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card divide-y divide-border p-2">
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Nəticə tapılmadı.</p>
        )}
        {filtered.map((bug) => (
          <Link
            key={bug.id}
            to="/bugs/$bugId"
            params={{ bugId: bug.id }}
            className="flex flex-wrap items-center gap-3 rounded-md px-4 py-3 transition-colors hover:bg-muted"
          >
            <span className="flex-1 text-sm font-medium">{bug.title}</span>
            <span className="text-xs text-muted-foreground">{projects[bug.project_id]}</span>
            <Badge variant="outline">{SEVERITY[bug.severity] ?? bug.severity}</Badge>
            <Badge variant="secondary">{STATUS[bug.status] ?? bug.status}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(bug.created_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

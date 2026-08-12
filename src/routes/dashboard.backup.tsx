import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bug, FileText, FolderKanban, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEVERITY, STATUS, formatDate } from "@/lib/platform";

export const Route = createFileRoute("/dashboard/backup")({
  head: () => ({
    meta: [
      { title: "İdarə paneli — DevTest Hub" },
      {
        name: "description",
        content: "Layihələriniz, təyin olunmuş səhvlər və son fəaliyyət bir ekranda.",
      },
      { property: "og:title", content: "İdarə paneli — DevTest Hub" },
      { property: "og:description", content: "Layihələr, səhvlər və mesajlar bir yerdə." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
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

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, bugs: 0, assigned: 0, unread: 0 });
  const [recent, setRecent] = useState<BugRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [projects, bugs, assigned, unread, latest] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("bugs").select("id", { count: "exact", head: true }),
        supabase
          .from("bugs")
          .select("id", { count: "exact", head: true })
          .eq("assignee_id", user.id),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("read", false),
        supabase
          .from("bugs")
          .select("id,title,severity,status,created_at,project_id")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      setStats({
        projects: projects.count ?? 0,
        bugs: bugs.count ?? 0,
        assigned: assigned.count ?? 0,
        unread: unread.count ?? 0,
      });
      setRecent((latest.data as BugRow[]) ?? []);
    };
    void load();
  }, [user]);

  const cards = [
    { label: "Layihələr", value: stats.projects, icon: FolderKanban, to: "/projects" as const },
    { label: "Səhv hesabatları", value: stats.bugs, icon: Bug, to: "/bugs" as const },
    { label: "Mənə təyin olunan", value: stats.assigned, icon: FileText, to: "/bugs" as const },
    {
      label: "Oxunmamış mesaj",
      value: stats.unread,
      icon: MessageSquare,
      to: "/messages" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">İdarə paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Komandanızın cari vəziyyətinə ümumi baxış.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects">
            <Button variant="outline">Layihələr</Button>
          </Link>
          <Link to="/bugs">
            <Button>Səhv bildir</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="surface-card lift-on-hover p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="surface-card p-6">
        <h2 className="text-lg font-semibold">Son səhv hesabatları</h2>
        <div className="mt-4 divide-y divide-border">
          {recent.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">Hələ səhv hesabatı yoxdur.</p>
          )}
          {recent.map((bug) => (
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
    </div>
  );
}

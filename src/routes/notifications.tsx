import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/platform";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Bildirişlər — DevTest Hub" },
      {
        name: "description",
        content: "Səhv hesabatları, şərhlər və komanda fəaliyyəti üzrə bildirişlər.",
      },
      { property: "og:title", content: "Bildirişlər — DevTest Hub" },
      { property: "og:description", content: "Bütün platforma bildirişləriniz bir yerdə." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <NotificationsPage />
    </RequireAuth>
  ),
});

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string;
  read: boolean;
  created_at: string;
};

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as Notification[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    void load();
  };

  const open = async (n: Notification) => {
    if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    if (n.link) navigate({ to: n.link });
    else void load();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Bildirişlər</h1>
        <Button variant="outline" onClick={markAll}>
          Hamısını oxunmuş et
        </Button>
      </div>

      <div className="surface-card divide-y divide-border p-2">
        {items.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Bildiriş yoxdur.</p>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => void open(n)}
            className={cn(
              "flex w-full flex-wrap items-center gap-3 rounded-md px-4 py-3 text-left transition-colors hover:bg-muted",
              !n.read && "bg-muted/60",
            )}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
            </div>
            <Badge variant="outline">{n.type}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(n.created_at)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Bug,
  FileText,
  FolderKanban,
  Megaphone,
  LogOut,
  MessageSquare,
  Users,
  Menu,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/dashboard", label: "İdarə paneli", icon: LayoutDashboard },
  { to: "/projects", label: "Layihələr", icon: FolderKanban },
    { to: "/bugs", label: "Səhvlər", icon: Bug },
    { to: "/announcements", label: "Elanlar", icon: Megaphone },
  { to: "/messages", label: "Mesajlar", icon: MessageSquare },
  { to: "/people", label: "İcma", icon: Users },
  { to: "/cv", label: "CV", icon: FileText },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (!cancelled) setUnread(count ?? 0);
    };
    void load();
    const channel = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menyu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="mt-8 flex flex-col gap-1">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="gradient-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
              DT
            </span>
            <span className="font-display text-base font-bold tracking-tight">DevTest Hub</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            <NavLinks />
          </nav>

          <div className="ml-6 hidden items-center gap-2 md:flex">
            <Input
              className="w-80"
              placeholder="Tester, developer, elan, layihə və ya bacarıq axtar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  void navigate({ to: `/search?query=${encodeURIComponent(query.trim())}` });
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Axtar"
              onClick={() => {
                if (query.trim()) void navigate({ to: `/search?query=${encodeURIComponent(query.trim())}` });
              }}
            >
              <Search className="size-4" />
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" aria-label="Bildirişlər">
                <Bell className="size-5" />
              </Button>
              {unread > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]">
                  {unread}
                </Badge>
              )}
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="sm">
                Profil
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Çıxış"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/" });
              }}
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

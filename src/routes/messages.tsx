import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/platform";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Mesajlar — DevTest Hub" },
      {
        name: "description",
        content: "Developer və testçilərlə real vaxtda birbaşa mesajlaşın.",
      },
      { property: "og:title", content: "Mesajlar — DevTest Hub" },
      { property: "og:description", content: "Real vaxt birbaşa mesajlaşma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MessagesPage />
    </RequireAuth>
  ),
});

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
};
type Person = { id: string; full_name: string; role: string };

function MessagesPage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,role").limit(200);
      setPeople(((data as Person[]) ?? []).filter((p) => p.id !== user?.id));
    };
    void load();
    void loadMessages();
  }, [user, loadMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void loadMessages();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, loadMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, active]);

  useEffect(() => {
    if (!user || !active) return;
    const unread = messages.filter(
      (m) => m.sender_id === active && m.recipient_id === user.id && !m.read,
    );
    if (unread.length) {
      void supabase
        .from("messages")
        .update({ read: true })
        .in(
          "id",
          unread.map((m) => m.id),
        );
    }
  }, [active, messages, user]);

  const send = async () => {
    if (!user || !active || text.trim().length === 0) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: active,
      body: text.trim().slice(0, 2000),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    void loadMessages();
  };

  const thread = messages.filter(
    (m) => m.sender_id === active || m.recipient_id === active,
  );

  const partnersWithChat = new Set(
    messages.map((m) => (m.sender_id === user?.id ? m.recipient_id : m.sender_id)),
  );
  const sorted = [...people].sort((a, b) => {
    const av = partnersWithChat.has(a.id) ? 0 : 1;
    const bv = partnersWithChat.has(b.id) ? 0 : 1;
    return av - bv || a.full_name.localeCompare(b.full_name);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="surface-card max-h-[70vh] overflow-y-auto p-2">
        {sorted.map((p) => {
          const unread = messages.filter(
            (m) => m.sender_id === p.id && m.recipient_id === user?.id && !m.read,
          ).length;
          return (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                active === p.id && "bg-muted font-semibold",
              )}
            >
              <span>
                {p.full_name}
                <span className="ml-2 text-xs text-muted-foreground">{p.role}</span>
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
        {sorted.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">İstifadəçi tapılmadı.</p>
        )}
      </aside>

      <section className="surface-card flex h-[70vh] flex-col p-4">
        {active ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                    m.sender_id === user?.id
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{formatDate(m.created_at)}</p>
                </div>
              ))}
              {thread.length === 0 && (
                <p className="text-sm text-muted-foreground">Söhbətə başlayın.</p>
              )}
              <div ref={bottom} />
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                value={text}
                placeholder="Mesaj yazın..."
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
              />
              <Button onClick={send}>Göndər</Button>
            </div>
          </>
        ) : (
          <p className="m-auto text-sm text-muted-foreground">Söhbət üçün istifadəçi seçin.</p>
        )}
      </section>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/announcements/new")({
  head: () => ({
    meta: [{ title: "Yeni elan — DevTest Hub" }],
  }),
  component: () => (
    <RequireAuth>
      <AnnouncementCreatePage />
    </RequireAuth>
  ),
});

const schema = z.object({
  title: z.string().trim().min(4, { message: "Elan başlığı ən az 4 simvol olmalıdır" }).max(160),
  body: z.string().trim().min(10, { message: "Məzmun ən az 10 simvol olmalıdır" }).max(4000),
});

function AnnouncementCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ title, body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Məlumatlar düzgün deyil");
      return;
    }
    setBusy(true);
    const { error, data } = await supabase
      .from("announcements")
      .insert({
        title: parsed.data.title,
        body: parsed.data.body,
        owner_id: user.id,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data?.id) {
      toast.success("Elan yaradıldı");
      navigate({ to: `/announcements/${data.id}` });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Yeni elan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elanın başlığını və məzmununu daxil edin.</p>
      </div>

      <div className="surface-card p-6 space-y-4">
        <div>
          <Label htmlFor="title">Başlıq</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Elan başlığı"
          />
        </div>
        <div>
          <Label htmlFor="body">Məzmun</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Elanın detalları"
            rows={8}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={create} disabled={busy}>
            {busy ? "Yaradılır..." : "Elan yarat"}
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/announcements" })}>
            Geri
          </Button>
        </div>
      </div>
    </div>
  );
}

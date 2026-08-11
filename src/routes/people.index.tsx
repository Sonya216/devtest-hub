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
import { ROLE } from "@/lib/platform";

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "İcma — DevTest Hub" },
      {
        name: "description",
        content: "Platformadakı proqram təminatı hazırlayıcıları və testçiləri kəşf edin.",
      },
      { property: "og:title", content: "İcma — DevTest Hub" },
      { property: "og:description", content: "Developer və testçi profillərini kəşf edin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PeoplePage />
    </RequireAuth>
  ),
});

type Person = {
  id: string;
  full_name: string;
  role: string;
  headline: string | null;
  skills: string[] | null;
  location: string | null;
};

function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,role,headline,skills,location")
        .order("created_at", { ascending: false })
        .limit(200);
      setPeople((data as Person[]) ?? []);
    };
    void load();
  }, []);

  const filtered = people.filter(
    (p) =>
      (role === "all" || p.role === role) &&
      (p.full_name + " " + (p.headline ?? "") + " " + (p.skills ?? []).join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">İcma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Əməkdaşlıq üçün developer və testçi tapın.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Ad və ya bacarıq..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün rollar</SelectItem>
            {Object.entries(ROLE).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Link
            key={p.id}
            to="/people/$userId"
            params={{ userId: p.id }}
            className="surface-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{p.full_name}</h2>
              <Badge variant="outline">{ROLE[p.role] ?? p.role}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.headline || "—"}</p>
            {p.location ? (
              <p className="mt-1 text-xs text-muted-foreground">{p.location}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1">
              {(p.skills ?? []).slice(0, 6).map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nəticə tapılmadı.</p>
        )}
      </div>
    </div>
  );
}

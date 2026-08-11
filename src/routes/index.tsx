import { createFileRoute, Link } from "@tanstack/react-router";
import { Bug, FileText, FolderKanban, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-collab.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevTest Hub — Developer və testçi əməkdaşlıq platforması" },
      {
        name: "description",
        content:
          "Layihələr, səhv hesabatları, real vaxt mesajlaşma və CV yaradıcısı ilə developer və testçiləri bir araya gətirən platforma.",
      },
      { property: "og:title", content: "DevTest Hub — Developer və testçi əməkdaşlığı" },
      {
        property: "og:description",
        content: "Səhv izləmə, layihə səhifələri, mesajlaşma və CV — hamısı bir platformada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Layihə səhifələri",
    text: "Layihə yaradın, texnologiyaları göstərin və komandaya developer və testçi cəlb edin.",
  },
  {
    icon: Bug,
    title: "Səhv hesabatı və izləmə",
    text: "Addımlar, ciddiyyət, status və ekran görüntüsü ilə tam səhv iş axını.",
  },
  {
    icon: MessageSquare,
    title: "Real vaxt mesajlaşma",
    text: "Komanda yoldaşları ilə birbaşa yazışın, oxunmamış mesajları izləyin.",
  },
  {
    icon: FileText,
    title: "CV yaradıcısı",
    text: "Peşəkar CV hazırlayın, saxlayın və profilinizdə açıq paylaşın.",
  },
  {
    icon: Users,
    title: "İcma",
    text: "Bacarıqlara görə developer və testçi tapın, profil səhifələrini araşdırın.",
  },
  {
    icon: ShieldCheck,
    title: "Təhlükəsiz hesab",
    text: "E-poçt identifikasiyası, Google ilə giriş və şəxsi fayl saxlanması.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight">DevTest Hub</span>
        <div className="flex gap-2">
          <Link to="/auth">
            <Button variant="ghost">Daxil ol</Button>
          </Link>
          <Link to="/auth">
            <Button>Qeydiyyat</Button>
          </Link>
        </div>
      </header>

      <section className="hero-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Developer və testçilər üçün əməkdaşlıq platforması
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              Layihələrinizi paylaşın, səhvləri ekran görüntüləri ilə bildirin, komanda ilə real
              vaxtda danışın və peşəkar CV-nizi bir yerdə saxlayın.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Pulsuz başla</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Platformanı kəşf et
                </Button>
              </Link>
            </div>
          </div>
          <img
            src={heroImage}
            alt="Developer və testçi səhv izləmə paneli üzərində əməkdaşlıq edir"
            width={1600}
            height={1000}
            className="w-full rounded-xl border border-border shadow-sm"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight">Platformanın imkanları</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-12">
          <div>
            <h2 className="text-xl font-semibold">Komandanızı bu gün qurun</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bir neçə dəqiqəyə qeydiyyatdan keçin və ilk layihənizi yaradın.
            </p>
          </div>
          <Link to="/auth">
            <Button size="lg">Hesab yarat</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DevTest Hub
      </footer>
    </main>
  );
}

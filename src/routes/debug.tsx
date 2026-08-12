import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

export const Route = createFileRoute("/debug")({
  head: () => ({ meta: [{ title: "Debug — DevTest Hub" }] }),
  component: Debug,
});

function Debug() {
  const info = useMemo(() => {
    try {
      // Vite replaces import.meta.env at build-time; on the server process.env fallback may be used
      const url = import.meta.env['VITE_SUPABASE_URL'] || (typeof process !== 'undefined' && process.env.SUPABASE_URL) || null;
      const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || (typeof process !== 'undefined' && process.env.SUPABASE_PUBLISHABLE_KEY) || null;
      return { url, key };
    } catch (e) {
      return { url: null, key: null };
    }
  }, []);

  const masked = (v: string | null) => {
    if (!v) return 'MISSING';
    if (v.startsWith('sb_publishable_')) return v.slice(0, 16) + '...';
    return v.slice(0, 24) + '...';
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-lg font-bold">Debug</h1>
      <p className="mt-4">This page helps verify that the client can read the Supabase environment variables.</p>
      <div className="mt-6 space-y-3">
        <div>
          <strong>VITE_SUPABASE_URL:</strong> <span>{info.url ? info.url : 'MISSING'}</span>
        </div>
        <div>
          <strong>VITE_SUPABASE_PUBLISHABLE_KEY:</strong> <span>{masked(info.key)}</span>
        </div>
      </div>
      <div className="mt-6">
        <Link to="/">Back</Link>
      </div>
    </div>
  );
}

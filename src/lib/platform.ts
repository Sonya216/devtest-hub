import { supabase } from "@/integrations/supabase/client";

export async function uploadToBucket(bucket: string, userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedUrl(bucket: string, path: string, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function notify(
  userId: string,
  title: string,
  body: string,
  link: string,
  type = "info",
) {
  if (!userId) return;
  await supabase.from("notifications").insert({ user_id: userId, title, body, link, type });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const SEVERITY: Record<string, string> = {
  low: "Aşağı",
  medium: "Orta",
  high: "Yüksək",
  critical: "Kritik",
};

export const STATUS: Record<string, string> = {
  open: "Açıq",
  in_progress: "İşlənir",
  resolved: "Həll olundu",
  closed: "Bağlandı",
};

export const ROLE: Record<string, string> = {
  developer: "Developer",
  tester: "Tester",
};

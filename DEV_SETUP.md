# DevTest Hub — Development setup

Aşağıdakı addımlar yerli inkişaf mühitinizi qurmaq üçün nəzərdə tutulub.

Prerequisites
- Node.js 18+ (və ya layihənin tələb etdiyi versiya)
- npm və ya pnpm

Install

```bash
npm install
```

Run dev server

```bash
npm run dev
```

Default dev URL (Vite may change port):
- http://localhost:3000 yoki http://localhost:8081

Ətraf mühit dəyişənləri (`.env`)

Frontend və server üçün lazım olan əsas dəyişənlər:

- `VITE_SUPABASE_URL` — Supabase project URL (məs: https://xxxx.supabase.co)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — browser üçün istifadə olunan Supabase publishable key
- `SUPABASE_URL` — eyni URL (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` — server üçün service role key (gizli, heç vaxt frontend-ə yerləşdirməyin)

Məsləhət: `.env` faylını `.gitignore`-ə əlavə edin və `SUPABASE_SERVICE_ROLE_KEY`-i heç vaxt versiya nəzarətinə göndərməyin.

Supabase ilə iş (AZ: Azərbaycan dilində qısa təlimat)

Əgər Supabase-də struktur və ya qayda (RLS) dəyişdirməyimiz lazım olacaqsa, mən sənə detallı təlimat verəcəyəm. Başlanğıc üçün əsas addımlar:

1. Supabase panelinə daxil ol:
   - https://app.supabase.com
   - Layihəni seç (Project ID: `acthtwvxemsvnsujwfdy`)

2. SQL Editor ilə cədvəl yaratmaq (məsələn `projects` üçün):

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  name text not null,
  description text,
  tech_stack text[],
  status text,
  created_at timestamptz default now()
);
```

3. Storage bucket əlavə etmək (fayllar üçün):
   - `Storage` → `Create bucket` → ad: `files` və `avatars`
   - Public müəyyən etməyin əgər şəkillər və sənədlər üçün signed URL istifadə edirsinizsə.

4. RLS (Row Level Security) siyasətləri əlavə etmək:
   - `Auth` tələb olunan cədvəllər üçün RLS istifadə edin.
   - Məsələn, `profiles` və `cvs` üçün `is_owner` və ya `is_public` məntiqini tətbiq edin.

5. Service role key istifadə edərək serverdə admin əməliyyatları icra etmə:
   - `SUPABASE_SERVICE_ROLE_KEY` env-də server tərəfdə yerləşdirilməlidir.
   - Heç vaxt bu açarı frontend-də istifadə etməyin.

6. Migration / SQL dəyişiklikləri:
   - Kiçik dəyişikliklər üçün SQL Editor-da `Run` et.
   - Daha strukturlaşdırılmış migration üçün `supabase` CLI istifadə et.

Ətraflı Supabase əməliyyatları lazım olduqda, mənə bildirin — mən sənə addım-addım Azərbaycan dilində SQL və panel əməliyyat təlimatlarını verəcəyəm.

---

İndi mən `Backup project` addımını tamamladım və `DEV_SETUP.md` yaratdım. İndi `Setup dev environment`-ə davam edim?
Deployment checklist — DevTest Hub

This document shows step-by-step how to publish the site and attach a domain (recommended: Vercel). I prepared helper files in the repo (Dockerfile, GitHub Actions template). Follow the steps below.

1) Create a GitHub repository
- Create a new repository on GitHub (private or public). Name it `devtest-hub` or similar.
- From your local project root run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

2) Choose hosting provider (recommended: Vercel — easiest)
- Sign up at https://vercel.com using your GitHub account.
- Click "New Project" → Import from GitHub → select the repo.
- Vercel detects Vite/React. Configure build command (usually `npm run build`) and output dir (`dist`).

3) Set environment variables in Vercel
- In Project Settings → Environment Variables, add:
  - `VITE_SUPABASE_URL` = your Supabase URL (from Supabase project settings)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable key (anon/public)

Note: Do NOT publish your Supabase service-role key in client env vars.

4) Add a domain
- In Vercel dashboard → Domains → Add → type your purchased domain (e.g., `example.com`).
- Follow Vercel's DNS instructions. Common setup:
  - Add A record for the apex (`@`) pointing to `76.76.21.21`.
  - Add a CNAME for `www` pointing to `cname.vercel-dns.com`.
- Wait for DNS propagation (a few minutes to a few hours). Vercel will provision TLS automatically.

5) Test the live site
- Visit your Vercel URL (e.g., `https://<project>.vercel.app`) and your custom domain when DNS is ready.
- Test `/cv` and test image upload and PDF export.

Alternative: Docker + Render or Railway
- I included a `Dockerfile` in the repo. You can deploy the container to Render or other container hosts.
- For Render, create a new Web Service and connect your GitHub repo; set build and start commands according to the Dockerfile.

6) GitHub Actions (optional)
- I added a template workflow `.github/workflows/vercel-deploy.yml` for automatic deploys via Vercel CLI using `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets. You need to create a personal token in Vercel (Account Settings → Tokens) and set repository secrets in GitHub.

Security notes
- Keep Supabase keys secret. Only publish the public/publishable key to the client (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- Use Supabase Row Level Security and policies for safety.

If you want I can:
- Create the GitHub repo for you (you need to give me GitHub access/token), or
- Connect the project to Vercel (I will need Vercel token and GitHub access), or
- Walk you through each step while you perform them.

Commands summary

```bash
# push local repo to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main

# start dev locally
npm install
npm run dev
```

DNS quick reference
- A record (apex): `76.76.21.21` (Vercel)
- CNAME (www): `cname.vercel-dns.com` (Vercel)

If you want, I can prepare the GitHub repo and deployment settings for you — tell me which provider (Vercel / Render / Railway / Heroku) and whether you want me to create the repo or just the files and instructions.
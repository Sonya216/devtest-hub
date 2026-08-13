import fs from 'fs';
import path from 'path';

function maskKey(k) {
  if (!k) return 'MISSING';
  try {
    return `${String(k).slice(0, 16)}...`;
  } catch {
    return 'UNKNOWN';
  }
}

const vars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
};

const dest = path.join(process.cwd(), '.env.local');
const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);

try {
  // Ensure destination directory writable
  const dir = path.dirname(dest) || process.cwd();
  fs.accessSync(dir, fs.constants.W_OK);
} catch (err) {
  console.error('[write-env] Destination directory not writable:', err?.message || err);
  // continue, attempt write which will fail loudly if truly not writable
}

try {
  fs.writeFileSync(dest, lines.join('\n'), { encoding: 'utf8', flag: 'w' });
  console.log('[write-env] Wrote .env.local to', dest);
  console.log('[write-env] Keys:', Object.keys(vars).join(', '));
  console.log('[write-env] Masked values:', {
    VITE_SUPABASE_URL: vars.VITE_SUPABASE_URL ? vars.VITE_SUPABASE_URL : 'MISSING',
    VITE_SUPABASE_PUBLISHABLE_KEY: maskKey(vars.VITE_SUPABASE_PUBLISHABLE_KEY),
  });

  // If values are missing, emit warning but do not fail build here — allow downstream checks.
  const missing = Object.entries(vars).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn('[write-env] Warning: Missing env values for:', missing.join(', '));
  }
} catch (err) {
  console.error('[write-env] Failed to write .env.local', err);
  process.exit(1);
}

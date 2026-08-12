const fs = require('fs');
const path = require('path');

const vars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
};

const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
const dest = path.join(process.cwd(), '.env');

try {
  fs.writeFileSync(dest, lines.join('\n'));
  console.log('[write-env] Wrote .env with keys:', Object.keys(vars).join(', '));
} catch (err) {
  console.error('[write-env] Failed to write .env', err);
  process.exit(1);
}

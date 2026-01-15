# Environment Variables Setup for Next.js

## Quick Setup

1. **Create `.env.local` file** in the `poker_frontend` directory:

```bash
cd poker_frontend
touch .env.local
```

2. **Add your environment variables** to `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# WebSocket Server URL
NEXT_PUBLIC_GAME_SERVER_WS_URL=ws://localhost:4000/ws

# Legacy Vite variables (for backward compatibility)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GAME_SERVER_WS_URL=ws://localhost:4000/ws
```

## Where to Find Your Values

### Supabase URL and Key
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### WebSocket URL
- **Local development**: `ws://localhost:4000/ws`
- **Production**: `wss://your-backend-url.com/ws`

## Important Notes

- **`.env.local`** is git-ignored (never commit this file!)
- **`NEXT_PUBLIC_`** prefix is required for Next.js to expose variables to the browser
- Restart the dev server after changing environment variables:
  ```bash
  # Stop the server (Ctrl+C) and restart
  npm run dev
  ```

## Troubleshooting

If you still see "Missing Supabase environment variables":

1. **Check file location**: `.env.local` must be in `poker_frontend/` directory
2. **Check variable names**: Must start with `NEXT_PUBLIC_` for client-side access
3. **Restart dev server**: Environment variables are loaded at startup
4. **Check for typos**: No spaces around `=` sign
5. **Check console**: The error now shows which variables are missing

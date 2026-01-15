# Fix Environment Variables Error

## Problem
The error shows all environment variables are `false`:
```
{hasNextPublicUrl: false, hasViteUrl: false, hasNextPublicKey: false, hasViteKey: false}
```

## Solution

### Step 1: Check your `.env.local` file

Make sure your `.env.local` file in `poker_frontend/` directory has **actual values** (not placeholders):

```env
# Replace these with YOUR actual values:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_GAME_SERVER_WS_URL=ws://localhost:4000/ws

# Also add VITE_ versions for compatibility:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GAME_SERVER_WS_URL=ws://localhost:4000/ws
```

### Step 2: Important Notes

1. **NO spaces around `=`**: 
   ✅ Correct: `NEXT_PUBLIC_SUPABASE_URL=https://...`
   ❌ Wrong: `NEXT_PUBLIC_SUPABASE_URL = https://...`

2. **NO quotes needed** (unless value has spaces):
   ✅ Correct: `NEXT_PUBLIC_SUPABASE_URL=https://...`
   ❌ Wrong: `NEXT_PUBLIC_SUPABASE_URL="https://..."`

3. **Must have `NEXT_PUBLIC_` prefix** for Next.js to expose to browser

### Step 3: Restart Dev Server

After updating `.env.local`:
1. **Stop the server** (Ctrl+C in terminal)
2. **Restart**: `npm run dev`

### Step 4: Verify

Check the browser console - the error should show which variables are found:
```
Missing Supabase environment variables: {
  hasNextPublicUrl: true,  // Should be true
  hasViteUrl: true,        // Should be true
  hasNextPublicKey: true,  // Should be true
  hasViteKey: true        // Should be true
}
```

## Quick Copy from .env

If you have a `.env` file with `VITE_` variables, copy them to `.env.local` and add `NEXT_PUBLIC_` versions:

```bash
# In poker_frontend directory
cat .env
# Copy the values and create .env.local with both VITE_ and NEXT_PUBLIC_ versions
```

## Get Supabase Values

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

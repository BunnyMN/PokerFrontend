# Next.js Migration Guide

## ✅ Completed Migration Steps

### 1. Configuration Files
- ✅ Updated `package.json` with Next.js dependencies
- ✅ Created `next.config.js`
- ✅ Updated `tsconfig.json` for Next.js
- ✅ Updated `tailwind.config.js` for Next.js paths
- ✅ Created `.eslintrc.json` for Next.js
- ✅ Created `middleware.ts` for route protection

### 2. App Router Structure
- ✅ Created `app/layout.tsx` (root layout)
- ✅ Created `app/page.tsx` (home redirect)
- ✅ Created `app/auth/page.tsx`
- ✅ Created `app/lobby/page.tsx`
- ✅ Created `app/room/[roomId]/page.tsx`
- ✅ Created `app/profile/page.tsx`

### 3. Code Updates
- ✅ Created `src/lib/navigation.ts` (Next.js router wrapper)
- ✅ Updated all pages to use Next.js navigation
- ✅ Updated environment variables (`import.meta.env` → `process.env`)
- ✅ Added `'use client'` directives to client components
- ✅ Updated Supabase client for Next.js
- ✅ Updated middleware for authentication

## 📋 Next Steps

### 1. Install Dependencies
```bash
cd poker_frontend
npm install
```

### 2. Environment Variables
Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_GAME_SERVER_WS_URL=ws://your-backend-url/ws
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

## 🔄 Migration Notes

### Routing Changes
- **Before**: React Router (`/auth`, `/lobby`, `/room/:roomId`, `/profile`)
- **After**: Next.js App Router (file-based routing)

### Navigation
- **Before**: `useNavigate()` from `react-router-dom`
- **After**: `useNavigate()` from `src/lib/navigation` (wrapper around Next.js router)

### Environment Variables
- **Before**: `import.meta.env.VITE_*`
- **After**: `process.env.NEXT_PUBLIC_*` or `process.env.VITE_*` (backward compatible)

### Client Components
- All pages and components using hooks must have `'use client'` directive
- Server components (default) cannot use hooks or browser APIs

## 🚀 Deployment

### Vercel
Next.js is optimized for Vercel. Just connect your GitHub repo and deploy!

### Environment Variables in Vercel
Add these in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GAME_SERVER_WS_URL`

## ⚠️ Important Notes

1. **WebSocket**: Must be client-side only (already handled with `'use client'`)
2. **Supabase**: Uses `@supabase/ssr` for middleware, regular client for components
3. **Routing**: All routes are now file-based in `app/` directory
4. **Performance**: Next.js automatically handles code splitting and optimization

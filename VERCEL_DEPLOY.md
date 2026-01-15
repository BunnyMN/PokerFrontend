# Vercel Deployment Guide

## Quick Deploy

### Option 1: Vercel CLI
```bash
npm i -g vercel
cd poker_frontend
vercel
```

### Option 2: GitHub Integration
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite configuration

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_WS_URL=your_websocket_url
```

## Build Configuration

- **Framework Preset**: Vite
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

## Features

✅ **SPA Routing**: All routes redirect to `index.html` for client-side routing
✅ **Asset Caching**: Static assets cached for 1 year
✅ **Auto Deploy**: Deploys on every push to main branch
✅ **Preview Deployments**: Automatic preview URLs for PRs

## Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check Node.js version (should be 20.x)
- Verify all environment variables are set
- Check build logs in Vercel dashboard

### Design Not Loading
- Ensure Tailwind CSS is properly configured
- Check that `tailwind.config.js` includes all content paths
- Verify CSS files are being generated in build

### Routing Issues
- Verify `vercel.json` rewrites are correct
- Check that React Router is configured properly

## Performance

The app is optimized for Vercel with:
- Code splitting
- Lazy loading
- Asset optimization
- CDN caching

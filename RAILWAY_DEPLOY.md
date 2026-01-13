# Railway Frontend Deployment Guide

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. Backend deployed to Railway (for WebSocket URL)
3. Supabase project configured

## Deployment Steps

### Option 1: Using Railway Dashboard (Recommended)

1. **Create a New Project**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo" (point to `poker_frontend` directory)

2. **Add Service**
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Railway will auto-detect Node.js/Vite

3. **Configure Build Settings** (Optional - Railway will auto-detect)
   - Go to Settings → Build
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Root Directory: Leave empty (deploy from `poker_frontend` root)

4. **Set Environment Variables**
   - Go to Variables tab
   - Add the following (replace with your actual values):
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     VITE_GAME_SERVER_WS_URL=wss://your-backend-app.up.railway.app/ws
     PORT=4173
     NODE_ENV=production
     ```
   - **Important**: 
     - Replace `your-backend-app` with your actual Railway backend domain
     - Use `wss://` (secure WebSocket) for production
     - Get Supabase credentials from your Supabase dashboard

5. **Deploy**
   - Railway will automatically build and deploy
   - The build will create static files in `dist/`
   - The `serve` package will serve the static files

### Option 2: Using Railway CLI

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize Project**
   ```bash
   cd poker_frontend
   railway init
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set VITE_SUPABASE_URL=https://your-project.supabase.co
   railway variables set VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   railway variables set VITE_GAME_SERVER_WS_URL=wss://your-backend-app.up.railway.app/ws
   railway variables set PORT=4173
   railway variables set NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL (required)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key (required)
- `VITE_GAME_SERVER_WS_URL` - WebSocket URL of your backend (required)
  - Format: `wss://your-backend-app.up.railway.app/ws`
  - Use `wss://` (secure) for production, not `ws://`
- `PORT` - Server port (default: 4173, Railway will set this automatically)
- `NODE_ENV` - Set to `production` (optional but recommended)

## Build Configuration

Railway will automatically:
1. Install dependencies: `npm install`
2. Type check: `tsc`
3. Build Vite app: `vite build` (creates `dist/` folder)
4. Start static server: `npm start` (serves `dist/` folder using `serve` package)

## Static File Serving

The app uses the `serve` package to serve the built static files from the `dist/` directory. This is optimized for production static file serving.

## WebSocket Configuration

Make sure your `VITE_GAME_SERVER_WS_URL` uses:
- `wss://` (secure WebSocket) for production
- Your Railway backend domain
- The `/ws` path

Example:
```
VITE_GAME_SERVER_WS_URL=wss://poker-backend.up.railway.app/ws
```

## Health Check

Railway will monitor the static server. The app will be available at:
- `https://your-frontend-app.up.railway.app`

## Monitoring

- View logs in Railway dashboard
- Set up alerts for deployment failures
- Monitor resource usage

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify TypeScript compilation passes
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`

### App Won't Start
- Verify all `VITE_*` environment variables are set
- Check that `dist/` folder exists after build
- Review server logs in Railway dashboard
- Ensure `VITE_GAME_SERVER_WS_URL` uses `wss://` not `ws://`

### WebSocket Connection Issues
- Verify `VITE_GAME_SERVER_WS_URL` is correct
- Check that backend is deployed and running
- Ensure WebSocket URL uses `wss://` for production
- Check browser console for connection errors

### Environment Variables Not Working
- Remember: Vite only exposes variables prefixed with `VITE_`
- Variables must be set before build time
- Rebuild after changing environment variables

## Updating Environment Variables

After changing environment variables:
1. Go to Railway dashboard → Variables
2. Update the variable
3. Railway will automatically rebuild and redeploy

## Custom Domain (Optional)

1. Go to Settings → Networking
2. Add custom domain
3. Railway will provide SSL certificate automatically

## Performance Optimization

The build is already optimized with:
- Code splitting (manual chunks)
- Tree shaking
- Minification
- Asset optimization

## Production Checklist

- [ ] All environment variables set correctly
- [ ] Backend deployed and accessible
- [ ] WebSocket URL uses `wss://`
- [ ] Supabase credentials are correct
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Railway)

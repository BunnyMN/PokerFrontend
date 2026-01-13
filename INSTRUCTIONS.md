# PokerFrontend - Setup and Running Instructions

A React-based multiplayer poker game frontend built with TypeScript, Vite, Tailwind CSS, and Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Running the Application](#running-the-application)
5. [Building for Production](#building-for-production)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm/yarn/pnpm
- **Supabase Account** - You'll need a Supabase project for authentication and database
- **Backend Server** - The poker backend server should be running (see backend instructions)

## Environment Setup

### 1. Create Environment File

Copy the example environment file:

```bash
cd poker_frontend
cp env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GAME_SERVER_WS_URL=ws://localhost:4000/ws
```

**Where to find Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** and **anon/public key**

**Game Server URL:**
- Default: `ws://localhost:4000/ws` (for local development)
- Change this if your backend server runs on a different port or host

### 3. Supabase Database Setup

You need to set up the following database tables in your Supabase project:

#### Create Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT CHECK (status IN ('lobby', 'playing', 'finished')) DEFAULT 'lobby',
  score_limit INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Room players table
CREATE TABLE room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES auth.users(id) NOT NULL,
  is_ready BOOLEAN DEFAULT FALSE,
  left_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);
```

#### Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
```

#### Create RLS Policies

```sql
-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Rooms: Users can read all rooms, create rooms, update own rooms
CREATE POLICY "Rooms are viewable by everyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "Users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own rooms" ON rooms FOR UPDATE USING (auth.uid() = owner_id);

-- Room Players: Users can read players in rooms they're in, insert themselves, update their own status
CREATE POLICY "Room players are viewable by room members" ON room_players FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON room_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Users can update own status" ON room_players FOR UPDATE USING (auth.uid() = player_id);
```

#### Create Profile Trigger (Auto-create profile on signup)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Installation

1. **Navigate to the project directory:**

```bash
cd poker_frontend
```

2. **Install dependencies:**

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- TypeScript
- Vite
- Tailwind CSS v4
- Supabase client
- React Router
- Zod (for validation)

## Running the Application

### Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

The application will be available at:
- **Local**: `http://localhost:5173` (or the port shown in the terminal)
- Vite will automatically assign a port if 5173 is unavailable

### Prerequisites for Running

Before starting the frontend, ensure:

1. ✅ **Backend server is running** on port 4000 (or your configured port)
   ```bash
   # In another terminal, start the backend
   cd poker_backend/apps/server
   npm run dev
   ```

2. ✅ **Supabase project is configured** with the database schema above

3. ✅ **Environment variables are set** in `.env` file

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory. You can preview the production build locally:

```bash
npm run preview
```

## Configuration

### PostCSS Configuration

The project uses Tailwind CSS v4 with the new PostCSS plugin. The configuration is in `postcss.config.js`:

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

**Note:** If you encounter PostCSS errors, ensure you're using `@tailwindcss/postcss` (not `tailwindcss`) in the config.

### Vite Configuration

The Vite config (`vite.config.ts`) is minimal and uses the React plugin. You can customize it as needed:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

## Project Structure

```
poker_frontend/
├── src/
│   ├── components/       # Reusable React components
│   │   ├── ui/          # UI components (buttons, modals, etc.)
│   │   ├── ProtectedRoute.tsx
│   │   ├── QueuePanel.tsx
│   │   ├── SeatCard.tsx
│   │   └── TableView.tsx
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Library configurations
│   │   ├── gameSocket.ts    # WebSocket connection
│   │   ├── supabase.ts      # Supabase client
│   │   └── logger.ts        # Logging utilities
│   ├── pages/           # Page components
│   │   ├── AuthPage.tsx
│   │   ├── LobbyPage.tsx
│   │   └── RoomPage.tsx
│   ├── styles/          # CSS and styling
│   │   └── tokens.css   # Design tokens
│   ├── types/           # TypeScript definitions
│   │   ├── cards.ts
│   │   └── database.ts
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── .env                 # Environment variables (create from env.example)
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── postcss.config.js    # PostCSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Routes

The application has the following routes:

- **`/auth`** - Authentication page (sign up/sign in)
- **`/lobby`** - Main lobby page (create/join rooms)
- **`/room/:roomId`** - Individual room page with game interface

## Troubleshooting

### Common Issues

#### 1. PostCSS Error: "tailwindcss directly as a PostCSS plugin"

**Error:**
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
```

**Solution:**
Update `postcss.config.js` to use `@tailwindcss/postcss` instead of `tailwindcss`:

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // ✅ Correct
    // tailwindcss: {},           // ❌ Wrong
    autoprefixer: {},
  },
}
```

#### 2. Cannot Connect to Backend Server

**Error:** WebSocket connection fails

**Solutions:**
- Ensure the backend server is running on the correct port
- Check `VITE_GAME_SERVER_WS_URL` in your `.env` file
- Verify the backend server is accessible (try `curl http://localhost:4000/health`)

#### 3. Supabase Authentication Errors

**Error:** "Invalid API key" or authentication failures

**Solutions:**
- Verify your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Ensure you're using the **anon/public key**, not the service role key
- Check that your Supabase project is active and not paused

#### 4. Database Errors

**Error:** "relation does not exist" or RLS policy errors

**Solutions:**
- Run all the SQL setup scripts in your Supabase SQL Editor
- Verify RLS policies are created correctly
- Check that the trigger function is created for auto-profile creation

#### 5. Port Already in Use

**Error:** Port 5173 (or other) is already in use

**Solution:**
- Vite will automatically try the next available port
- Or specify a different port: `npm run dev -- --port 3000`

#### 6. Module Not Found Errors

**Error:** Cannot find module or package errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

1. **Hot Reload**: Vite provides instant hot module replacement (HMR) - changes reflect immediately
2. **TypeScript**: The project uses strict TypeScript - fix type errors as you develop
3. **Linting**: Run `npm run lint` to check for code issues
4. **WebSocket**: The app uses WebSocket for real-time game communication with the backend
5. **Environment Variables**: All environment variables must be prefixed with `VITE_` to be accessible in the browser

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Support

If you encounter issues not covered here:
1. Check the browser console for errors
2. Check the terminal output for build/compilation errors
3. Verify all environment variables are set correctly
4. Ensure both frontend and backend servers are running

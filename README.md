# Poker Lobby MVP

A multiplayer game lobby web application built with React, TypeScript, Vite, and Supabase.

## Features

- **Authentication**: Sign up and sign in with email/password
- **Lobby**: Create and join game rooms
- **Room Management**: Real-time player updates, ready status, and room controls
- **Form Validation**: Zod-based validation for all forms
- **Error Handling**: Comprehensive error handling throughout the app

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Supabase project with the following database schema

## Supabase Database Setup

You need to create the following tables in your Supabase project:

### 1. `profiles` table

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `rooms` table

```sql
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT CHECK (status IN ('lobby', 'playing', 'finished')) DEFAULT 'lobby',
  score_limit INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `room_players` table

```sql
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

### 4. Row Level Security (RLS) Policies

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

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

### 5. Create profile on signup (Trigger)

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

1. Clone the repository and navigate to the project directory:

```bash
cd Poker
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

4. Fill in your Supabase credentials in `.env`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

## Running the Application

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
  ├── components/       # Reusable components (ProtectedRoute)
  ├── lib/             # Supabase client configuration
  ├── pages/           # Page components (Auth, Lobby, Room)
  ├── types/           # TypeScript type definitions
  ├── utils/           # Utility functions (room code generation)
  ├── App.tsx          # Main app component with routing
  ├── main.tsx         # Application entry point
  └── index.css        # Global styles
```

## Routes

- `/auth` - Authentication page (sign up/sign in)
- `/lobby` - Main lobby page (create/join rooms)
- `/room/:roomId` - Individual room page with player management

## Notes

- Room codes are generated client-side as 6-character uppercase alphanumeric strings
- The app uses Supabase realtime subscriptions for live player updates
- All forms are validated using Zod schemas
- Error handling is implemented throughout the application
- The app uses minimal styling without heavy component libraries


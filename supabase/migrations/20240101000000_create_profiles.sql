-- Create profiles table that maps auth users to their name and role.
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists public.profiles (
  id   uuid primary key references auth.users (id) on delete cascade,
  name text        not null,
  role text        not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Allow authenticated users to read their own profile
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Allow authenticated users to update their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Example: insert seed data (replace with real user UUIDs after creating accounts)
-- insert into public.profiles (id, name, role) values
--   ('<teacher-uuid>', '王小明', 'teacher'),
--   ('<student-uuid>', '陳大華', 'student');

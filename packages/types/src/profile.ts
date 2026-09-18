import type { Id, Timestamp } from './common';

/** Mirrors `public.profiles`, one row per `auth.users` row (see supabase/migrations). */
export interface Profile {
  id: Id;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: Timestamp;
}

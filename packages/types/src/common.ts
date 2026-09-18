/** UUID string, as stored by Postgres/Supabase. */
export type Id = string;

/** ISO-8601 timestamp string, as returned by Postgres/Supabase. */
export type Timestamp = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

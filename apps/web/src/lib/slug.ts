/** Lowercase, hyphenated, ASCII-only — matches the `slug` columns' intent (organizations, projects). */
export function slugify(input: string, fallback = 'org'): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || fallback;
}

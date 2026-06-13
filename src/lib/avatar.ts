/**
 * Derives 1–2 uppercase initials for the Avatar fallback shown when no image
 * is available.
 *
 * Priority: `name` → local-part of `email` → `'?'`. A multi-word source yields
 * the first letter of the first and last words (`"Demo User"` → `"DU"`); a
 * single token yields its first two code points (`"Alice"` → `"AL"`). For an
 * email the initials come from the local-part only (`"john.doe@x"` → `"JD"`).
 *
 * Code-point-safe — splits with the spread operator so surrogate pairs and
 * Cyrillic letters are handled correctly.
 */
export function getAvatarInitials({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}): string {
  const source = (name ?? '').trim() || (email ?? '').trim();
  if (!source) return '?';

  const atIndex = source.indexOf('@');
  const base = atIndex > 0 ? source.slice(0, atIndex) : source;
  const words = base.split(/[\s._-]+/).filter(Boolean);
  const firstWord = words[0] ?? '';
  if (!firstWord) return '?';

  if (words.length === 1) {
    return [...firstWord].slice(0, 2).join('').toUpperCase();
  }

  const lastWord = words[words.length - 1] ?? '';
  const first = [...firstWord][0] ?? '';
  const last = [...lastWord][0] ?? '';
  return (first + last).toUpperCase();
}

/** Suggestions, not an allowlist: administrators can enter another subject. */
export const PROGRAM_CATEGORY_SUGGESTIONS = [
  'Aqidah', 'Tauhid', 'Fiqih', 'Hadits', 'Tafsir', 'Akhlaq', 'Sirah', 'Bahasa Arab', 'Tematik',
] as const;
export const PROGRAM_CATEGORY_MAX_LENGTH = 100;
export const UNCATEGORIZED_PROGRAM_LABEL = 'Kajian';

export function programCategoryLabel(category?: string | null) {
  return category?.trim() || UNCATEGORIZED_PROGRAM_LABEL;
}

export function programCategoryOptions(programs: Array<{ category?: string | null }>) {
  return [...new Set(programs.map(program => programCategoryLabel(program.category)))].sort((a, b) => a.localeCompare(b, 'id'));
}

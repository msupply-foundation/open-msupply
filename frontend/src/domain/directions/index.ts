// Directions text expansion (spec/prescriptions/rules.md § directions;
// AC-R1): each whitespace-separated token matching a configured abbreviation
// expands to its full text, case-insensitively; everything else passes
// through. Pure — mirrors the real client's expansion so the label text the
// user saves is the expanded form.

export interface Abbreviation {
  text: string;
  expansion: string;
}

export const expandAbbreviations = (
  input: string,
  abbreviations: readonly Abbreviation[]
): string => {
  if (!input.trim()) return input.trim();
  const byToken = new Map(
    abbreviations.map(a => [a.text.toLowerCase(), a.expansion])
  );
  return input
    .split(/\s+/)
    .filter(token => token.length > 0)
    .map(token => byToken.get(token.toLowerCase()) ?? token)
    .join(' ');
};

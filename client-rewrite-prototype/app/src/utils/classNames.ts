/** Tiny classnames joiner — filters out falsy values. */
export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

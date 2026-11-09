/*
 * The light/dark choice — one owner for the whole app.
 *
 * The scheme lives in exactly three places, and this module is what keeps them
 * in step: the `data-theme` attribute on <html> (which the [data-theme='dark']
 * override block in tokens.css keys off), the `oms-theme` localStorage key
 * (read by the pre-paint script in index.html so a dark user never sees a
 * flash of light), and the signal below (so every control showing the current
 * scheme re-renders together).
 *
 * A module-level signal rather than per-component state: there is more than
 * one control now — the Settings › Display switch and the showcase's toggle
 * button — and two components each holding their own copy would drift apart
 * the moment either was used.
 */
import { createSignal } from 'solid-js';

export type ColourScheme = 'light' | 'dark';

const STORAGE_KEY = 'oms-theme';

const current = (): ColourScheme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

const [colourScheme, setSignal] = createSignal<ColourScheme>(current());

export { colourScheme };

export const isDarkMode = (): boolean => colourScheme() === 'dark';

export const setColourScheme = (next: ColourScheme): void => {
  setSignal(next);
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable (private mode) — the choice still holds for this
    // session, it just won't survive a reload
  }
};

export const toggleColourScheme = (): void =>
  setColourScheme(colourScheme() === 'dark' ? 'light' : 'dark');

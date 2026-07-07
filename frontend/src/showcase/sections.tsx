import type { Component } from 'solid-js'
import { ButtonsShowcase } from './ButtonsShowcase'
import { InputsShowcase } from './InputsShowcase'
import { SelectorsShowcase } from './SelectorsShowcase'
import { PageLayoutShowcase } from './PageLayoutShowcase'
import { Home } from '../pages/Home/Home'

export type SectionDef = {
  id: string
  label: string
  component: Component
  /*
   * 'component' (default) renders inside the padded showcase panel. 'page'
   * renders full-bleed — the component owns the whole viewport (e.g. an app
   * shell with its own sidebar/header), with the ShowcaseLauncher floating over
   * it as the way back. 'app' is full-bleed with NO showcase chrome at all —
   * a real app page exactly as a build would ship it; the way back is the
   * browser's Back button. See ShowcaseApp.tsx.
   */
  kind?: 'component' | 'page' | 'app'
}

const ComingSoon: Component = () => (
  <p>Nothing here yet — components land here as they're built.</p>
)

/*
 * The storybook's section registry. Adding a section = add an entry here;
 * the shell derives nav links and panels from this list. Section id doubles
 * as the URL hash (#/buttons), so sections are linkable.
 */
export const sections: SectionDef[] = [
  { id: 'buttons', label: 'Buttons', component: ButtonsShowcase },
  { id: 'inputs', label: 'Inputs', component: InputsShowcase },
  { id: 'selectors', label: 'Selectors', component: SelectorsShowcase },
  { id: 'layout', label: 'Layout', component: ComingSoon },
  { id: 'feedback', label: 'Feedback', component: ComingSoon },
  { id: 'table', label: 'Table', component: ComingSoon },
  // 'app-shell' demos the AppShell layout element with showcase-owned demo
  // content; 'home' is the REAL home page scaffold (src/pages/Home — imports
  // only from the library), registered here so it's reachable and testable.
  { id: 'app-shell', label: 'App shell', component: PageLayoutShowcase, kind: 'page' },
  { id: 'home', label: 'Home', component: Home, kind: 'app' },
]

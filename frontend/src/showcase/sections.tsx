import type { Component } from 'solid-js'
import { SelectorsShowcase } from './SelectorsShowcase'

export type SectionDef = {
  id: string
  label: string
  component: Component
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
  { id: 'buttons', label: 'Buttons', component: ComingSoon },
  { id: 'inputs', label: 'Inputs', component: ComingSoon },
  { id: 'selectors', label: 'Selectors', component: SelectorsShowcase },
  { id: 'layout', label: 'Layout', component: ComingSoon },
  { id: 'feedback', label: 'Feedback', component: ComingSoon },
  { id: 'table', label: 'Table', component: ComingSoon },
]

import type { JSX } from 'solid-js';
import styles from './FormPreview.module.css';

/**
 * A narrow column standing in for a form, so field demos render at a
 * realistic width. Demo chrome only — real form layout is the `src/ui`
 * Form family (FormSection/FormRow/…), demoed in the Forms section.
 */
export const FormPreview = (props: { children: JSX.Element }) => (
  <div class={styles.formPreview}>{props.children}</div>
);

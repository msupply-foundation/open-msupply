import { splitProps, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import styles from './FormSection.module.css';

export interface FormSectionProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The section heading, already translated. */
  title: string;
  /**
   * Heading rank for the document outline (WCAG 2.2 — size never dictates
   * rank). Defaults to `h2` (a top-level group under the page's h1); use `h3`
   * for a sub-group nested inside another section.
   */
  headingLevel?: 'h2' | 'h3';
  children: JSX.Element;
}

/*
 * FormSection — a titled group of fields (see kdd/form-layout): a neutral bold
 * heading with a hairline rule beneath it, then a vertical stack of its field
 * children. The stock detail form's "Batch & Dates", "Storage & Pack", etc.
 *
 * Fields sit DIRECTLY inside a section, one per line at full width; wrap the
 * two-up ones in a <FormRow>. The heading is NEUTRAL (--text-body) — distinct
 * from the action-blue dashboard SectionTitle, which is a different shape.
 * Pure layout; owns the heading treatment + field spacing, never the controls'
 * look. Hand-rolled, pure CSS + tokens.
 */
export const FormSection = (props: FormSectionProps) => {
  const [local, rest] = splitProps(props, [
    'title',
    'headingLevel',
    'class',
    'children',
  ]);
  return (
    <section
      class={local.class ? `${styles.section} ${local.class}` : styles.section}
      {...rest}
    >
      <Dynamic component={local.headingLevel ?? 'h2'} class={styles.heading}>
        {local.title}
      </Dynamic>
      {local.children}
    </section>
  );
};

import { splitProps, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import styles from './FormSection.module.css';

export interface FormSectionProps extends JSX.HTMLAttributes<HTMLElement> {
  /** The section heading, already translated. */
  title: string;
  /**
   * Heading rank for the document outline (WCAG 2.2 — size never dictates
   * rank). Defaults to `h2` (a top-level group under the page's h1); use `h3`
   * for a section nested inside a surface that already owns the h2 — a variant
   * card, or a dialog whose title is the h2.
   */
  headingLevel?: 'h2' | 'h3';
  /**
   * Which heading treatment to wear, independent of rank: `group` is the ruled
   * group heading, `subgroup` the quieter nested one (smaller, no rule).
   *
   * Defaults from `headingLevel` — h2 → `group`, h3 → `subgroup` — which is
   * right whenever rank and standing agree. Set it explicitly when they don't:
   * a section that is a TOP-LEVEL group of its surface but must take h3
   * because the surface's title already holds the h2 wants
   * `headingLevel="h3" heading="group"`. Without that, rank would dictate size
   * and a group heading would render quieter than the field labels beneath it.
   */
  heading?: 'group' | 'subgroup';
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
 *
 * Rank and treatment are SEPARATE inputs (`headingLevel` / `heading`): the
 * outline is a semantic fact and the treatment a visual one, and a nested
 * surface can need a top-level-looking group at h3. The default derives one
 * from the other, so a caller only names both when they diverge.
 */
export const FormSection = (props: FormSectionProps) => {
  const [local, rest] = splitProps(props, [
    'title',
    'headingLevel',
    'heading',
    'class',
    'children',
  ]);
  const rank = () => local.headingLevel ?? 'h2';
  const treatment = () =>
    local.heading ?? (rank() === 'h3' ? 'subgroup' : 'group');
  return (
    <section
      class={local.class ? `${styles.section} ${local.class}` : styles.section}
      data-heading={treatment()}
      {...rest}
    >
      <Dynamic component={rank()} class={styles.heading}>
        {local.title}
      </Dynamic>
      {local.children}
    </section>
  );
};

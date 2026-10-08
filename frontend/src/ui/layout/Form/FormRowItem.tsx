import { splitProps, type JSX } from 'solid-js';

export interface FormRowItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * This item's share of the row — the `fr` weight of a grid column. The row's
   * whole width is split between its weighted items in proportion to this, so
   * `1.9` beside a `0.9` takes a bit over twice the width. `0` pins the item to
   * its `minWidth` and hands every spare pixel to its siblings (a fixed-format
   * value, e.g. a date, that can never use more room). Defaults to 1.
   */
  weight?: number;
  /**
   * The floor this item never shrinks below — the `min` of `minmax(min, Nfr)`.
   * Any CSS length; defaults to the row's own `minItemWidth`. It does two jobs
   * beyond that: within a line it decides who gives up width as the row narrows
   * (a field reaching its floor stops shrinking and its siblings absorb the
   * rest, so a real floor is what protects a name field), and across the row the
   * floors' SUM is the wrap point. Keep that sum to no more than the unweighted
   * row's would be, or the row wraps EARLIER than it used to and the header grows
   * a line. Which fields move to the next line is document order, not floor size
   * — the trailing ones go first — so order the cluster identity-first.
   */
  minWidth?: string;
  /**
   * The ceiling this item never grows past — the `max` of `minmax(min, max)`.
   * Any CSS length; unset means it keeps growing with its weight. Two jobs, both
   * about a field that has no use for more width: its share stops at the cap and
   * flexbox hands the remainder to its siblings (so on a wide screen the surplus
   * reaches the name fields instead of inflating a short code), and a field that
   * WRAPS to a line of its own stops filling that whole line — a lone flex item
   * with any weight otherwise stretches the full width, which reads as the header
   * having promoted the least important field.
   */
  maxWidth?: string;
}

/*
 * FormRowItem — one weighted slot in a <FormRow> (see kdd/form-layout). Opt-in,
 * exactly like FormRow itself: a field dropped straight into the row keeps the
 * historical equal share, and wrapping it here says "this field's data needs
 * more (or less) room than its neighbours' does" — a person's name against a
 * formatted date. A field's width follows its DATA, never the field count
 * (spec/ui-standards/layout.md); weight the whole cluster or none of it.
 *
 * It sizes itself inline rather than through FormRow's CSS, so an unwrapped
 * sibling — a bare field, HeaderToolbar's trailing compact Alert — keeps its
 * existing rule untouched. `flex-basis: 0` is what makes the weight a true `fr`:
 * the row's whole width distributes in proportion, not just the leftovers after
 * every item has taken a basis (which is why the floor lives in
 * `min-inline-size`, where flexbox's min-violation pass clamps it exactly as
 * `minmax()` does). The floor is capped at `100%` so a single item on a line
 * narrower than its floor still shrinks instead of overflowing.
 *
 * Pure layout — it never styles the control inside. The control fills the slot
 * the row hands it because that is every input's default, not because the slot
 * made it. Hand-rolled CSS.
 */
export const FormRowItem = (props: FormRowItemProps) => {
  const [local, rest] = splitProps(props, [
    'weight',
    'minWidth',
    'maxWidth',
    'class',
    'children',
  ]);
  return (
    // `rest` is spread FIRST so the slot's own sizing always wins: this
    // component is nothing but that sizing, and a caller passing `style` for
    // some unrelated reason must not silently delete it (FormRow/FormColumn
    // spread last, where the same collision costs only a fallback value).
    <div
      {...rest}
      class={local.class}
      style={{
        flex: `${local.weight ?? 1} 1 0`,
        // Falls back to the row's own min (FormRow.module.css declares
        // --form-row-item-min from its minItemWidth); the literal is the
        // belt-and-braces default for a slot used outside a FormRow, where an
        // undefined custom property would otherwise make the whole declaration
        // invalid and leave the flex item on its content-based `auto` minimum.
        'min-inline-size': `min(${local.minWidth ?? 'var(--form-row-item-min, 10rem)'}, 100%)`,
        ...(local.maxWidth ? { 'max-inline-size': local.maxWidth } : {}),
      }}
    >
      {local.children}
    </div>
  );
};

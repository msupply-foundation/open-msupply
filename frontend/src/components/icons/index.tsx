import type { ComponentProps } from 'solid-js'

/*
 * Icon convention carried over from the RnD prototype (itself a port of the
 * current app's MUI SvgIcons to plain SVG):
 *  - "fill" icons paint with `currentColor` (default svg fill).
 *  - "stroke" icons set fill:none and stroke:currentColor.
 * Either way, colour follows CSS `color` and size follows font-size (1em).
 *
 * Only the icons the components actually need live here — add more (from the
 * prototype's components/icons) as they're used, not speculatively.
 */

export type IconProps = ComponentProps<'svg'>

const Fill = (props: IconProps) => (
  <svg
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  />
)

const Stroke = (props: IconProps) => (
  <svg
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    {...props}
  />
)

export const ChevronDownIcon = (props: IconProps) => (
  <Fill viewBox="0 0 24 24" {...props}>
    <path d="M12 13.586 6.707 8.293a1 1 0 0 0-1.414 1.414l6 6a1 1 0 0 0 1.414 0l6-6a1 1 0 1 0-1.414-1.414L12 13.586z" />
  </Fill>
)

export const CheckIcon = (props: IconProps) => (
  <Stroke viewBox="0 0 24 24" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Stroke>
)

export const CloseIcon = (props: IconProps) => (
  <Fill viewBox="0 0 21 20" {...props}>
    <path d="M14.41 4.41a.833.833 0 0 1 1.18 1.18L11.177 10l4.411 4.41a.834.834 0 0 1 .075 1.094l-.075.085a.833.833 0 0 1-1.178 0L10 11.178l-4.41 4.411a.834.834 0 0 1-1.094.075l-.085-.075a.833.833 0 0 1 0-1.178L8.82 10l-4.41-4.41a.834.834 0 0 1-.075-1.094l.075-.085a.833.833 0 0 1 1.178 0L10 8.82z" />
  </Fill>
)

export const SearchIcon = (props: IconProps) => (
  <Fill viewBox="0 0 16 16" {...props}>
    <path d="M7 1.333a5.667 5.667 0 0 1 4.45 9.175l3.021 3.02a.667.667 0 0 1-.942.943l-3.02-3.02A5.667 5.667 0 1 1 7 1.333zm0 1.334a4.333 4.333 0 1 0 3.044 7.417l.018-.022A4.306 4.306 0 0 0 11.333 7 4.333 4.333 0 0 0 7 2.667z" />
  </Fill>
)

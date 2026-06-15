import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * An `SvgIcon` that mirrors itself horizontally for right-to-left languages
 * (Arabic, Dari, Pashto).
 *
 * Use this instead of `SvgIcon` only for icons whose meaning is directional —
 * arrows, external-link, list, sidebar, truck, search, the mSupply man, etc.
 * Non-directional symbols (checkmark, help, info, translate, settings...) must
 * keep using `SvgIcon` directly, otherwise they render reversed (a backwards
 * tick / question mark / "A文" glyph).
 *
 * The flip is driven by the active theme `direction`, so it follows the
 * language automatically and is a no-op in LTR. Any caller-provided `sx` is
 * merged via the array form so it composes rather than overwrites.
 */
export const RtlFlipIcon = ({ sx, ...props }: SvgIconProps): JSX.Element => (
  <SvgIcon
    {...props}
    sx={[
      theme =>
        theme.direction === 'rtl' ? { transform: 'scaleX(-1)' } : {},
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  />
);

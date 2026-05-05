import React from 'react';
import { styled, Popper, PopperProps } from '@mui/material';

const InnerPopper = styled(Popper)(({ theme }) => ({
  boxShadow: theme.shadows[2],
}));

// Keeps the dropdown within the viewport on narrow screens (e.g. tablets)
// when the input sits near the edge.
const defaultModifiers: NonNullable<PopperProps['modifiers']> = [
  { name: 'preventOverflow', options: { altAxis: true, padding: 8 } },
];

export const StyledPopper = React.forwardRef<HTMLDivElement, PopperProps>(
  ({ modifiers, ...props }, ref) => (
    <InnerPopper
      ref={ref}
      {...props}
      modifiers={[...defaultModifiers, ...(modifiers ?? [])]}
    />
  )
);

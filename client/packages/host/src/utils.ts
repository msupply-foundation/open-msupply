import { ReactNode } from 'react';

export const getBadgeProps = (value?: number) => ({
  badgeContent: (value ?? 0) as ReactNode,
  max: 99,
  color: 'primary' as 'primary' | 'default',
});

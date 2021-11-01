import React from 'react';

export interface ReadOnlyInputProps {
  number?: boolean;
  style?: React.CSSProperties;
  width?: string;
}

export const ReadOnlyInput: React.FC<ReadOnlyInputProps> = React.forwardRef<
  HTMLInputElement,
  ReadOnlyInputProps
>(({ number, style, width = '100%', ...props }, ref) => (
  <input
    disabled
    style={{
      border: 0,
      backgroundColor: 'transparent',
      width,
      textAlign: number ? 'right' : undefined,
      ...style,
    }}
    ref={ref}
    {...props}
  />
));

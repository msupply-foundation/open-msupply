import React from 'react';

export interface ReadOnlyInputProps {
  number?: boolean;
  style?: React.CSSProperties;
  width?: string;
  value?: string;
}

export const ReadOnlyInput: React.FC<ReadOnlyInputProps> = React.forwardRef<
  HTMLInputElement,
  ReadOnlyInputProps
>(({ number, style, width = '100%', value, ...props }, ref) => (
  <input
    disabled
    style={{
      border: 0,
      backgroundColor: 'transparent',
      width,
      textAlign: number ? 'right' : undefined,
      color: 'inherit',
      ...style,
    }}
    ref={ref}
    value={value}
    {...props}
  />
));

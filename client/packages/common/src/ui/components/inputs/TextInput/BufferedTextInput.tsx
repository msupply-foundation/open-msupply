import React, { FC } from 'react';
import { BasicTextInput, BasicTextInputProps } from './BasicTextInput';
import { useBufferState } from '@common/hooks';

export type BufferedTextInputProps = BasicTextInputProps;

/**
 * The intention/use case of/for this component is for debouncing text input.
 * For example when triggering a debounced network request on typing values,
 * but wanting the text input to properly update while also allowing for
 * the component to be controlled.
 */

export const BufferedTextInput: FC<BufferedTextInputProps> = ({
  InputProps,
  value,
  onChange,
  ...rest
}) => {
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <BasicTextInput
      {...rest}
      value={buffer}
      InputProps={InputProps}
      onChange={e => {
        setBuffer(e.target.value);
        onChange?.(e);
      }}
    />
  );
};

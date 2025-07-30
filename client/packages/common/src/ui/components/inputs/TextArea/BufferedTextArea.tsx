import React from 'react';
import { StandardTextFieldProps } from '@mui/material/TextField';
import { BasicTextInput } from '../TextInput';
import { useBufferState } from '@common/hooks';

export const BufferedTextArea = ({
  value,
  onChange,
  maxRows = 4,
  minRows = 4,
  slotProps,
  ...props
}: StandardTextFieldProps) => {
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <BasicTextInput
      sx={{ width: '100%' }}
      slotProps={{
        input: {
          ...slotProps?.input,
          sx: {
            backgroundColor: 'white',
            // Ignoring below, see https://github.com/mui/material-ui/issues/45041
            // @ts-expect-error: use mergeSlotProps when it's available in MUI-6
            ...slotProps?.input?.sx,
          },
        },
      }}
      multiline
      value={buffer}
      onChange={e => {
        const newVal = e.target.value;
        onChange?.(e);
        setBuffer(newVal);
      }}
      maxRows={maxRows}
      minRows={minRows}
      {...props}
    />
  );
};

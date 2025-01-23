import React, { FC } from 'react';
import { StandardTextFieldProps } from '@mui/material/TextField';
import { BasicTextInput } from '../TextInput';

export const BufferedTextArea: FC<StandardTextFieldProps> = ({
  value,
  onChange,
  maxRows = 4,
  minRows = 4,
  slotProps,
  ...props
}) => {
  const [buffer, setBuffer] = React.useState(value);

  React.useEffect(() => {
    setBuffer(value);
  }, [value]);

  return (
    <BasicTextInput
      sx={{ width: '100%' }}
      slotProps={{
        input: {
          ...slotProps?.input,
          sx: {
            backgroundColor: 'white',
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

import React, { ReactNode } from 'react';
import { FormLabel, Box, FormLabelProps, SxProps, Theme } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';

export interface InputWithLabelRowProps {
  Input: ReactNode;
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string | null;
  labelRight?: boolean;
  sx?: SxProps<Theme>;
  /**
   * Stamps data-testid on the row container so e2e can locate a field without
   * depending on its translated label. The control itself is the input inside.
   */
  testId?: string;
}

export const InputWithLabelRow = ({
  label,
  Input = <BasicTextInput />,
  labelProps,
  labelWidth = '120px',
  labelRight = false,
  sx,
  testId,
}: InputWithLabelRowProps) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};

  return (
    <Box
      data-testid={testId}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...(labelRight
          ? { gap: 2, flexDirection: 'row-reverse', justifyContent: 'flex-end' }
          : {}),
        ...sx,
      }}
    >
      <FormLabel
        sx={{ width: labelWidth, fontWeight: 'bold', ...labelSx }}
        {...labelPropsRest}
      >
        {/* Split on '/' and insert <wbr /> so browsers can wrap at slashes without visible whitespace */}
        {label.split('/').map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <>
                /<wbr />
              </>
            )}
            {part}
          </React.Fragment>
        ))}
        {labelRight ? '' : ':'}
      </FormLabel>
      {Input}
    </Box>
  );
};

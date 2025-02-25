import React, { useEffect, useRef } from 'react';
import {
  Box,
  StandardTextFieldProps,
  TextField,
  Typography,
} from '@mui/material';

export type BasicTextInputProps = StandardTextFieldProps & {
  textAlign?: 'left' | 'center' | 'right';
  focusOnRender?: boolean;
};

/**
 * Very basic TextInput component with some simple styling applied where you can
 * build your input on top.
 */

export const BasicTextInput = React.forwardRef<
  HTMLDivElement,
  BasicTextInputProps
>(
  (
    {
      sx,
      style,
      slotProps,
      error,
      required,
      textAlign,
      focusOnRender,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (focusOnRender) {
        inputRef?.current;
        inputRef?.current?.focus();
      }
    }, []);

    return (
      <Box
        display="flex"
        justifyContent={style?.justifyContent ?? 'flex-end'}
        alignItems="center"
        flexBasis={style?.flexBasis}
        flex={style?.flex}
        width={props.fullWidth ? '100%' : undefined}
        sx={
          props.fullWidth
            ? { '& .MuiTextField-root': { width: '100%' } }
            : undefined
        }
      >
        <TextField
          ref={ref}
          inputRef={inputRef}
          color="secondary"
          // Sx props can be provided as an array of SxProp objects. In this
          // case, it doesn't work to try and merge it as though it was an
          // object. So we're going to convert this input to a single array of
          // SX props here, which means it'll be safe regardless of the shape of
          // the incoming sx prop
          sx={[
            {
              '& .MuiInput-underline:before': { borderBottomWidth: 0 },
              '& .MuiInput-input': { color: 'gray.dark', textAlign },
            },
            sx ?? {},
          ].flat()}
          variant="standard"
          size="small"
          slotProps={{
            input: {
              disableInjectingGlobalStyles: true,
              disableUnderline: error ? true : false,
              ...slotProps?.input,
              sx: {
                border: theme =>
                  error ? `2px solid ${theme.palette.error.main}` : 'none',
                backgroundColor: theme =>
                  props.disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.menu,
                borderRadius: 1,
                padding: 0.5,
                // Ignoring below, see https://github.com/mui/material-ui/issues/45041, use mergeSlotProps when it's available in MUI-6
                // @ts-ignore
                ...slotProps?.input?.sx,
              },
            },
            htmlInput: {
              style: props?.disabled ? { textOverflow: 'ellipsis' } : {},
              inputMode: props?.disabled ? undefined : props.inputMode,
              // Ignoring below, see https://github.com/mui/mui-x/issues/14684, slot props not merged from datepickers
              ...props.inputProps,
              ...slotProps?.htmlInput,
              // Ignoring below, see https://github.com/mui/material-ui/issues/45041, use mergeSlotProps when it's available in MUI-6
              // @ts-ignore
              sx: { padding: 0.5, ...slotProps?.htmlInput?.sx },
            },
          }}
          {...props}
        />
        <Box width={2}>
          {required && (
            <Typography
              sx={{
                color: 'primary.light',
                fontSize: '17px',
                marginRight: 0.5,
              }}
            >
              *
            </Typography>
          )}
        </Box>
      </Box>
    );
  }
);

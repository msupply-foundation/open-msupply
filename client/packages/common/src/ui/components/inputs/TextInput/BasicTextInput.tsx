import React, { useEffect, useRef } from 'react';
import {
  Box,
  StandardTextFieldProps,
  TextField,
  Typography,
} from '@mui/material';
import { CustomErrorValue, useFormField } from '@common/hooks';

export type FormErrorBinding = {
  formId: string;
  fieldId: string;
  label: string;
};

export type BasicTextInputProps = StandardTextFieldProps & {
  textAlign?: 'left' | 'center' | 'right';
  focusOnRender?: boolean;
  /**
   * Opts the input into the form-error system. When provided, `error` and
   * required-state visibility are driven by the store; otherwise the input
   * behaves exactly as before.
   */
  formError?: FormErrorBinding;
  /**
   * Reactive custom error. Only used when `formError` is set. Pass a string
   * for an immediate error, or `{ message, showOnSubmit: true }` to defer
   * the error until the user attempts Save (same gate as required errors).
   */
  customError?: CustomErrorValue;
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
      error: errorProp,
      required,
      textAlign,
      focusOnRender,
      formError,
      customError,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (focusOnRender && inputRef.current) {
        inputRef.current.focus();
      }
    }, [focusOnRender]);

    const { error: storeError } = useFormField({
      formId: formError?.formId ?? '',
      fieldId: formError?.fieldId ?? '',
      label: formError?.label ?? '',
      value: props.value,
      required,
      customError,
    });
    const error = formError ? errorProp || storeError : errorProp;

    const isReadOnly =
      !!(slotProps?.htmlInput as { readOnly?: boolean })?.readOnly ||
      !!(props.inputProps as { readOnly?: boolean })?.readOnly;

    return (
      <Box
        display="flex"
        justifyContent={style?.justifyContent}
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
          color="primary"
          sx={[
            {
              '& .MuiOutlinedInput-input': { color: 'gray.dark', textAlign },
              '& .MuiOutlinedInput-root': {
                backgroundColor: isReadOnly
                  ? 'rgba(0, 0, 0, 0.02)'
                  : '#ffffff',
              },
              '& .MuiOutlinedInput-root.Mui-disabled': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            },
            sx ?? {},
          ].flat()}
          variant="outlined"
          size="small"
          error={error}
          slotProps={{
            ...slotProps,
            input: {
              disableInjectingGlobalStyles: true,
              ...slotProps?.input,
              sx: {
                // Ignoring below, see https://github.com/mui/material-ui/issues/45041
                // @ts-expect-error: use mergeSlotProps when it's available in MUI-6
                ...slotProps?.input?.sx,
              },
            },
            htmlInput: {
              style: props?.disabled ? { textOverflow: 'ellipsis' } : {},
              inputMode: props?.disabled ? undefined : props.inputMode,
              // Ignoring below, see https://github.com/mui/mui-x/issues/14684, slot props not merged from datepickers
              ...props.inputProps,
              ...slotProps?.htmlInput,
              // Ignoring below, see https://github.com/mui/material-ui/issues/45041
              // @ts-expect-error: use mergeSlotProps when it's available in MUI-6
              sx: { ...slotProps?.htmlInput?.sx },
            },
            inputLabel: {
              ...slotProps?.inputLabel,
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
                pl: 0.2,
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

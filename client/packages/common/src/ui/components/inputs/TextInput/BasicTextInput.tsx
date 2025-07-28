import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  StandardTextFieldProps,
  TextField,
  Typography,
} from '@mui/material';
import { useFormFieldError } from 'packages/common/src/hooks/useFormErrors/FormErrorStoreNew';
import { FnUtils } from '@common/utils';

export type BasicTextInputProps = StandardTextFieldProps & {
  textAlign?: 'left' | 'center' | 'right';
  focusOnRender?: boolean;
  formErrorProps?: {
    formId: string;
    label: string;
    fieldId?: string;
  };
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
      error: propsError,
      required,
      textAlign,
      focusOnRender,
      formErrorProps: { formId, fieldId: inputFieldId, label = '' } = {},
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLDivElement | null>(null);

    // recommend passing in fieldId as a recognisable string (e.g. 'patientName'),
    // but for transition could use UUID as a fallback, so only formId is required
    const fieldId = useRef(inputFieldId ?? FnUtils.generateUUID()).current;

    useEffect(() => {
      if (focusOnRender && inputRef.current) {
        inputRef.current.focus();
      }
    }, [focusOnRender]);

    const isError = useFormFieldError({
      formId,
      fieldId,
      required,
      value: props.value,
      label,
      // todo: custom errors
    });

    const error = propsError ?? isError;

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
            ...slotProps,
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
                borderRadius: 2,
                padding: 0.5,
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
              sx: { padding: 0.5, ...slotProps?.htmlInput?.sx },
            },
            inputLabel: {
              ...slotProps?.inputLabel,
            },
          }}
          // What are the valid use cases of `error` - probs should go through error state
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

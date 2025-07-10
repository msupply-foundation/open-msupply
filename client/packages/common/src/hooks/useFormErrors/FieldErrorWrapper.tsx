import React, { useEffect } from 'react';
import { useFormErrorContext } from './NewFormErrorContext';

type FieldErrorWrapperProps = {
  code: string;
  label?: string;
  value: string | undefined;
  //   onChange: (value: string) => void;
  required?: boolean;
  children: (fieldProps: {
    value: string | undefined;
    required?: boolean;
    errorMessage?: string | null;
    setError: (errorMessage: string | null) => void;
    // onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // onBlur: () => void;
  }) => React.ReactNode;
};

export const FieldErrorWrapper: React.FC<FieldErrorWrapperProps> = ({
  code,
  label,
  value,
  required,
  children,
}) => {
  const {
    registerField,
    unregisterField,
    setError,
    getErrorData,
    updateErrorData,
  } = useFormErrorContext();

  const errorData = getErrorData(code);

  useEffect(() => {
    registerField(code, { required, label });
    return () => unregisterField(code);
  }, [code, label]);

  useEffect(() => {
    const { requiredError } = errorData;

    console.log('Value', code, errorData);

    if (required && !value) {
      updateErrorData(code, { requiredError: 'this field is required' });
    } else if (requiredError) {
      updateErrorData(code, { requiredError: null });
    }
  }, [value, required]);

  return (
    <>
      {children({
        value,
        required,
        errorMessage: errorData.error,
        setError: (errorMessage: string | null) => setError(code, errorMessage),
      })}
    </>
  );
};

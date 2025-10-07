/**
 * This hook provides methods for adding, updating or removing error objects
 * from JSONForms' "additionalErrors" array.
 *
 * See https://jsonforms.io/docs/validation#external-validation-errors
 *
 * The update methods are added to the core "config" object to make them
 * available to all renderer components, and the "additionalErrors" array is
 * passed as a property on the main JsonForms component. Internally it is merged
 * with its own validation errors, so can be accessed on the `errors` property
 * of any control.
 */

import { useCallback, useState } from 'react';
import { ErrorObject } from 'ajv';

export const useAdditionalErrors = (
  setError: ((error: string | false) => void) | undefined
) => {
  const [additionalErrors, setAdditionalErrors] = useState<ErrorObject[]>([]);

  const addAdditionalError = useCallback(
    (path: string, message: string) => {
      setAdditionalErrors(prevErrors => {
        const existing = prevErrors.find(error => error.instancePath === path);
        if (existing) {
          if (existing?.message === message) return prevErrors;
          // Update existing error if message has changed
          const newErrors = prevErrors.filter(
            error => error.instancePath !== path
          );
          return [...newErrors, { ...existing, message }];
        }

        // Add if new error
        return [
          ...prevErrors,
          {
            instancePath: path,
            message: message,
            schemaPath: '',
            keyword: 'custom',
            params: {},
          },
        ];
      });

      // This updates the form's overall "error" state, if it's defined
      if (setError) setError(message);
    },
    [setError]
  );

  const removeAdditionalError = useCallback((path: string) => {
    // Resetting errors in the same render cycle prevents newly modified data
    // being updated correctly -- small timeout allow it to settle before
    // updating errors
    setTimeout(() => {
      setAdditionalErrors(prevErrors => {
        const existing = prevErrors.find(error => error.instancePath === path);
        if (!existing) return prevErrors;

        return prevErrors.filter(error => error.instancePath !== path);
      });
    }, 50);
  }, []);

  return {
    additionalErrors,
    addAdditionalError,
    removeAdditionalError,
  };
};

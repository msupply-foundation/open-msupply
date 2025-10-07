/**
 * This hook provides methods for adding, updating or removing error objects
 * from JSONForms' "additionalErrors" array.
 *
 * See https://jsonforms.io/docs/validation#external-validation-errors
 *
 * The update methods are added to the core "config" object to make them
 * available to all renderer components, and the "additionalErrors" array is
 * passed as a property on the main JsonForms component. Internally it is merged
 * with its own validation errors, so can be accessed on the `error` property of
 * any control.
 */

import { useCallback, useState } from 'react';
import { ErrorObject } from 'ajv';

export const useAdditionalErrors = () => {
  const [additionalErrors, setAdditionalErrors] = useState<ErrorObject[]>([]);

  const addAdditionalError = useCallback(
    (path: string, message: string) => {
      const existing = additionalErrors.find(
        error => error.instancePath === path
      );
      if (existing) {
        if (existing?.message === message) return;
        // Update existing error if message has changed
        setAdditionalErrors(prevErrors => {
          const newErrors = prevErrors.filter(
            error => error.instancePath !== path
          );
          return [...newErrors, { ...existing, message }];
        });
        return;
      }

      // Add if new error
      setAdditionalErrors(prevErrors => [
        ...prevErrors,
        {
          instancePath: path,
          message: message,
          schemaPath: '',
          keyword: 'custom',
          params: {},
        },
      ]);
    },
    [additionalErrors]
  );

  const removeAdditionalError = useCallback(
    (path: string) => {
      const existing = additionalErrors.find(
        error => error.instancePath === path
      );
      if (!existing) return;

      // Resetting errors in the same render cycle prevents newly modified data
      // being updated correctly -- small timeout allow it to settle before
      // updating errors
      setTimeout(() => {
        setAdditionalErrors(prevErrors =>
          prevErrors.filter(error => error.instancePath !== path)
        );
      }, 50);
    },
    [additionalErrors]
  );

  return {
    additionalErrors,
    addAdditionalError,
    removeAdditionalError,
  };
};

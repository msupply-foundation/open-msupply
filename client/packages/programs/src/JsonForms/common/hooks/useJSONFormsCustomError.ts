import { Actions } from '@jsonforms/core';
import { useJsonForms } from '@jsonforms/react';
import { useEffect, useState } from 'react';

export const useJSONFormsCustomError = (
  path: string,
  keyword: string
): {
  customError: string | undefined;
  setCustomError: React.Dispatch<React.SetStateAction<string | undefined>>;
} => {
  const [customError, setCustomError] = useState<string | undefined>();
  const { core, dispatch } = useJsonForms();
  useEffect(() => {
    if (!core || !dispatch) {
      return;
    }
    const currentErrors = core?.errors ?? [];
    const existingIndex = currentErrors.findIndex(
      it => it.schemaPath === path && it.keyword === keyword
    );
    if (customError) {
      if (existingIndex === -1)
        dispatch(
          Actions.updateErrors([
            ...currentErrors,
            {
              instancePath: `/${path}`.replace(/\./g, '/'),
              message: customError,
              schemaPath: path,
              keyword,
              params: {},
            },
          ])
        );
      else {
        const existingAction = currentErrors[existingIndex];
        if (existingAction && existingAction?.message !== customError) {
          existingAction.message = customError;
          dispatch(Actions.updateErrors([...currentErrors]));
        }
      }
    }
  }, [core, dispatch, customError, path, keyword]);

  return { customError, setCustomError };
};

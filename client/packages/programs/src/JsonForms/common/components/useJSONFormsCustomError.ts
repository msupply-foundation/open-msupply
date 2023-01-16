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
    if (
      customError &&
      !currentErrors.find(
        it => it.schemaPath === path && it.keyword === keyword
      )
    ) {
      dispatch(
        Actions.updateErrors([
          ...currentErrors,
          {
            instancePath: path,
            message: customError,
            schemaPath: path,
            keyword,
            params: {},
          },
        ])
      );
    }
  }, [core, dispatch, customError, path]);

  return { customError, setCustomError };
};

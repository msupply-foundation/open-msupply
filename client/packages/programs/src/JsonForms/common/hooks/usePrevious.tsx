import { useJsonForms } from '@jsonforms/react';
import { useEffect, useState } from 'react';

interface Options {
  defaultToPrevious?: boolean;
  displayPrevious?: boolean;
}

export const usePrevious = (
  path: string,
  data: unknown,
  options: Options = {},
  setValue?: (value: any) => void
) => {
  const [previousValue, setPreviousValue] = useState<unknown>();
  const { config } = useJsonForms();

  const { defaultToPrevious, displayPrevious } = options;

  useEffect(() => {
    if (!displayPrevious && !defaultToPrevious) return;
    if (config.previous) {
      //   console.log('Getting previous value for path:', path);
      config.previous.getPrevious?.(path).then((value: unknown) => {
        // console.log('Previous value for path', path, value);
        if (value !== undefined && value !== previousValue) {
          setPreviousValue(value);
          //   console.log(path, 'defaultToPrevious', defaultToPrevious);
          //   console.log(path, 'data', data);
          if (defaultToPrevious && data === undefined && setValue) {
            setTimeout(() => setValue(value), 500);
          }
        }
      });
    }
  }, [displayPrevious, defaultToPrevious]);

  return displayPrevious ? previousValue : undefined;
};

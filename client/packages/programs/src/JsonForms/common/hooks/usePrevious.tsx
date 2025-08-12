/**
 * Hook to standardise the retrieval of previous data (specifically Encounters)
 * for JSON Form components.
 *
 * Will only do anything if:
 * - there is a `previous` object defined in the JSON Forms config object
 * - at least one component in a form requests previous data by specifying one
 *   of the two available options
 */

import { useJsonForms } from '@jsonforms/react';
import { useEffect, useState } from 'react';
import { PreviousData } from '../../usePreviousEncounter';

/** Components must specify one or both of the following options to access
 * previous data
 */
interface Options {
  /**
   * If `true`, and the component doesn't already have set data, it will update
   * the current value with the previous value, if present
   */
  defaultToPrevious?: boolean;
  /**
   * If `true`, will just return the previous value for the component to display
   * (or use) as it requires.
   */
  displayPrevious?: boolean;
  /**
   * Normally the component will fetch the previous data for its own path, but
   * if this value is specified it can pull from another field
   */
  previousPath?: string;
}

export const usePrevious = (
  path: string,
  data: unknown,
  options: Options = {},
  setValue?: (value: any) => void
) => {
  const [previousValue, setPreviousValue] = useState<
    PreviousData | undefined
  >();
  const { config } = useJsonForms();

  const { defaultToPrevious, displayPrevious, previousPath } = options;

  useEffect(() => {
    if (!displayPrevious && !defaultToPrevious) return;

    if (config.previous) {
      config.previous
        .getPrevious?.(previousPath ?? path)
        .then((prev: PreviousData) => {
          if (prev !== undefined && prev !== previousValue) {
            setPreviousValue(prev);

            if (defaultToPrevious && data === undefined && setValue) {
              // Using a timeout here is very hacky, but, unless we wait for the
              // JSON Forms data to fully initialise before resetting, results in
              // an infinite data update loop. Needs proper debugging and
              // refactoring at some point.
              setTimeout(() => setValue(prev.previousValue), 250);
            }
          }
        });
    }
  }, [displayPrevious, defaultToPrevious]);

  return displayPrevious ? previousValue : undefined;
};

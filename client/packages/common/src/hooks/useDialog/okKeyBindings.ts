import React from 'react';

export interface OkKeyBindingsInput {
  onOk?: () => void;
  okDisabled?: boolean;
  onNext?: () => void;
  nextDisabled?: boolean;
}
/**
 * - [Enter] calls the onNext callback
 * - key combination of [CTRL+Enter] calls the onOk callback
 *
 * If onNext is not provided, the onOk callback is called on [Enter]
 */

export function makeOkKeyBindingsHandler({
  onOk,
  okDisabled,
  onNext,
  nextDisabled,
}: OkKeyBindingsInput): React.KeyboardEventHandler<HTMLDivElement> {
  return e => {
    if (e.key === 'Enter') {
      // if there is no onNext callback
      if (!onNext) {
        // and there is an onOk callback, onOk is called on Enter
        if (!!onOk && !okDisabled) {
          e.preventDefault();
          onOk();
        }
        // if there is an onNext callback, the onOk callback (if present) is called on [CTRL+Enter]
      } else {
        if (e.ctrlKey && !!onOk && !okDisabled) {
          e.preventDefault();
          onOk();
          // and the onNext callback is called on Enter
        } else if (!nextDisabled) {
          e.preventDefault();
          onNext();
        }
      }
    }
  };
}

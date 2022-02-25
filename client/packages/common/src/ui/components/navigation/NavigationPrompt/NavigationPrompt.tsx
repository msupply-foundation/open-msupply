import React, { useEffect } from 'react';
// import { Prompt } from 'react-router-dom';

export interface NavigationPromptProps {
  isUnsaved: boolean;
}

export const NavigationPrompt: React.FC<NavigationPromptProps> = ({
  isUnsaved,
}) => {
  const promptUser = (e: BeforeUnloadEvent) => {
    // Cancel the event
    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = '';
  };

  useEffect(() => {
    if (isUnsaved) {
      window.addEventListener('beforeunload', promptUser, { capture: true });
    } else {
      window.removeEventListener('beforeunload', promptUser, { capture: true });
    }
  }, [isUnsaved]);

  return <></>;
  // Prompt, usePrompt and useBlocker are not currently implemented in the current v6 release
  // the advice is that these will be included in a later release
  // <Prompt
  //   when={isUnsaved}
  //   message={(location: Location) =>
  //     `Are you sure you want to go to ${location.pathname}? Changes you have made may not be saved.`
  //   }
  // />
};

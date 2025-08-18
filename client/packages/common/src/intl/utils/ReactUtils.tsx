// Utilities that are part of IntlUtils.ts, but use JSX in some way,
// and hence need to be in a .tsx file.

// They should be re-exported from IntlUtils.ts

import React from 'react';

// Allow line breaks in translations. Splits the translation string by line
// breaks (\n), and wraps each line in a specified component (default is
// 'span'), with <br/> to break up each line.
export const splitTranslatedLines = (
  translation: string,
  Component: React.ElementType = 'span'
) => {
  return translation.split('\n').map((line, index) => (
    <>
      <Component key={index}>{line}</Component>
      {index < translation.split('\n').length - 1 && <br />}
    </>
  ));
};

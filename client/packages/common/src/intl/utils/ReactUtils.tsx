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
  const lines = translation.split('\n');
  return lines.map((line, index) => (
    <React.Fragment key={index}>
      <Component>{line}</Component>
      {index < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

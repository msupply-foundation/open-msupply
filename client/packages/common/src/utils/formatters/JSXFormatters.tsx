import React from 'react';

export const JSXFormatters = {
  /*
  Converts a string with line breaks (\n) into HTML with <br/> line breaks
  */
  replaceHTMLlineBreaks: (input: string) => {
    const lines = input.split('\n');
    return lines.map((line, i) => (
      <span key={i}>
        {line}
        {i === lines.length - 1 ? null : <br />}
      </span>
    ));
  },
};

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
        {/* Don't add line break to final line */}
        {i === lines.length - 1 ? null : <br />}
      </span>
    ));
  },
};

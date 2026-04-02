import React from 'react';

/**
 * Formats multiple newline-separated error messages into a bulleted list.
 * If there's only one error (or none), returns it as-is.
 *
 * JSON Forms joins multiple errors with '\n' which renders as a space in HTML.
 * This function adds bullet points to make multiple errors distinguishable.
 */
export const formatErrors = (
  errors: string | undefined
): React.ReactNode | undefined => {
  if (!errors) return errors;
  const parts = errors.split('\n').filter(Boolean);
  if (parts.length <= 1) return errors;
  return (
    <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
      {parts.map((e, i) => (
        <li key={i}>{e}</li>
      ))}
    </ul>
  );
};

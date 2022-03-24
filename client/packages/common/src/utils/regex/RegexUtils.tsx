import React from 'react';
import DOMPurify from 'dompurify';

export const RegexUtils = {
  extractSvg: (
    snippet: string,
    style?: React.CSSProperties
  ): JSX.Element | null => {
    const svgRegex = /<svg([^>]*)>([\w\W]*)<\/svg>/i;
    const matches = DOMPurify.sanitize(snippet).match(svgRegex);
    if (!matches || matches.length < 2) return null;

    const paths = matches?.[2] || '';
    const viewBoxes = (matches?.[1] || '').match(/viewBox=['"]([^'"]+)['"]/i);
    const viewBox =
      viewBoxes && viewBoxes.length > 1 ? viewBoxes[1] : undefined;

    return (
      <svg
        dangerouslySetInnerHTML={{ __html: paths }}
        viewBox={viewBox}
        style={style}
      />
    );
  },
  // Case-insensitive match of partial string -- same as SQL "LIKE"
  matchSubstring: (substring: string, testString: string) => {
    const matcher = new RegExp(substring, 'i');
    return matcher.test(testString);
  },
  // Case-insensitive version of 'startsWith'
  matchString: (substring: string, testString: string) => {
    const matcher = new RegExp(`^${substring}`, 'i');
    return matcher.test(testString);
  },
  // matches test string against an object's name or code properties
  matchNameOrCode: (
    item: { name: string; code: string },
    searchString: string
  ) => {
    return (
      RegexUtils.matchString(searchString, item.name) ||
      RegexUtils.matchString(searchString, item.code)
    );
  },
};

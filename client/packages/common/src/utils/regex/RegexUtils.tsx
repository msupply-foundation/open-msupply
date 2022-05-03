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
  includes: (substring: string, testString: string) => {
    const matcher = new RegExp(substring, 'i');
    return matcher.test(testString);
  },
  // Case-insensitive
  startsWith: (substring: string, testString: string) => {
    const matcher = new RegExp(`^${substring}`, 'i');
    return matcher.test(testString);
  },
  // returns true if the search string is contained in any of the properties of a given object
  // the props can be specified, of left blank to match all
  matchObjectProperties: function <T>(
    substring: string,
    object: T,
    keys?: Array<keyof T>
  ) {
    return (keys ?? (Object.keys(object) as Array<keyof T>)).some(key =>
      RegexUtils.includes(substring, String(object[key]))
    );
  },
  escapeChars: (regexString: string) =>
    regexString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
};

import React from 'react';
import DOMPurify from 'dompurify';
import { extractProperty } from '@common/utils';

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
  matchObjectProperties: function <T extends object>(
    substring: string,
    object: T,
    keys?: Array<keyof T>
  ) {
    return (keys ?? (Object.keys(object) as Array<keyof T>)).some(key =>
      RegexUtils.includes(this.escapeChars(substring), String(object[key]))
    );
  },
  escapeChars: (regexString: string) =>
    regexString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),

  /** Takes a string formatted in template-literal style (i.e. using ${ }) and
   * replaces contents of the matching parameters with values from provided
   * data object.
   * Eg. "My name is ${user.name}" with object {user: {name: "Frodo"}}
   * returns "My name is Frodo" */
  formatTemplateString: (
    parameterisedString: string,
    data: object,
    fallback = 'Not found'
  ) =>
    parameterisedString.replace(
      /\${(.*?)}/gm,
      (_: string, match: string) =>
        extractProperty(data, match, fallback) ?? fallback
    ),

  /* Removes any empty lines from a multi-line string (an "empty line" is any
   * line with no content or only white space) */
  removeEmptyLines: (input: string): string => {
    return input.replace(/(^\W*$\n)/gm, '');
  },
};

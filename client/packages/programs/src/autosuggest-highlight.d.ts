declare module 'autosuggest-highlight/parse' {
  export interface Part {
    text: string;
    highlight: boolean;
  }
  function parse(text: string, matches: number[][]): Part[];
  export default parse;
}

declare module 'autosuggest-highlight/match' {
  interface MatchOptions {
    insideWords?: boolean;
    findAllOccurrences?: boolean;
    requireMatchAll?: boolean;
  }
  function match(text: string, query: string, options?: MatchOptions): number[][];
  export default match;
}

type Query = Record<string, string | number | boolean>;

export class RouteBuilder {
  parts: string[];
  query: Query;

  constructor(part: string) {
    this.parts = [part];
    this.query = {};
  }

  static create(part: string): RouteBuilder {
    return new RouteBuilder(part);
  }

  addPart(part: string): RouteBuilder {
    this.parts.push(part);
    return this;
  }

  addWildCard(): RouteBuilder {
    this.parts.push('*');
    return this;
  }

  addQuery(params: Query): RouteBuilder {
    this.query = { ...this.query, ...params };
    return this;
  }

  build(): string {
    const queryString = Object.entries(this.query)
      .reduce((str, [key, value]) => `${str}&${key}=${value}`, '')
      // Should start with a "?" not "&"
      .replace('&', '?');
    return `/${this.parts.join('/')}${queryString}`;
  }
}

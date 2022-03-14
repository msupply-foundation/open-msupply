export class RouteBuilder {
  parts: string[];

  constructor(part: string) {
    this.parts = [part];
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

  build(): string {
    return `/${this.parts.join('/')}`;
  }
}

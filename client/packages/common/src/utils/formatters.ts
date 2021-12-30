import format from 'date-fns/format';
import isValid from 'date-fns/isValid';

export const formatDate = (date: Date): string =>
  `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

export const formatNaiveDate = (date: Date): string | null => {
  if (isValid(date)) return format(date, 'yyyy-MM-dd');
  else return null;
};

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

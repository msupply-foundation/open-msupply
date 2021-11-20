import faker from 'faker';

export const randomInteger = ({
  min = 0,
  max = 10,
}: {
  min: number;
  max: number;
}): number => {
  return faker.datatype.number({ min, max });
};

export const randomName = (): string => {
  return `${faker.name.firstName()} ${faker.name.lastName()}`;
};

export const randomFloat = (
  min: number,
  max: number,
  precision = 2
): number => {
  return faker.datatype.float({
    min,
    max,
    precision,
  });
};

export const randomPercentage = (min: number): number =>
  faker.datatype.number(100) / 100 + min / 100;

export const takeRandomNumberFrom = (min: number, max: number): number =>
  faker.datatype.number({ min, max });

export const takeRandomPercentageFrom = (
  number: number,
  options = { minPercentage: 0 }
): number => {
  const percentageToTake = randomPercentage(options.minPercentage);
  const take = Math.ceil(number * percentageToTake);

  return take;
};

export const takeRandomElementFrom = <T>(array: T[]): T => {
  const randomIdx = Math.floor(Math.random() * array.length);
  const thing = array[randomIdx];

  if (!thing) {
    throw new Error(`could not take a random element`);
  }

  return thing;
};

export const takeRandomSubsetFrom = <T>(array: T[], max?: number): T[] => {
  const sizeOfSubset = takeRandomNumberFrom(
    0,
    Math.min(array.length, max || array.length)
  );
  return Array.from({ length: sizeOfSubset }).map(() =>
    takeRandomElementFrom(array)
  );
};

export const getSumFn =
  <T>(key: keyof T) =>
  (acc: number, obj: T): number =>
    (obj[key] as unknown as number) + acc;

export const getFilter =
  <T>(matchVal: unknown, key: keyof T) =>
  (obj: T): boolean =>
    obj[key] === matchVal;

export const addRandomPercentageTo = ({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}): number => value + (value * randomInteger({ min, max })) / 100;

export const roundDecimalPlaces = (value: number, precision: number): number =>
  Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);

export const alphaString = (length: number): string =>
  Array.from({ length }, () =>
    String.fromCharCode(faker.datatype.number({ min: 65, max: 90 }))
  ).join('');

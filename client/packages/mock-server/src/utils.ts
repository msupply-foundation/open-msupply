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
  return array[randomIdx] as T;
};

export const takeRandomSubsetFrom = <T>(array: T[]): T[] => {
  const sizeOfSubset = takeRandomNumberFrom(0, array.length);
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

const parseValue = <T>(object: T, key: keyof T) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);
    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

export const getDataSorter =
  (sortKey: string, desc: boolean) => (a: any, b: any) => {
    const valueA = parseValue(a, sortKey);
    const valueB = parseValue(b, sortKey);

    if (valueA < valueB) {
      return desc ? 1 : -1;
    }
    if (valueA > valueB) {
      return desc ? -1 : 1;
    }

    return 0;
  };

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

import faker from 'faker';

export const randomPercentage = min => faker.datatype.number(100) / 100 + min;

export const takeRandomNumberFrom = (min, max) =>
  faker.datatype.number({ min, max });

export const takeRandomPercentageFrom = (
  number,
  options = { minPercentage: 0 }
) => {
  const percentageToTake = randomPercentage(options.minPercentage);
  const take = Math.ceil(number * percentageToTake);

  return take;
};

export const takeRandomElementFrom = array => {
  const randomIdx = Math.floor(Math.random() * array.length);
  return array[randomIdx];
};

export const takeRandomSubsetFrom = array => {
  const sizeOfSubset = takeRandomNumberFrom(0, array.length);
  return Array.from({ length: sizeOfSubset }).map(() =>
    takeRandomElementFrom(array)
  );
};

export const getSumFn = key => (acc, obj) => obj[key] + acc;

export const getFilter = (matchVal, key) => obj => obj[key] === matchVal;

const parseValue = (object, key) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);
    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

export const getDataSorter = (sortKey, desc) => (a, b) => {
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

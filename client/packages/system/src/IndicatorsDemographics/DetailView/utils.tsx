import { NumUtils } from '@common/utils';
import { DemographicIndicatorFragment } from '../api/operations.generated';
import { HeaderValue, Row } from './IndicatorsDemographics';
import { GENERAL_POPULATION_ID } from '../api';

export const toIndicatorFragment = (
  row: Row,
  indexPopulation?: number
): DemographicIndicatorFragment => {
  return {
    __typename: 'DemographicIndicatorNode',
    id: row.id,
    name: row.name,
    baseYear: row.baseYear,
    basePopulation: indexPopulation ?? row.basePopulation,
    populationPercentage: row.percentage ?? 0,
    year1Projection: row[1],
    year2Projection: row[2],
    year3Projection: row[3],
    year4Projection: row[4],
    year5Projection: row[5],
  };
};

export const recursiveCalculate = (
  key: number,
  updatedHeader: { [x: string]: HeaderValue },
  row: Row,
  indexValue: number | undefined
): number => {
  const headerValue = updatedHeader[key];
  if (key > 0) {
    return headerValue
      ? (NumUtils.round(
          recursiveCalculate(key - 1, updatedHeader, row, indexValue) *
            ((headerValue.value ?? 0) / 100 + 1)
        ) as number)
      : 0;
  } else {
    return NumUtils.round(
      (indexValue ?? row.basePopulation ?? 0) * ((row?.percentage ?? 0) / 100)
    );
  }
};

export const calculateAcrossRow = (
  row: Row,
  updatedHeader: { [x: string]: HeaderValue },
  indexValue?: number | undefined
) => {
  let updatedRow = row;

  // only update numeric entries
  const rowNumberKeys = Object.keys(row).filter(
    key =>
      !isNaN(parseFloat(key)) &&
      !(row.id === GENERAL_POPULATION_ID && parseFloat(key) == 0)
  );
  Object.values(rowNumberKeys).forEach(key => {
    const columnKey = parseInt(key);
    updatedRow = {
      ...updatedRow,
      [columnKey]: recursiveCalculate(
        columnKey,
        updatedHeader,
        row,
        indexValue
      ),
    };
  });
  // for case where general population is changed, set this value in row
  if (row.id === GENERAL_POPULATION_ID) {
    updatedRow = { ...updatedRow, [0]: indexValue ?? 0 };
  }
  updatedRow = { ...updatedRow, basePopulation: indexValue ?? 0 };
  return updatedRow;
};

import { NumUtils } from '@common/utils';
import {
  DemographicIndicatorFragment,
  DemographicProjectionFragment,
} from '../api/operations.generated';

import { GENERAL_POPULATION_ID } from '../api';
import { HeaderData, HeaderValue, Row } from '../types';

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
    year1Projection: row[0],
    year2Projection: row[1],
    year3Projection: row[2],
    year4Projection: row[3],
    year5Projection: row[4],
  };
};

export const recursiveCalculate = (
  key: number,
  updatedHeader: HeaderData,
  row: Row,
  indexValue: number | undefined
): number => {
  const headerValue = updatedHeader[
    String(key) as keyof HeaderData
  ] as HeaderValue;
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
  updatedHeader: HeaderData,
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

export const getDefaultHeaderData = (baseYear: number): HeaderData => ({
  baseYear,
  id: '',
  '1': { id: '1', value: 1 },
  '2': { id: '2', value: 1 },
  '3': { id: '3', value: 1 },
  '4': { id: '4', value: 1 },
  '5': { id: '5', value: 1 },
});

export const mapHeaderData = (
  projection: DemographicProjectionFragment
): HeaderData => ({
  id: projection.id,
  baseYear: projection.baseYear,
  '1': { id: '1', value: projection.year1 },
  '2': { id: '2', value: projection.year2 },
  '3': { id: '3', value: projection.year3 },
  '4': { id: '4', value: projection.year4 },
  '5': { id: '5', value: projection.year5 },
});

export const mapProjection = (
  headerData: HeaderData,
  generalPopulationRow?: Row
) => ({
  baseYear: generalPopulationRow?.baseYear ?? 2024,
  id: headerData.id,
  year1: headerData[1].value,
  year2: headerData[2].value,
  year3: headerData[3].value,
  year4: headerData[4].value,
  year5: headerData[5].value,
});

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
    year1Projection: row[1],
    year2Projection: row[2],
    year3Projection: row[3],
    year4Projection: row[4],
    year5Projection: row[5],
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
  updatedHeader?: HeaderData,
  indexValue?: number | undefined
) => {
  if (!updatedHeader) return row;
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

export const toRow = (row: {
  __typename?: 'DemographicIndicatorNode';
  id: string;
  name: string;
  baseYear?: number;
  basePopulation?: number;
  year1Projection?: number;
  year2Projection?: number;
  year3Projection?: number;
  year4Projection?: number;
  year5Projection?: number;
  populationPercentage?: number;
}): Row => ({
  isNew: false,
  id: row.id,
  percentage: row.populationPercentage ?? 0,
  name: row.name,
  baseYear: row.baseYear ?? 0,
  basePopulation: row.basePopulation ?? 0,
  0: row.year1Projection ?? 0,
  1: row.year2Projection ?? 0,
  2: row.year3Projection ?? 0,
  3: row.year4Projection ?? 0,
  4: row.year5Projection ?? 0,
  5: row.year5Projection ?? 0,
});

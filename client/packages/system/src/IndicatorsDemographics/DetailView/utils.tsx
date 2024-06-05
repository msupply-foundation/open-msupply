import { NumUtils } from '@common/utils';
import { DemographicIndicatorFragment } from '../api/operations.generated';
import { HeaderValue, Row } from './IndicatorsDemographics';

export const toIndicatorFragment = (row: Row): DemographicIndicatorFragment => {
  return {
    __typename: 'DemographicIndicatorNode',
    id: row.id,
    name: row.name,
    baseYear: row.baseYear,
    basePopulation: row.basePopulation,
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

import { RequisitionLineRow } from '@common/generated/RequisitionLineRow';
import { sqlQuery } from '@common/utils';

export const getStoreProperties = (storeId: string) => {
  const result = sqlQuery(
    ['properties'],
    `
    SELECT properties FROM name
      WHERE id = (
        SELECT name_id FROM name_link
        WHERE id = (
          SELECT name_link_id FROM store
          WHERE id = '${storeId}'
          )
      )
  `
  );
  if (result.length === 0) return {};

  const properties = result[0]?.properties;
  if (!properties) return {};
  return JSON.parse(properties);
};

export const getVaccineCourseRowsByItem = (line: RequisitionLineRow) =>
  sqlQuery(
    [
      'id',
      'vaccine_course_name',
      'coverage_rate',
      'wastage_rate',
      'doses',
      'demographic_name',
      'population_percentage',
    ],
    `
    SELECT id, vaccine_course_name, coverage_rate,
      wastage_rate, demographic_name, population_percentage,
      COUNT(DISTINCT(dose_label)) AS doses
    FROM vaccination_course
    WHERE item_link_id = '${line.item_link_id}'
    AND demographic_id IS NOT NULL
    GROUP BY id, vaccine_course_name, coverage_rate,
      wastage_rate, demographic_name, population_percentage
      `
  );

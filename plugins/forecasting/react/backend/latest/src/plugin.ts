// To upload to server (after adding submodule to openmsupply repo locally)
// cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i '../client/packages/plugins/{plugin name}/backend' -u 'http://localhost:8000' --username 'test' --password 'pass'

import { uuidv7 } from 'uuidv7';
import { BackendPlugins } from '@common/types';
import { name as pluginCode } from '../package.json';
import { getStoreProperties, getVaccineCourseRowsByItem } from './sqlQueries';
import { RequisitionLineRow } from '@common/generated/RequisitionLineRow';

const plugins: BackendPlugins = {
  transform_request_requisition_lines: ({ context, lines, requisition }) => {
    log('Running transform_request_requisition_lines plugin');
    switch (context) {
      case 'InsertProgramRequestRequisition':
      case 'AddFromMasterList':
      case 'UpdateRequestRequisition':
      case 'InsertRequestRequisitionLine':
        // Can do for different actions or do exhaustive match here
        break;
      default:
        // Can also try/catch ignore this if you only want compilation to fail but plugin to still work when new variant is added
        assertUnreachable(context);
    }

    // log('requisition' + JSON.stringify(requisition, null, 2));

    const pluginData = get_plugin_data({
      store_id: { equal_to: requisition.store_id },
      plugin_code: { equal_to: pluginCode },
      data_identifier: { equal_to: 'FORECAST_QUANTITY_INFO' },
      related_record_id: { equal_any: lines.map(({ id }) => id) },
    });

    const storeProperties = getStoreProperties(requisition.store_id);

    const forecastedQuantities: Record<
      string,
      { forecastTotal: number | null; vaccineCourses: ForecastQuantityData[] }
    > = {};
    for (const line of lines) {
      const vaccineCourses = calculateForecastQuantities(storeProperties, line);
      const forecastTotal =
        vaccineCourses.length > 0
          ? vaccineCourses.reduce((acc, curr) => acc + curr.forecastQuantity, 0)
          : null;
      forecastedQuantities[line.id] = { forecastTotal, vaccineCourses };
    }

    return {
      plugin_data: lines.map(line => ({
        id:
          pluginData.find(
            ({ related_record_id }) => related_record_id === line.id
          )?.id || uuidv7(),
        store_id: requisition.store_id,
        plugin_code: pluginCode,
        related_record_id: line.id,
        data_identifier: 'FORECAST_QUANTITY_INFO',
        data: JSON.stringify(forecastedQuantities[line.id]),
      })),

      transformed_lines: lines.map(line => {
        const forecastQuantity = forecastedQuantities[line.id].forecastTotal;

        const suggested_quantity =
          forecastQuantity !== null
            ? Math.max(forecastQuantity - line.available_stock_on_hand, 0)
            : line.suggested_quantity;

        return { ...line, suggested_quantity };
      }),
    };
  },
};

interface ForecastQuantityData {
  courseTitle: string;
  targetPopulation: number;
  lossFactor: number;
  annualTargetStock: number;
  bufferStockMultiplier: number;
  supplyPeriod: number;
  forecastQuantity: number;
}

const calculateForecastQuantities = (
  storeProperties: Record<string, any>,
  line: RequisitionLineRow
) => {
  const {
    buffer_stock,
    supply_interval: supplyPeriod,
    population_served,
  } = storeProperties;

  if (!buffer_stock || !supplyPeriod || !population_served) {
    return [];
  }

  const vaccineCourses = getVaccineCourseRowsByItem(line);

  // log('vaccineCourses: ' + JSON.stringify(vaccineCourses));

  if (vaccineCourses.length === 0) return [];

  const forecastValues = [];

  for (const course of vaccineCourses) {
    const {
      coverage_rate: coverageRate,
      vaccine_course_name,
      demographic_name,
      doses,
      wastage_rate,
      population_percentage,
    } = course;

    const targetPopulation = population_served * (population_percentage / 100);

    const lossFactor = 1 / (1 - wastage_rate / 100);

    const annualTargetStock =
      targetPopulation * doses * (coverageRate / 100) * lossFactor;

    const bufferStockMultiplier = buffer_stock / supplyPeriod + 1;

    // TO_DO: Need to convert units to doses if applicable
    const forecastQuantity =
      (annualTargetStock / 12) * supplyPeriod * bufferStockMultiplier;

    const courseTitle = `${vaccine_course_name} (${demographic_name})`;

    forecastValues.push({
      courseTitle,
      targetPopulation,
      lossFactor,
      annualTargetStock,
      bufferStockMultiplier,
      supplyPeriod,
      forecastQuantity,
    });
  }

  return forecastValues;
};

function assertUnreachable(_: never): never {
  // TODO don't actually want to error, just want to handle all variants and do compilation error in tests
  throw new Error("Didn't expect to get here");
}

export { plugins };

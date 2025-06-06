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
      {
        forecastTotalDoses: number | null;
        forecastTotalUnits: number | null;
        vaccineCourses: ForecastQuantityData[];
      }
    > = {};
    for (const line of lines) {
      const vaccineCourses = calculateForecastQuantities(storeProperties, line);
      const forecastTotalDoses =
        vaccineCourses.length > 0
          ? vaccineCourses.reduce((acc, curr) => acc + curr.forecastDoses, 0)
          : null;
      const forecastTotalUnits =
        vaccineCourses.length > 0
          ? vaccineCourses.reduce((acc, curr) => acc + curr.forecastUnits, 0)
          : null;
      forecastedQuantities[line.id] = {
        forecastTotalDoses,
        forecastTotalUnits,
        vaccineCourses,
      };
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
        const forecastUnits = forecastedQuantities[line.id].forecastTotalDoses;

        const suggested_quantity =
          forecastUnits !== null
            ? Math.max(forecastUnits - line.available_stock_on_hand, 0)
            : line.suggested_quantity;

        return { ...line, suggested_quantity };
      }),
    };
  },
};

interface ForecastQuantityData {
  courseTitle: string;
  numberOfDoses: number;
  coverageRate: number;
  targetPopulation: number;
  lossFactor: number;
  annualTargetDoses: number;
  bufferStockMonths: number;
  supplyPeriodMonths: number;
  dosesPerUnit: number;
  forecastDoses: number;
  forecastUnits: number;
}

const calculateForecastQuantities = (
  storeProperties: Record<string, any>,
  line: RequisitionLineRow
) => {
  const {
    buffer_stock: bufferStockMonths = 0,
    supply_interval: supplyPeriodMonths,
    population_served,
  } = storeProperties;

  if (!supplyPeriodMonths || !population_served) {
    return [];
  }

  const vaccineCourses = getVaccineCourseRowsByItem(line);

  // log('vaccineCourses: ' + JSON.stringify(vaccineCourses));

  if (vaccineCourses.length === 0) return [];

  const forecastValues: ForecastQuantityData[] = [];

  for (const course of vaccineCourses) {
    const {
      coverage_rate: coverageRate,
      vaccine_course_name,
      demographic_name,
      doses: numberOfDoses,
      wastage_rate,
      population_percentage,
      vaccine_doses,
    } = course;

    const targetPopulation = population_served * (population_percentage / 100);

    const lossFactor = 1 / (1 - wastage_rate / 100);

    // If vaccine_doses = 0, we should use 1
    const dosesPerUnit = vaccine_doses || 1;

    const annualTargetDoses =
      targetPopulation * numberOfDoses * (coverageRate / 100) * lossFactor;

    // log('buffer_stock: ' + bufferStockMonths);
    // log('supplyPeriod: ' + supplyPeriodMonths);
    // log('targetPopulation: ' + targetPopulation);
    // log('doses: ' + doses);
    // log('coverage_rate: ' + coverage_rate);
    // log('lossFactor: ' + lossFactor);

    const forecastDoses =
      (annualTargetDoses / 12) * (supplyPeriodMonths + bufferStockMonths);
    const forecastUnits = forecastDoses / dosesPerUnit;

    // log('forecastDoses: ' + forecastDoses);
    // log('forecastUnits: ' + forecastUnits);

    const courseTitle = `${vaccine_course_name} (${demographic_name})`;

    forecastValues.push({
      courseTitle,
      numberOfDoses,
      coverageRate,
      targetPopulation,
      lossFactor,
      annualTargetDoses,
      bufferStockMonths,
      supplyPeriodMonths,
      dosesPerUnit,
      forecastDoses,
      forecastUnits,
    });
  }

  return forecastValues;
};

function assertUnreachable(_: never): never {
  // TODO don't actually want to error, just want to handle all variants and do compilation error in tests
  throw new Error("Didn't expect to get here");
}

export { plugins };

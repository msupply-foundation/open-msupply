// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { AverageMonthlyConsumptionInput } from "./AverageMonthlyConsumptionInput";
import type { AverageMonthlyConsumptionItem } from "./AverageMonthlyConsumptionItem";
import type { Function } from "./Function";
import type { PluginDataFilter } from "./PluginDataFilter";
import type { PluginDataRow } from "./PluginDataRow";
import type { StorePreferenceRow } from "./StorePreferenceRow";
import type { TransformRequestRequisitionLineInput } from "./TransformRequestRequisitionLineInput";
import type { TransformRequestRequisitionLineOutput } from "./TransformRequestRequisitionLineOutput";

export type PluginTypes = { average_monthly_consumption: Function<AverageMonthlyConsumptionInput, { [key in string]?: AverageMonthlyConsumptionItem }>, transform_request_requisition_lines: Function<TransformRequestRequisitionLineInput, TransformRequestRequisitionLineOutput>, get_store_preferences: StorePreferenceRow, get_plugin_data: Function<PluginDataFilter, Array<PluginDataRow>>, };

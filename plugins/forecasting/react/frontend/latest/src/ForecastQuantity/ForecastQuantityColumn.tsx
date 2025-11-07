import React, { useEffect } from "react";
import {
  ArrayElement,
  BasicCellLayout,
  ColumnDef,
  create,
  PluginDataStore,
  Plugins,
  QueryClientProviderProxy,
  UNDEFINED_STRING_VALUE,
} from "@openmsupply-client/common";
import { RequestLineFragment } from "@openmsupply-client/system";
import { usePluginData } from "../../../../../api";

const useColumnStore = create<PluginDataStore<RequestLineFragment, string>>(
  (set, get) => ({
    data: [],
    set: (data) => set((state) => ({ ...state, data })),
    getById: (row) =>
      get().data.find(({ relatedRecordId }) => relatedRecordId == row.id),
  })
);

type ForecastQuantityColumn = NonNullable<
  ArrayElement<Plugins["requestRequisitionLine"]>
>;

export const StateLoader: ArrayElement<
  ForecastQuantityColumn["tableStateLoader"]
> = (props) => {
  const { set } = useColumnStore();

  const {
    query: { data },
  } = usePluginData({
    pluginCode: "forecasting_plugins",
    filter: {
      dataIdentifier: { equalTo: "FORECAST_QUANTITY_INFO" },
      relatedRecordId: { equalAny: props.requestLines.map(({ id }) => id) },
    },
    // By using the line IDs as the keys, it will cause the query to re-fetch
    // whenever a line is added/removed
    queryKey: props.requestLines.map((line) => line.id),
  });

  useEffect(() => {
    if (!!data) {
      set(data);
    }
  }, [data]);

  return <></>;
};

const ForecastColumn = ({ row: rowData }: { row: RequestLineFragment }) => {
  const { getById } = useColumnStore();

  const parsed = JSON.parse(getById(rowData)?.data || "{}");
  const value = parsed?.forecastTotalUnits
    ? String(Math.ceil(parsed?.forecastTotalUnits))
    : UNDEFINED_STRING_VALUE;

  return <BasicCellLayout>{value}</BasicCellLayout>;
};

export const ForecastQuantityColumn: ColumnDef<RequestLineFragment> = {
  Cell: ({ row }) => (
    <QueryClientProviderProxy>
      <ForecastColumn row={row.original} />
    </QueryClientProviderProxy>
  ),
  id: "forecast-quantity",
  header: "Niveau de stock cible en unités (prévision démographique)", // plugin.forecasting.forecast-amount (can't translate in plugins yet...)
  description:
    "Le niveau de stock cible calculé selon les prévisions démographiques", // 'plugin.forecasting.forecast-amount-description',
  enableSorting: false,
  columnIndex: 10,
  defaultHideOnMobile: true,
};

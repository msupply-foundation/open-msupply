# Open mSupply Forecasting plugins

Contains a suite of "forecasting" plugins for Open mSupply:

## Back-end

- `transform_request_requisition_lines`:
  - On insert of new requisition_lines, it calculates a "Forecast quantity" for each line. The formula/logic for calculating this is detailed [in this issue](https://github.com/msupply-foundation/open-msupply/issues/7371).
  - this new value is s saved to "plugin_data" so it can be fetched as a new "column" by the front-end plugin
  - the existing field "suggested_quantity" is also modified -- the value stored in it is the new "forecast_quantity" minus the current stock on hand. This  modified value will be displayed by the normal detail view in the front-end.

## Front-end

- `ForecastQuantity`: inserts a new column on the Internal Orders "Detail" view: "Forecast amount", which is displayed to the right of "Suggested Quantity" and displayed the forecast value calculated above (and fetched from the "plugin_data" associated with a requisition_line record).

## TO-DO:

Would like to combine this repo in a common "open msupply public plugins" repo, but in order to do that we need to be able to store multiple plugin structures within one repo, which doesn't currently work with the plugin folder structure.
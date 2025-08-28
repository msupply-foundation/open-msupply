# Open mSupply Forecasting plugins

Contains a suite of "forecasting" plugins for **Open mSupply**:

## Back-end

- `transform_request_requisition_lines`:
  - On insert of new requisition_lines, it calculates a "Forecast quantity" for each line. The formula/logic for calculating this is detailed [below](#forecasting-calculation).
  - this new value is saved to "plugin_data" so it can be fetched as a new "column" by the front-end plugin
  - the existing field "suggested_quantity" is also modified -- the value stored in it is the new "forecast_quantity" minus the current stock on hand. This  modified value will be displayed by the normal detail view in the front-end.
  - The displayed values will be in *units*, not *doses* for consistency with existing columns, although the dose quantity is returned with the plugin data, so it can be modified to display doses in the future.

## Front-end

- `ForecastQuantity`: consists of two components:
  - `ForecastQuantityColumn`: inserts a new column on an **Internal Order** -- "Forecast amount", which is displayed to the right of "Suggested Quantity" and displays the forecast value calculated above (and fetched from the "plugin_data" associated with a requisition_line record).
  - `ForecastQuantityField`: Displays this same value on the "Detail" modal for each item.

## Forecasting calculation

For a requisition line item to be able to calculate a forecast quantity, several things must be configured:

- it must be a **vaccine item**
- it must be part of a **vaccine course**
- the vaccine course must be associated with a **demographic**
- the following store properties must be defined:
  - Stock Safety Buffer (months)
  - Supply Interval (Months between deliveries)
  - Population Served  

*You can quickly enable these properties for your store by going to: Settings -> Configuration -> Initialise store properties for population based forecasting*

If *any* of these values are not defined, the forecast totals will be returned as `null`.

From this data, we calculate (or retrieve) the following intermediate values for *each* vaccine course that the item is a part of:

- **Target Population** `= Population served X Population percentage`
  - `Population served` comes from store properties
  - `Population percentage` comes from the Demographic associated with the vaccine course; in other words: the proportion of the total population this vaccine course is targeting.
- **Loss Factor** `= 1 / (1 - Wastage rate)`
  - `Wastage rate` comes from the vaccine course, i.e. what proportion of the stock do we expect to have to throw out?. The `Loss Factor` is basically an "inverse" of the `Wastage rate`, i.e. what do I need to multiply my required stock by to allow for wastage?
- **Coverage Rate**: from vaccine course, i.e. what proportion of the target population do we expect to actually vaccinate?
- **Number of Doses** in vaccine course schedule
- **Number of Months** `= Stock Safety Buffer + Supply Interval`
  - How many months to forecast for, i.e. the number of months for which we want to actually supply, plus some number of "buffer" months
- **Doses per Unit**
  - How many vaccine doses are there for each base unit used in Open mSupply. For example, OMS records stock in "Vials", and there could be 50 doses per vial.

From these values we can calculate:

**Annual target stock** `= Target Population X Number of Doses X Coverage Rate X Loss Factor` 

This value is in individual vaccine **doses**.

And then, finally, we can calculate the required "target" doses:

**Forecast Quantity** (in doses) `= Annual target stock / 12 * Number of Months`

And in units:

**Forecast Unit Quantity** `= Forecast Quantity / Doses per Unit`

As mentioned earlier, these quantities are for *each vaccine course*, so we need to add them all up to get the total forecast amounts for each item.

The back-end plugin returns an object containing the final totals, plus breakdowns of each course, for example:

```json
{
  "forecastTotalDoses": 62500,
  "forecastTotalUnits": 1250,
  "vaccineCourses": [
    {
      "courseTitle": "Covid vaccination (Children)",
      "numberOfDoses": 4,
      "coverageRate": 80,
      "targetPopulation": 25000,
      "lossFactor": 2,
      "annualTargetDoses": 160000,
      "bufferStockMonths": 0,
      "supplyPeriodMonths": 3,
      "dosesPerUnit": 50,
      "forecastDoses": 40000,
      "forecastUnits": 800
    },
    {
      "courseTitle": "Measles program (Adults)",
      "numberOfDoses": 2,
      "coverageRate": 90,
      "targetPopulation": 40000,
      "lossFactor": 1.25,
      "annualTargetDoses": 90000,
      "bufferStockMonths": 0,
      "supplyPeriodMonths": 3,
      "dosesPerUnit": 50,
      "forecastDoses": 22500,
      "forecastUnits": 450
    }
  ]
}
```

The value `forecastTotalUnits` is the number that will show up in the Requisition table and detail view. The other values are for if we want to (in future) display the individual components and the calculation somewhere in the UI.

## TO-DO:

Would like to combine this repo in a common "open msupply public plugins" repo, but in order to do that we need to be able to store multiple plugin structures within one repo, which doesn't currently work with the plugin folder structure.

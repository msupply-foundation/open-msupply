# Population-Based Forecasting

## Implementation

### Back-end

The forecasting logic is implemented in the core requisition system:

- **Core Integration**: Forecasting calculations are performed during requisition line generation in `generate_population_forecast.rs`
- **Data**: Forecast data is stored directly in `requisition_line` table columns:
  - `forecast_total_units`: Total forecasted units needed
  - `forecast_total_doses`: Total forecasted doses needed
  - `vaccine_courses`: JSON data containing detailed course breakdown
- **Preference Control**: Forecasting display can be controlled via the `DisplayPopulationBasedForecasting` preference

## Configuration Requirements

For a requisition line item to calculate a forecast quantity, several prerequisites must be met:

- The item must be a **vaccine item**
- The item must be associated with a **vaccine course**
- The vaccine course must be linked to a **demographic profile**
- The following store properties must be configured:
  - **Stock Safety Buffer** (months)
  - **Supply Interval** (months between deliveries)
  - **Population Served**

> **Quick Setup**: You can quickly configure these properties by navigating to: **Settings → Configuration → Initialize store properties for population-based forecasting**

If any of these values are undefined, the forecast calculations will return `null` values.

## Calculation Methodology

The forecasting engine performs calculations for each vaccine course associated with an item, then aggregates the results.

### Forecasting Calculations

For each vaccine course, the system calculates the following values:

- **Target Population** = `Population Served × Population Percentage`
  - `Population Served`: From store properties
  - `Population Percentage`: From the demographic profile (proportion of total population targeted by this course)

- **Loss Factor** = `1 ÷ (1 - Wastage Rate)`
  - `Wastage Rate`: From vaccine course configuration (expected proportion of
    stock to be discarded), with store level overrides taking priority. Store wastage rates are managed on the central server and synced out to remote sites. They are configured per vaccine course per store.

- **Coverage Rate**: From vaccine course (expected proportion of target population to be vaccinated)

- **Number of Doses**: From vaccine course schedule

- **Forecast Period** = `Stock Safety Buffer + Supply Interval` (in months)

- **Doses per Unit**: Number of vaccine doses per inventory unit (e.g., 50 doses per vial)

### Final Calculations

**Annual Target Doses** = `Target Population × Number of Doses × Coverage Rate × Loss Factor`

**Forecast Doses** = `Annual Target Doses ÷ 12 × Forecast Period`

**Forecast Units** = `Forecast Doses ÷ Doses per Unit`

The system sums these calculations across all applicable vaccine courses to determine the total forecast quantities for each item.

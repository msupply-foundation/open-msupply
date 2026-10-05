# Population-Based Forecasting

Population is one of a request requisition line's three **forecast methods** — AMC, Population, and Ancillary ratio. Every method yields the line's **monthly demand**; turning that into a suggested quantity (target months, reorder threshold, stock on hand) works the same for every method. The behaviour is specced in [`frontend/spec/internal-orders/rules.md` › Forecasting](../frontend/spec/internal-orders/rules.md#forecasting), and the storage and sync design in [`decisions/2026-10-05_requisition_line_forecast_methods.md`](../decisions/2026-10-05_requisition_line_forecast_methods.md).

## Implementation

### Back-end

- **Core integration**: the forecast is computed when a request line is generated, in `service/src/requisition/request_requisition/forecast/` (`population.rs` holds the Population arithmetic). A line takes the first available method of Ancillary ratio → Population → AMC, and the user can change it later.
- **Data**: the forecast is stored on the `requisition_line` row:
  - `forecast_method`: `amc` / `population` / `ancillary_ratio`
  - `forecast_monthly_consumption`: the method's monthly demand, in units
  - `forecast_data`: the method's breakdown as JSON (for Population, one entry per course-and-demographic)
- **Preference**: `DisplayPopulationBasedForecasting` decides whether the Population method is available. A line already using it keeps it when the preference is turned off.
- **Older sites**: sites before 3.04 store supply-period totals (`forecast_total_units`, `forecast_total_doses`, `vaccine_courses`) instead. The sync translators convert between the two shapes (`repository/src/db_diesel/requisition_line/forecast_data.rs`).

## Configuration Requirements

The Population method is available for a line when:

- the `DisplayPopulationBasedForecasting` preference is on,
- the store's facility record has a **Population Served**, and
- at least one **vaccine course** covers the item.

A course without a demographic targets the whole population. The store's supply interval and safety buffer are not inputs.

> **Quick Setup**: You can quickly configure the store properties by navigating to: **Settings → Configuration → Initialize store properties for population-based forecasting**

## Calculation Methodology

The engine computes one contribution per covering course-and-demographic, then sums their monthly units into the line's monthly demand.

### Per course

- **Target Population** = `Population Served × Population Percentage`
  - `Population Served`: from the store's properties
  - `Population Percentage`: from the course's demographic (100% with none)

- **Loss Factor** = `1 ÷ (1 - Wastage Rate)`
  - `Wastage Rate`: from the vaccine course, with store-level overrides taking priority. Store wastage rates are managed on the central server and synced out to remote sites, per vaccine course per store.

- **Coverage Rate**: from the vaccine course (the expected proportion of the target population to be vaccinated), also overridable per store.

- **Number of Doses**: the number of distinct dose labels in the course's schedule.

- **Doses per Unit**: vaccine doses per inventory unit (e.g. 50 doses per vial); 1 for an item with none.

### Calculations

**Annual Target Doses** = `Target Population × Number of Doses × Coverage Rate × Loss Factor`

**Monthly Doses** = `Annual Target Doses ÷ 12`

**Monthly Units** = `Monthly Doses ÷ Doses per Unit`

The line's monthly demand is the sum of its courses' monthly units. Its target stock is `monthly demand × the requisition's target months`, and its suggested quantity tops stock up to that target, as for every other method.

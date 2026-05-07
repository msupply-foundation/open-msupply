use repository::{ForecastMethod, ForecastSnapshot};

/// Inputs the stock-management dispatcher needs alongside the forecast snapshot.
/// All values come from the *current* requisition / line state, not from the
/// snapshot — stock-management settings can change after a forecast is taken,
/// and we'd rather drift than freeze them inside the forecast.
pub struct StockManagementInputs {
    pub available_stock_on_hand: f64,
    pub min_months_of_stock: f64,
    pub max_months_of_stock: f64,
}

/// Convert a forecast (a monthly usage rate) into a suggested order quantity.
///
/// Behaviour is dispatched on the *forecasting method*: this preserves the
/// pre-existing behaviour while we have a single stock-management strategy.
/// Once we add additional stock-management methods (parallel to the
/// forecasting-method enum), this dispatch should move off `ForecastMethod`
/// and onto a dedicated stock-management enum.
pub fn suggested_quantity(
    method: &ForecastMethod,
    snapshot: Option<&ForecastSnapshot>,
    inputs: StockManagementInputs,
) -> f64 {
    match method {
        // Classic months-of-stock top-up using the forecast rate. Includes the
        // "skip if current months > min_months_of_stock" gate that's been on
        // the AMC path forever.
        ForecastMethod::AverageMonthlyConsumption => {
            let monthly_usage = snapshot
                .map(ForecastSnapshot::forecast_monthly_usage)
                .unwrap_or(0.0);
            months_of_stock_topup(monthly_usage, inputs)
        }
        ForecastMethod::Population => population_deduct_stock(snapshot, inputs),
        // For now Ancillary / Plugin reuse the simple "rate × max_months − SOH"
        // formula. This matches today's Ancillary behaviour (which was always
        // forecast_units − SOH where forecast_units = rate × max_months).
        ForecastMethod::AncillaryRatio | ForecastMethod::Plugin(_) => {
            let monthly_usage = snapshot
                .map(ForecastSnapshot::forecast_monthly_usage)
                .unwrap_or(0.0);
            deduct_stock_on_hand(monthly_usage, inputs.max_months_of_stock, inputs)
        }
    }
}

/// AMC-style top-up: brings projected months-of-stock up to `max_months_of_stock`,
/// but only if it currently sits below `min_months_of_stock` (or equal to
/// `max` when no min is set).
pub fn months_of_stock_topup(monthly_usage: f64, inputs: StockManagementInputs) -> f64 {
    let StockManagementInputs {
        available_stock_on_hand,
        min_months_of_stock,
        max_months_of_stock,
    } = inputs;

    if monthly_usage == 0.0 {
        return 0.0;
    }
    let months_of_stock = available_stock_on_hand / monthly_usage;

    let default_min_months_of_stock = if min_months_of_stock == 0.0 {
        max_months_of_stock
    } else {
        min_months_of_stock
    };

    if max_months_of_stock == 0.0 || (months_of_stock > default_min_months_of_stock) {
        return 0.0;
    }

    // Suggested quantity should always round up - we order in units and otherwise we could under-order by a fraction
    ((max_months_of_stock - months_of_stock) * monthly_usage).ceil()
}

/// Population path: each course's `forecast_monthly_usage × supply_period_months`
/// reconstructs that course's period demand; sum across courses, deduct SOH,
/// ceil. `supply_period_months` is sourced from the snapshot's per-course data
/// — that's a structural property of the course config carried forward, not a
/// stock-management setting (which lives on the requisition).
fn population_deduct_stock(
    snapshot: Option<&ForecastSnapshot>,
    inputs: StockManagementInputs,
) -> f64 {
    let total_units = match snapshot {
        Some(ForecastSnapshot::Population(p)) => p
            .vaccine_courses
            .iter()
            .map(|c| c.forecast_monthly_usage * (c.supply_period_months + c.buffer_stock_months))
            .sum::<f64>(),
        // Fall back to the simple horizon if the snapshot somehow isn't a
        // Population shape (e.g. method tag drifted from snapshot type).
        _ => {
            let monthly_usage = snapshot
                .map(ForecastSnapshot::forecast_monthly_usage)
                .unwrap_or(0.0);
            return deduct_stock_on_hand(monthly_usage, inputs.max_months_of_stock, inputs);
        }
    };

    (total_units - inputs.available_stock_on_hand).max(0.0).ceil()
}

fn deduct_stock_on_hand(
    monthly_usage: f64,
    horizon_months: f64,
    inputs: StockManagementInputs,
) -> f64 {
    let total = monthly_usage * horizon_months;
    (total - inputs.available_stock_on_hand).max(0.0).ceil()
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        AmcSnapshot, AmcSnapshotBreakdown, AncillaryRatioSnapshot, DefaultAmcSnapshotBreakdown,
        PopulationCourseData, PopulationSnapshot,
    };

    fn amc(forecast_monthly_usage: f64) -> AmcSnapshot {
        AmcSnapshot {
            forecast_monthly_usage,
            breakdown: AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
                lookback_months: 3.0,
                total_consumption: forecast_monthly_usage * 3.0,
                number_of_days: 91.0,
                days_out_of_stock: None,
                dos_adjustment_factor: 1.0,
            }),
        }
    }

    #[test]
    fn amc_topup_matches_legacy_formula() {
        // 10 monthly usage, 5 SOH, max=3, min=0 → max-active.
        // months_of_stock = 0.5; (3 - 0.5) * 10 = 25
        let snap = ForecastSnapshot::Amc(amc(10.0));
        let q = suggested_quantity(
            &ForecastMethod::AverageMonthlyConsumption,
            Some(&snap),
            StockManagementInputs {
                available_stock_on_hand: 5.0,
                min_months_of_stock: 0.0,
                max_months_of_stock: 3.0,
            },
        );
        assert_eq!(q, 25.0);
    }

    #[test]
    fn amc_topup_skips_if_above_min() {
        // 10 monthly usage, 50 SOH, max=3, min=2. months_of_stock = 5 > 2 → 0.
        let snap = ForecastSnapshot::Amc(amc(10.0));
        let q = suggested_quantity(
            &ForecastMethod::AverageMonthlyConsumption,
            Some(&snap),
            StockManagementInputs {
                available_stock_on_hand: 50.0,
                min_months_of_stock: 2.0,
                max_months_of_stock: 3.0,
            },
        );
        assert_eq!(q, 0.0);
    }

    #[test]
    fn ancillary_uses_max_months_horizon() {
        // monthly_usage = 1, max = 6, SOH = 2 → 6 - 2 = 4
        let snap = ForecastSnapshot::AncillaryRatio(AncillaryRatioSnapshot {
            forecast_monthly_usage: 1.0,
            contributions: vec![],
            fallback: None,
        });
        let q = suggested_quantity(
            &ForecastMethod::AncillaryRatio,
            Some(&snap),
            StockManagementInputs {
                available_stock_on_hand: 2.0,
                min_months_of_stock: 0.0,
                max_months_of_stock: 6.0,
            },
        );
        assert_eq!(q, 4.0);
    }

    #[test]
    fn population_uses_per_course_supply_period() {
        // Course A: rate=100, supply=3, buffer=2, SOH=0 → 100*5 = 500
        // Course B: rate=10,  supply=6, buffer=0      → 10*6  = 60
        // SOH 100 → suggested = 500 + 60 - 100 = 460
        let snap = ForecastSnapshot::Population(PopulationSnapshot {
            forecast_monthly_usage: 110.0,
            forecast_total_doses: 0.0,
            vaccine_courses: vec![
                PopulationCourseData {
                    course_title: "A".into(),
                    number_of_doses: 0,
                    coverage_rate: 0.0,
                    target_population: 0.0,
                    wastage_rate: 0.0,
                    loss_factor: 0.0,
                    annual_target_doses: 0.0,
                    buffer_stock_months: 2.0,
                    supply_period_months: 3.0,
                    doses_per_unit: 1,
                    forecast_doses: 0.0,
                    forecast_units: 500.0,
                    forecast_monthly_usage: 100.0,
                },
                PopulationCourseData {
                    course_title: "B".into(),
                    number_of_doses: 0,
                    coverage_rate: 0.0,
                    target_population: 0.0,
                    wastage_rate: 0.0,
                    loss_factor: 0.0,
                    annual_target_doses: 0.0,
                    buffer_stock_months: 0.0,
                    supply_period_months: 6.0,
                    doses_per_unit: 1,
                    forecast_doses: 0.0,
                    forecast_units: 60.0,
                    forecast_monthly_usage: 10.0,
                },
            ],
        });
        let q = suggested_quantity(
            &ForecastMethod::Population,
            Some(&snap),
            StockManagementInputs {
                available_stock_on_hand: 100.0,
                min_months_of_stock: 0.0,
                max_months_of_stock: 6.0,
            },
        );
        assert_eq!(q, 460.0);
    }
}

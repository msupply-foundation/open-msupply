//! Forecasting: where a request line's monthly demand comes from.
//!
//! A forecast method yields a line's **monthly demand** (`forecast_monthly_consumption`)
//! and the breakdown behind it (`forecast_data`). Turning demand into an order — target
//! months, reorder threshold, stock on hand — is the suggestion's job
//! ([`generate_suggested_quantity`]), and works the same for every method.
//!
//! The forecast is captured when a line is created. Afterwards only a method change on
//! the line, or a principal line arriving, changing method or leaving (for the
//! Ancillary-ratio lines it feeds, see [`recompute_ancillary_dependants`]), recomputes it.

mod cascade;
mod population;

pub use cascade::*;

use super::{GenerateSuggestedQuantity, generate_suggested_quantity};
use crate::{
    item::ancillary_item::supply_wastage_rates,
    preference::{DisplayPopulationBasedForecasting, Preference},
};
use population::CoveringCourses;
use repository::{
    AncillaryRatioForecast, AncillaryRatioPrincipal, EqualFilter, ForecastData, ForecastMethod,
    LineForecast, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, RequisitionRow, StorageConnection,
    ancillary_item::{AncillaryItemFilter, AncillaryItemRepository},
    ancillary_item_row::AncillaryItemRow,
    requisition_row::RequisitionType,
};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

/// Why a method can't be chosen for a line.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ForecastMethodUnavailableReason {
    PopulationPreferenceOff,
    NoPopulationServed,
    NoVaccineCourse,
    NoPrincipalOnOrder,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ForecastMethodOption {
    pub method: ForecastMethod,
    /// None when the method is available
    pub unavailable_reason: Option<ForecastMethodUnavailableReason>,
}

/// The monthly demand of each line on a requisition, by item.
pub type OrderDemand = HashMap<String, f64>;

pub fn order_demand<'a>(lines: impl IntoIterator<Item = &'a RequisitionLineRow>) -> OrderDemand {
    lines
        .into_iter()
        .map(|line| (line.item_id.clone(), line.forecast_monthly_consumption))
        .collect()
}

/// What the forecast methods read for a set of items in one store, loaded once.
pub struct ForecastInputs {
    population_preference: bool,
    population_served: Option<f64>,
    courses: CoveringCourses,
    /// Ancillary item → the configured links naming it as a principal's ancillary
    links_to: HashMap<String, Vec<AncillaryItemRow>>,
    /// Each item's own wastage rate (%) as a supply, for the items and their principals
    supply_wastage_rates: HashMap<String, f64>,
}

impl ForecastInputs {
    pub fn load(
        connection: &StorageConnection,
        store_id: &str,
        item_ids: &[String],
    ) -> Result<Self, RepositoryError> {
        let population_preference = DisplayPopulationBasedForecasting
            .load(connection, None)
            .unwrap_or(false);

        let mut links_to: HashMap<String, Vec<AncillaryItemRow>> = HashMap::new();
        for link in AncillaryItemRepository::new(connection).query_by_filter(
            AncillaryItemFilter::new().ancillary_item_id(EqualFilter::equal_any(item_ids.to_vec())),
        )? {
            links_to
                .entry(link.ancillary_item_id.clone())
                .or_default()
                .push(link);
        }

        // The Ancillary-ratio forecast reads each principal's wastage rate as well
        let course_item_ids: Vec<String> = item_ids
            .iter()
            .cloned()
            .chain(links_to.values().flatten().map(|link| link.item_id.clone()))
            .collect::<HashSet<String>>()
            .into_iter()
            .collect();

        Ok(ForecastInputs {
            population_preference,
            population_served: population_served(connection, store_id)?,
            courses: CoveringCourses::load(connection, store_id, &course_item_ids)?,
            supply_wastage_rates: supply_wastage_rates(connection, &course_item_ids)?,
            links_to,
        })
    }

    /// The wastage rate a link deducts from its principal's demand when the link excludes
    /// it: the vaccine courses' rate, or for a principal no course covers (a syringe
    /// feeding safety boxes) its own rate as a supply. Else none.
    fn principal_wastage_rate(&self, link: &AncillaryItemRow) -> f64 {
        if !link.exclude_principal_wastage {
            0.0
        } else if self.courses.covers(&link.item_id) {
            self.courses.wastage_rate(&link.item_id)
        } else {
            self.supply_wastage_rate(&link.item_id)
        }
    }

    fn supply_wastage_rate(&self, item_id: &str) -> f64 {
        self.supply_wastage_rates
            .get(item_id)
            .copied()
            .unwrap_or(0.0)
    }

    /// The configured links from principals on the order to `item_id`.
    fn principal_links<'a>(
        &'a self,
        item_id: &'a str,
        order: &'a OrderDemand,
    ) -> impl Iterator<Item = &'a AncillaryItemRow> + 'a {
        self.links_to
            .get(item_id)
            .into_iter()
            .flatten()
            .filter(move |link| link.item_id != item_id && order.contains_key(&link.item_id))
    }

    /// Items whose lines feed `item_id`'s Ancillary ratio, whether or not they're on the order.
    fn principal_items<'a>(&'a self, item_id: &'a str) -> impl Iterator<Item = &'a str> + 'a {
        self.links_to
            .get(item_id)
            .into_iter()
            .flatten()
            .map(|link| link.item_id.as_str())
            .filter(move |principal| *principal != item_id)
    }

    pub fn unavailable_reason(
        &self,
        method: &ForecastMethod,
        item_id: &str,
        order: &OrderDemand,
    ) -> Option<ForecastMethodUnavailableReason> {
        use ForecastMethodUnavailableReason as Reason;
        match method {
            // An unknown method can't be chosen (it isn't offered); it forecasts as AMC
            ForecastMethod::Amc | ForecastMethod::Other(_) => None,
            ForecastMethod::Population if !self.population_preference => {
                Some(Reason::PopulationPreferenceOff)
            }
            ForecastMethod::Population if self.population_served.is_none() => {
                Some(Reason::NoPopulationServed)
            }
            ForecastMethod::Population if !self.courses.covers(item_id) => {
                Some(Reason::NoVaccineCourse)
            }
            ForecastMethod::Population => None,
            ForecastMethod::AncillaryRatio => self
                .principal_links(item_id, order)
                .next()
                .is_none()
                .then_some(Reason::NoPrincipalOnOrder),
        }
    }

    /// Every method, an unavailable one with its reason.
    pub fn options(&self, item_id: &str, order: &OrderDemand) -> Vec<ForecastMethodOption> {
        ForecastMethod::KNOWN
            .iter()
            .map(|method| ForecastMethodOption {
                method: method.clone(),
                unavailable_reason: self.unavailable_reason(method, item_id, order),
            })
            .collect()
    }

    /// The line's forecast under `method`. The caller checks the method is available.
    pub fn forecast(
        &self,
        method: ForecastMethod,
        item_id: &str,
        average_monthly_consumption: f64,
        order: &OrderDemand,
    ) -> LineForecast {
        match method {
            ForecastMethod::Amc | ForecastMethod::Other(_) => {
                LineForecast::amc(average_monthly_consumption)
            }
            ForecastMethod::Population => {
                let forecast = self
                    .courses
                    .forecast(item_id, self.population_served.unwrap_or_default());
                LineForecast {
                    method,
                    monthly_consumption: forecast.courses.iter().map(|c| c.monthly_units).sum(),
                    data: Some(ForecastData::Population(forecast)),
                }
            }
            ForecastMethod::AncillaryRatio => {
                let principals: Vec<AncillaryRatioPrincipal> = self
                    .principal_links(item_id, order)
                    .map(|link| AncillaryRatioPrincipal {
                        item_id: link.item_id.clone(),
                        principal_monthly_consumption: order
                            .get(&link.item_id)
                            .copied()
                            .unwrap_or_default(),
                        item_quantity: link.item_quantity,
                        ancillary_quantity: link.ancillary_quantity,
                        wastage_rate: self.principal_wastage_rate(link),
                        own_wastage_rate: self.supply_wastage_rate(item_id),
                    })
                    .collect();
                LineForecast {
                    method,
                    monthly_consumption: principals
                        .iter()
                        .map(AncillaryRatioPrincipal::monthly_consumption)
                        .sum(),
                    data: Some(ForecastData::AncillaryRatio(AncillaryRatioForecast {
                        principals,
                    })),
                }
            }
        }
    }

    /// The first available method of Ancillary ratio → Population → AMC.
    pub fn default_method(&self, item_id: &str, order: &OrderDemand) -> ForecastMethod {
        [ForecastMethod::AncillaryRatio, ForecastMethod::Population]
            .iter()
            .find(|method| self.unavailable_reason(method, item_id, order).is_none())
            .cloned()
            .unwrap_or(ForecastMethod::Amc)
    }

    pub fn default_forecast(
        &self,
        item_id: &str,
        average_monthly_consumption: f64,
        order: &OrderDemand,
    ) -> LineForecast {
        let method = self.default_method(item_id, order);
        self.forecast(method, item_id, average_monthly_consumption, order)
    }

    /// Default forecasts for new lines joining an order whose existing lines' demand is
    /// `order`. A principal is forecast before the ancillaries it feeds, so a chain
    /// resolves from the top. Each new line's demand is added to `order`.
    pub fn default_forecasts(
        &self,
        new_items: &[(String, f64)],
        order: &mut OrderDemand,
    ) -> HashMap<String, LineForecast> {
        let mut pending: Vec<(String, f64)> = new_items.to_vec();
        let mut forecasts = HashMap::new();

        while !pending.is_empty() {
            let pending_items: HashSet<String> =
                pending.iter().map(|(item_id, _)| item_id.clone()).collect();
            // Items none of whose principals are still waiting for a forecast. The
            // configured links are acyclic, so there is always one; take everything left
            // if not, rather than loop.
            let (ready, waiting): (Vec<_>, Vec<_>) =
                pending.into_iter().partition(|(item_id, _)| {
                    !self
                        .principal_items(item_id)
                        .any(|principal| pending_items.contains(principal))
                });
            let (ready, waiting) = if ready.is_empty() {
                (waiting, vec![])
            } else {
                (ready, waiting)
            };

            for (item_id, average_monthly_consumption) in ready {
                let forecast = self.default_forecast(&item_id, average_monthly_consumption, order);
                order.insert(item_id.clone(), forecast.monthly_consumption);
                forecasts.insert(item_id, forecast);
            }
            pending = waiting;
        }

        forecasts
    }
}

/// The suggested quantity for a line with `forecast_monthly_consumption` on `requisition`.
pub fn suggested_quantity(
    requisition: &RequisitionRow,
    forecast_monthly_consumption: f64,
    available_stock_on_hand: f64,
) -> f64 {
    generate_suggested_quantity(GenerateSuggestedQuantity {
        forecast_monthly_consumption,
        available_stock_on_hand,
        min_months_of_stock: requisition.min_months_of_stock,
        max_months_of_stock: requisition.max_months_of_stock,
    })
}

/// Writes `forecast` onto `line` and recomputes its suggested quantity.
pub fn apply_forecast(
    line: &mut RequisitionLineRow,
    forecast: LineForecast,
    requisition: &RequisitionRow,
) {
    line.forecast_data = forecast.data_json();
    line.forecast_method = forecast.method;
    line.forecast_monthly_consumption = forecast.monthly_consumption;
    line.suggested_quantity = suggested_quantity(
        requisition,
        line.forecast_monthly_consumption,
        line.available_stock_on_hand,
    );
}

/// The wastage rate (%) of each of `item_ids` in `store_id`: the vaccine courses covering
/// it, with the store's overrides, weighted as the item's Population forecast weights
/// them. An item no course covers is absent.
pub fn wastage_rates(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: &[String],
) -> Result<HashMap<String, f64>, RepositoryError> {
    if item_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let courses = CoveringCourses::load(connection, store_id, item_ids)?;
    Ok(item_ids
        .iter()
        .filter(|item_id| courses.covers(item_id))
        .map(|item_id| (item_id.clone(), courses.wastage_rate(item_id)))
        .collect())
}

/// The `population_served` property of the store's facility record.
fn population_served(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Option<f64>, RepositoryError> {
    Ok(super::store_properties(connection, store_id)?
        .get("population_served")
        .and_then(Value::as_f64))
}

/// The forecast method options of each of `line_ids` (every method, an unavailable one
/// with its reason), each against the other lines on its requisition. Lines on a response
/// requisition, whose forecast is the customer's, get none. Reads each requisition's lines
/// and forecast inputs once, however many of its lines are asked for.
pub fn get_forecast_method_options(
    connection: &StorageConnection,
    line_ids: &[String],
) -> Result<HashMap<String, Vec<ForecastMethodOption>>, RepositoryError> {
    let repository = RequisitionLineRepository::new(connection);
    let mut by_requisition: HashMap<String, (RequisitionRow, Vec<RequisitionLineRow>)> =
        HashMap::new();
    for line in repository.query_by_filter(
        RequisitionLineFilter::new().id(EqualFilter::equal_any(line_ids.to_vec())),
    )? {
        if line.requisition_row.r#type != RequisitionType::Request {
            continue;
        }
        by_requisition
            .entry(line.requisition_row.id.clone())
            .or_insert_with(|| (line.requisition_row.clone(), vec![]))
            .1
            .push(line.requisition_line_row);
    }

    let mut options = HashMap::new();
    for (requisition_id, (requisition, lines)) in by_requisition {
        let order_lines: Vec<RequisitionLineRow> = repository
            .query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(requisition_id)),
            )?
            .into_iter()
            .map(|line| line.requisition_line_row)
            .collect();
        let order = order_demand(&order_lines);
        let item_ids: Vec<String> = lines.iter().map(|line| line.item_id.clone()).collect();
        let inputs = ForecastInputs::load(connection, &requisition.store_id, &item_ids)?;
        for line in lines {
            options.insert(line.id.clone(), inputs.options(&line.item_id, &order));
        }
    }

    Ok(options)
}

#[cfg(test)]
mod test;

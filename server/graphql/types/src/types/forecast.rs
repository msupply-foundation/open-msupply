use super::ItemNode;
use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::{loader::ItemLoader, ContextExt};
use repository::{
    AncillaryRatioForecast, AncillaryRatioPrincipal, ForecastData, PopulationForecast,
    PopulationForecastCourse,
};
use service::requisition::request_requisition::{
    ForecastMethodOption, ForecastMethodUnavailableReason,
};

/// Where a requisition line's monthly demand comes from.
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
#[graphql(remote = "repository::ForecastMethod")]
pub enum ForecastMethodNode {
    /// The line's average monthly consumption
    Amc,
    /// The vaccine courses covering the item, for the store's population served
    Population,
    /// The order's principal lines' monthly demand × the configured ancillary ratios
    AncillaryRatio,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
#[graphql(remote = "service::requisition::request_requisition::ForecastMethodUnavailableReason")]
pub enum ForecastMethodUnavailableReasonNode {
    /// The population-based forecasting preference is off
    PopulationPreferenceOff,
    /// The store's facility record carries no population served
    NoPopulationServed,
    /// No vaccine course covers the item
    NoVaccineCourse,
    /// No line on the order is a principal of the item
    NoPrincipalOnOrder,
}

#[derive(SimpleObject)]
pub struct ForecastMethodOptionNode {
    pub method: ForecastMethodNode,
    pub is_available: bool,
    /// Null when available
    pub unavailable_reason: Option<ForecastMethodUnavailableReasonNode>,
}

impl ForecastMethodOptionNode {
    pub fn from_domain(
        ForecastMethodOption {
            method,
            unavailable_reason,
        }: ForecastMethodOption,
    ) -> Self {
        ForecastMethodOptionNode {
            method: method.into(),
            is_available: unavailable_reason.is_none(),
            unavailable_reason: unavailable_reason.map(ForecastMethodUnavailableReason::into),
        }
    }
}

/// The inputs and steps behind a line's monthly demand, one member per method. None holds
/// a months-of-stock figure: the requisition's thresholds supply those.
#[derive(Union)]
pub enum ForecastBreakdownNode {
    Amc(AmcForecastNode),
    Population(PopulationForecastNode),
    AncillaryRatio(AncillaryRatioForecastNode),
}

#[derive(SimpleObject)]
pub struct AmcForecastNode {
    pub average_monthly_consumption: f64,
}

pub struct PopulationForecastNode {
    forecast: PopulationForecast,
}

#[Object]
impl PopulationForecastNode {
    /// Null on a forecast converted from an older site's data
    pub async fn population_served(&self) -> Option<f64> {
        self.forecast.population_served
    }

    /// One per covering course-and-demographic
    pub async fn courses(&self) -> Vec<PopulationForecastCourseNode> {
        self.forecast
            .courses
            .iter()
            .cloned()
            .map(|course| PopulationForecastCourseNode { course })
            .collect()
    }
}

pub struct PopulationForecastCourseNode {
    course: PopulationForecastCourse,
}

#[Object]
impl PopulationForecastCourseNode {
    pub async fn course_name(&self) -> &str {
        &self.course.course_name
    }
    /// Null when the course targets the whole population
    pub async fn demographic_name(&self) -> &Option<String> {
        &self.course.demographic_name
    }
    pub async fn number_of_doses(&self) -> i32 {
        self.course.number_of_doses
    }
    pub async fn coverage_rate(&self) -> f64 {
        self.course.coverage_rate
    }
    pub async fn wastage_rate(&self) -> f64 {
        self.course.wastage_rate
    }
    pub async fn target_population(&self) -> f64 {
        self.course.target_population
    }
    pub async fn loss_factor(&self) -> f64 {
        self.course.loss_factor
    }
    pub async fn annual_target_doses(&self) -> f64 {
        self.course.annual_target_doses
    }
    pub async fn doses_per_unit(&self) -> f64 {
        self.course.doses_per_unit
    }
    pub async fn monthly_doses(&self) -> f64 {
        self.course.monthly_doses
    }
    pub async fn monthly_units(&self) -> f64 {
        self.course.monthly_units
    }
}

pub struct AncillaryRatioForecastNode {
    forecast: AncillaryRatioForecast,
}

#[Object]
impl AncillaryRatioForecastNode {
    /// One per principal line on the order
    pub async fn principals(&self) -> Vec<AncillaryRatioPrincipalNode> {
        self.forecast
            .principals
            .iter()
            .cloned()
            .map(|principal| AncillaryRatioPrincipalNode { principal })
            .collect()
    }
}

pub struct AncillaryRatioPrincipalNode {
    principal: AncillaryRatioPrincipal,
}

#[Object]
impl AncillaryRatioPrincipalNode {
    pub async fn item_id(&self) -> &str {
        &self.principal.item_id
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        Ok(loader
            .load_one(self.principal.item_id.clone())
            .await?
            .map(ItemNode::from_domain))
    }
    /// The principal line's monthly demand
    pub async fn principal_monthly_consumption(&self) -> f64 {
        self.principal.principal_monthly_consumption
    }
    /// The configured ratio: `itemQuantity` principal units to `ancillaryQuantity`
    /// ancillary units, as on `AncillaryItemNode`
    pub async fn item_quantity(&self) -> f64 {
        self.principal.item_quantity
    }
    pub async fn ancillary_quantity(&self) -> f64 {
        self.principal.ancillary_quantity
    }
    /// This principal's share of the line's monthly demand
    pub async fn monthly_consumption(&self) -> f64 {
        self.principal.monthly_consumption()
    }
}

impl ForecastBreakdownNode {
    /// The breakdown stored on a line; an AMC line's is its average monthly consumption.
    pub fn from_domain(data: Option<ForecastData>, average_monthly_consumption: f64) -> Self {
        match data {
            Some(ForecastData::Population(forecast)) => {
                ForecastBreakdownNode::Population(PopulationForecastNode { forecast })
            }
            Some(ForecastData::AncillaryRatio(forecast)) => {
                ForecastBreakdownNode::AncillaryRatio(AncillaryRatioForecastNode { forecast })
            }
            None => ForecastBreakdownNode::Amc(AmcForecastNode {
                average_monthly_consumption,
            }),
        }
    }
}

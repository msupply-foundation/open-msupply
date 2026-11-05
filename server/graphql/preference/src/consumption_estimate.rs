use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{
    ContextExt,
    loader::ItemLoader,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::ItemNode;
use repository::ConsumptionEstimateSource;
use service::{
    auth::{Resource, ResourceAccessRequest},
    consumption_estimate::{
        ActualConsumptionOverlap, ConsumptionEstimate, ConsumptionEstimateInput, LineError,
        LineProblem, ReplaceConsumptionEstimates, ReplaceConsumptionEstimatesError,
        clear_consumption_estimates, get_consumption_estimates, replace_consumption_estimates,
    },
    store_preference::get_store_preferences,
};

// Only the upload for a store without history goes through the API for now
const SOURCE: ConsumptionEstimateSource = ConsumptionEstimateSource::InitialUpload;

pub struct ConsumptionEstimateNode {
    estimate: ConsumptionEstimate,
}

#[Object]
impl ConsumptionEstimateNode {
    pub async fn item_id(&self) -> &str {
        &self.estimate.item_id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item = loader.load_one(self.estimate.item_id.clone()).await?;
        item.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item {} for a consumption estimate",
                self.estimate.item_id
            ))
            .extend(),
        )
    }

    pub async fn period_start(&self) -> NaiveDate {
        self.estimate.period_start
    }

    pub async fn period_end(&self) -> NaiveDate {
        self.estimate.period_end
    }

    /// In units
    pub async fn quantity(&self) -> f64 {
        self.estimate.quantity
    }
}

fn estimate_nodes(estimates: Vec<ConsumptionEstimate>) -> Vec<ConsumptionEstimateNode> {
    estimates
        .into_iter()
        .map(|estimate| ConsumptionEstimateNode { estimate })
        .collect()
}

#[derive(SimpleObject)]
pub struct ConsumptionEstimatesNode {
    pub estimates: Vec<ConsumptionEstimateNode>,
    /// The store's AMC look-back period: how many months of estimates count
    pub amc_look_back_months: f64,
}

/// `store_id` is the signed-in store the request is authorised against;
/// `for_store_id` the store whose estimates these are
pub fn consumption_estimates(
    ctx: &Context<'_>,
    store_id: String,
    for_store_id: String,
) -> Result<ConsumptionEstimatesNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStorePreferences,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let estimates = get_consumption_estimates(&service_context.connection, &for_store_id, &SOURCE)?;
    let preferences = get_store_preferences(&service_context.connection, &for_store_id)?;
    Ok(ConsumptionEstimatesNode {
        estimates: estimate_nodes(estimates),
        amc_look_back_months: preferences.monthly_consumption_look_back_period,
    })
}

#[derive(InputObject)]
pub struct ConsumptionEstimateLineInput {
    pub item_id_or_code: String,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    /// In units
    pub quantity: f64,
}

#[derive(InputObject)]
pub struct ReplaceConsumptionEstimatesInput {
    /// The store whose estimates these are
    pub for_store_id: String,
    /// Each item named ends up with exactly these periods; items not named are
    /// left alone
    pub lines: Vec<ConsumptionEstimateLineInput>,
    /// Check the lines and report what would be saved, without saving
    pub dry_run: Option<bool>,
}

/// A line whose period already has real consumption for its item: the estimate is
/// added on top of it
#[derive(SimpleObject)]
pub struct ActualConsumptionOverlapNode {
    /// Index into the input lines
    pub line: u32,
    pub actual_quantity: f64,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ConsumptionEstimateLineProblem {
    ItemNotFound,
    InvalidPeriod,
    PeriodInFuture,
    InvalidQuantity,
    OverlapsLine,
}

#[derive(SimpleObject)]
pub struct ConsumptionEstimateLineErrorNode {
    /// Index into the input lines
    pub line: u32,
    pub problem: ConsumptionEstimateLineProblem,
    /// For `OVERLAPS_LINE`: the earlier line it overlaps
    pub other_line: Option<u32>,
}

#[derive(SimpleObject)]
pub struct ReplaceConsumptionEstimatesNode {
    pub estimates: Vec<ConsumptionEstimateNode>,
    pub overlaps: Vec<ActualConsumptionOverlapNode>,
}

/// Nothing is saved when any line has a problem
#[derive(SimpleObject)]
pub struct ConsumptionEstimateLinesError {
    pub errors: Vec<ConsumptionEstimateLineErrorNode>,
}

#[derive(Union)]
pub enum ReplaceConsumptionEstimatesResponse {
    Response(ReplaceConsumptionEstimatesNode),
    Error(ConsumptionEstimateLinesError),
}

/// `store_id` is the signed-in store the request is authorised against
pub fn replace_estimates(
    ctx: &Context<'_>,
    store_id: String,
    input: ReplaceConsumptionEstimatesInput,
) -> Result<ReplaceConsumptionEstimatesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePreferences,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = replace_consumption_estimates(
        &service_context,
        ReplaceConsumptionEstimates {
            store_id: input.for_store_id,
            source: SOURCE,
            lines: input
                .lines
                .into_iter()
                .map(|line| ConsumptionEstimateInput {
                    item_id_or_code: line.item_id_or_code,
                    period_start: line.period_start,
                    period_end: line.period_end,
                    quantity: line.quantity,
                })
                .collect(),
            dry_run: input.dry_run.unwrap_or(false),
        },
    );

    match result {
        Ok(result) => Ok(ReplaceConsumptionEstimatesResponse::Response(
            ReplaceConsumptionEstimatesNode {
                estimates: estimate_nodes(result.estimates),
                overlaps: result
                    .overlaps
                    .into_iter()
                    .map(
                        |ActualConsumptionOverlap {
                             line,
                             actual_quantity,
                         }| ActualConsumptionOverlapNode {
                            line: line as u32,
                            actual_quantity,
                        },
                    )
                    .collect(),
            },
        )),
        Err(ReplaceConsumptionEstimatesError::InvalidLines(errors)) => Ok(
            ReplaceConsumptionEstimatesResponse::Error(ConsumptionEstimateLinesError {
                errors: errors.into_iter().map(line_error_node).collect(),
            }),
        ),
        Err(ReplaceConsumptionEstimatesError::StoreDoesNotExist) => {
            Err(StandardGraphqlError::BadUserInput("Store does not exist".to_string()).extend())
        }
        Err(ReplaceConsumptionEstimatesError::DatabaseError(error)) => Err(error.into()),
    }
}

fn line_error_node(LineError { line, problem }: LineError) -> ConsumptionEstimateLineErrorNode {
    use ConsumptionEstimateLineProblem as P;
    let (problem, other_line) = match problem {
        LineProblem::ItemNotFound => (P::ItemNotFound, None),
        LineProblem::InvalidPeriod => (P::InvalidPeriod, None),
        LineProblem::PeriodInFuture => (P::PeriodInFuture, None),
        LineProblem::InvalidQuantity => (P::InvalidQuantity, None),
        LineProblem::OverlapsLine(other) => (P::OverlapsLine, Some(other as u32)),
    };
    ConsumptionEstimateLineErrorNode {
        line: line as u32,
        problem,
        other_line,
    }
}

/// Removes all of the store's estimates. `store_id` is the signed-in store the
/// request is authorised against.
pub fn clear_estimates(ctx: &Context<'_>, store_id: String, for_store_id: String) -> Result<()> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePreferences,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;
    clear_consumption_estimates(&service_context, &for_store_id, &SOURCE)?;
    Ok(())
}

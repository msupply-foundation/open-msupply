use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{
    ContextExt,
    loader::ItemLoader,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::ItemNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    consumption_estimate::{
        ActualConsumptionOverlap, ConsumptionEstimate, ConsumptionEstimateInput, LineError,
        LineProblem, ReplaceConsumptionEstimates, ReplaceConsumptionEstimatesError,
        clear_consumption_estimates, get_consumption_estimates, get_template_items,
        replace_consumption_estimates,
    },
    store_preference::get_store_preferences,
};

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

    /// The first day of the month the estimate is for
    pub async fn month(&self) -> NaiveDate {
        self.estimate.month
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
#[graphql(complex)]
pub struct ConsumptionEstimatesNode {
    pub estimates: Vec<ConsumptionEstimateNode>,
    /// The store's AMC look-back period: how many months of estimates count
    pub amc_look_back_months: f64,
    #[graphql(skip)]
    pub for_store_id: String,
}

#[derive(SimpleObject)]
pub struct ConsumptionEstimateTemplateItemNode {
    pub code: String,
    pub name: String,
}

#[ComplexObject]
impl ConsumptionEstimatesNode {
    /// The active stock items visible in the store, by name: the rows of a blank
    /// upload template. Only resolved when asked for, as there can be thousands.
    pub async fn template_items(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<ConsumptionEstimateTemplateItemNode>> {
        let connection = ctx.service_provider().connection()?;
        Ok(get_template_items(&connection, &self.for_store_id)?
            .into_iter()
            .map(|item| ConsumptionEstimateTemplateItemNode {
                code: item.code,
                name: item.name,
            })
            .collect())
    }
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

    let estimates = get_consumption_estimates(&service_context.connection, &for_store_id)?;
    let preferences = get_store_preferences(&service_context.connection, &for_store_id)?;
    Ok(ConsumptionEstimatesNode {
        estimates: estimate_nodes(estimates),
        amc_look_back_months: preferences.monthly_consumption_look_back_period,
        for_store_id,
    })
}

#[derive(InputObject)]
pub struct ConsumptionEstimateLineInput {
    pub item_id_or_code: String,
    /// Any day in the month: the estimate is for the whole calendar month
    pub month: NaiveDate,
    /// In units
    pub quantity: f64,
}

#[derive(InputObject)]
pub struct ReplaceConsumptionEstimatesInput {
    /// The store whose estimates these are
    pub for_store_id: String,
    /// Each item named ends up with exactly these months; items not named are
    /// left alone
    pub lines: Vec<ConsumptionEstimateLineInput>,
    /// Items (by id or code) named with no months, e.g. a blank row in the
    /// file: their estimates are removed. One with no estimates, or that matches
    /// no item, is ignored.
    pub cleared_items: Option<Vec<String>>,
    /// Check the lines and report what would be saved, without saving
    pub dry_run: Option<bool>,
}

/// A line whose month already has real consumption for its item: the estimate is
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
    /// This month or later: only finished months can have an estimate
    MonthNotFinished,
    InvalidQuantity,
    /// The same item and month as an earlier line
    RepeatedMonth,
}

#[derive(SimpleObject)]
pub struct ConsumptionEstimateLineErrorNode {
    /// Index into the input lines
    pub line: u32,
    pub problem: ConsumptionEstimateLineProblem,
    /// For `REPEATED_MONTH`: the earlier line with the same item and month
    pub other_line: Option<u32>,
}

#[derive(SimpleObject)]
pub struct ReplaceConsumptionEstimatesNode {
    pub estimates: Vec<ConsumptionEstimateNode>,
    pub overlaps: Vec<ActualConsumptionOverlapNode>,
    /// Indexes into `clearedItems` of the items whose estimates are removed
    pub removed_items: Vec<u32>,
}

/// Nothing is saved when any line has a problem
#[derive(SimpleObject)]
pub struct ConsumptionEstimateLinesError {
    pub errors: Vec<ConsumptionEstimateLineErrorNode>,
    /// As on a successful response: the cleared items whose estimates would be
    /// removed once the lines are fixed
    pub removed_items: Vec<u32>,
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
            lines: input
                .lines
                .into_iter()
                .map(|line| ConsumptionEstimateInput {
                    item_id_or_code: line.item_id_or_code,
                    month: line.month,
                    quantity: line.quantity,
                })
                .collect(),
            cleared_items: input.cleared_items.unwrap_or_default(),
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
                removed_items: result
                    .removed
                    .into_iter()
                    .map(|index| index as u32)
                    .collect(),
            },
        )),
        Err(ReplaceConsumptionEstimatesError::InvalidLines { errors, removed }) => Ok(
            ReplaceConsumptionEstimatesResponse::Error(ConsumptionEstimateLinesError {
                errors: errors.into_iter().map(line_error_node).collect(),
                removed_items: removed.into_iter().map(|index| index as u32).collect(),
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
        LineProblem::MonthNotFinished => (P::MonthNotFinished, None),
        LineProblem::InvalidQuantity => (P::InvalidQuantity, None),
        LineProblem::RepeatedMonth(other) => (P::RepeatedMonth, Some(other as u32)),
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
    clear_consumption_estimates(&service_context, &for_store_id)?;
    Ok(())
}

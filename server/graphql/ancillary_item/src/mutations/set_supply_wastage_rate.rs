use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::ancillary_item::{SetSupplyWastageRate, SetSupplyWastageRateError as ServiceError},
};

#[derive(InputObject)]
pub struct SetSupplyWastageRateInput {
    pub item_id: String,
    /// Percent, at least 0 and below 100; 0 clears it
    pub wastage_rate: f64,
}

/// The rate saved for the item
#[derive(SimpleObject)]
pub struct SupplyWastageRateNode {
    pub item_id: String,
    pub wastage_rate: f64,
}

#[derive(SimpleObject)]
pub struct SetSupplyWastageRateError {
    pub error: SetSupplyWastageRateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "SetSupplyWastageRateResponse")]
pub enum SetSupplyWastageRateResponse {
    Error(SetSupplyWastageRateError),
    Response(SupplyWastageRateNode),
}

pub struct SupplyWastageRateOutOfRange;
#[Object]
impl SupplyWastageRateOutOfRange {
    pub async fn description(&self) -> &str {
        "A supply's wastage rate must be at least 0 and below 100"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum SetSupplyWastageRateErrorInterface {
    SupplyWastageRateOutOfRange(SupplyWastageRateOutOfRange),
}

/// Sets an item's own wastage rate as an ancillary supply
pub fn set_supply_wastage_rate(
    ctx: &Context<'_>,
    store_id: String,
    input: SetSupplyWastageRateInput,
) -> Result<SetSupplyWastageRateResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let SetSupplyWastageRateInput {
        item_id,
        wastage_rate,
    } = input;
    let result = service_provider.item_service.set_supply_wastage_rate(
        &service_context,
        SetSupplyWastageRate {
            item_id: item_id.clone(),
            wastage_rate,
        },
    );

    match result {
        Ok(wastage_rate) => Ok(SetSupplyWastageRateResponse::Response(
            SupplyWastageRateNode {
                item_id,
                wastage_rate,
            },
        )),
        Err(error) => Ok(SetSupplyWastageRateResponse::Error(
            SetSupplyWastageRateError {
                error: map_error(error)?,
            },
        )),
    }
}

fn map_error(error: ServiceError) -> Result<SetSupplyWastageRateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // User-visible structured error — typed so the client can render a translated message
        ServiceError::RateOutOfRange => {
            return Ok(
                SetSupplyWastageRateErrorInterface::SupplyWastageRateOutOfRange(
                    SupplyWastageRateOutOfRange,
                ),
            );
        }
        ServiceError::NotCentralServer => Forbidden(formatted_error),
        // Bad user input that the UI prevents
        ServiceError::ItemDoesNotExist | ServiceError::NotAnAncillaryItem => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

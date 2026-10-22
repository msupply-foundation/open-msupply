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

/// Sets an item's own wastage rate as an ancillary supply, returning the rate saved
pub fn set_supply_wastage_rate(
    ctx: &Context<'_>,
    store_id: String,
    input: SetSupplyWastageRateInput,
) -> Result<f64> {
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
    service_provider
        .item_service
        .set_supply_wastage_rate(
            &service_context,
            SetSupplyWastageRate {
                item_id,
                wastage_rate,
            },
        )
        .map_err(map_error)
}

fn map_error(error: ServiceError) -> Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::NotCentralServer => Forbidden(formatted_error),
        // Bad user input that the UI prevents
        ServiceError::ItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::RateOutOfRange => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}

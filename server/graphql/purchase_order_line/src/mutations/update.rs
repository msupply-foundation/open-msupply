use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{
        validate_auth,
        StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::PurchaseOrderLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    purchase_order_line::update::{
        UpdatePurchaseOrderLineInput as ServiceInput,
        UpdatePurchaseOrderLineInputError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "UpdatePurchaseOrderLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub item_id: Option<String>,
    pub pack_size: Option<f64>,
    pub requested_quantity: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            item_id,
            pack_size,
            requested_quantity,
            requested_delivery_date,
            expected_delivery_date,
        } = self;

        ServiceInput {
            id,
            item_id,
            requested_pack_size: pack_size,
            requested_number_of_units: requested_quantity,
            requested_delivery_date,
            expected_delivery_date,
        }
    }
}

#[derive(Union)]
#[graphql(name = "UpdatePurchaseOrderLineResponse")]
pub enum UpdateResponse {
    Response(IdResponse),
}

pub fn update_purchase_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    );

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user?.user_id)?;

    map_response(
        service_provider
            .purchase_order_line_service
            .update_purchase_order_line(&service_context, store_id, input.to_domain()),
    )
}

fn map_response(from: Result<PurchaseOrderLine, ServiceError>) -> Result<UpdateResponse> {
    match from {
        Ok(line) => Ok(UpdateResponse::Response(IdResponse(
            line.purchase_order_line_row.id,
        ))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::PurchaseOrderLineNotFound
        | ServiceError::UpdatedLineDoesNotExist
        | ServiceError::PurchaseOrderDoesNotExist
        | ServiceError::PurchaseOrderCannotBeUpdated => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

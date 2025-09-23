use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::generic_inputs::NullableUpdateInput;
use graphql_core::simple_generic_errors::CannotEditPurchaseOrder;
use graphql_core::{
    standard_graphql_error::{
        validate_auth,
        StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::generic_errors::ItemCannotBeOrdered;
use graphql_types::types::{IdResponse, PurchaseOrderLineStatusNode};
use repository::PurchaseOrderLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    purchase_order_line::update::{
        UpdatePurchaseOrderLineInput as ServiceInput,
        UpdatePurchaseOrderLineInputError as ServiceError,
    },
    NullableUpdate,
};

use crate::mutations::errors::{
    CannotEditAdjustedQuantity, CannotEditQuantityBelowReceived, CannotEditRequestedQuantity,
    PurchaseOrderDoesNotExist, PurchaseOrderLineNotFound, UpdatedLineDoesNotExist,
};

#[derive(InputObject)]
#[graphql(name = "UpdatePurchaseOrderLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub item_id: Option<String>,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub adjusted_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub price_per_unit_before_discount: Option<f64>,
    pub price_per_unit_after_discount: Option<f64>,
    pub manufacturer_id: Option<NullableUpdateInput<String>>,
    pub note: Option<NullableUpdateInput<String>>,
    pub unit: Option<String>,
    pub supplier_item_code: Option<NullableUpdateInput<String>>,
    pub comment: Option<NullableUpdateInput<String>>,
    pub status: Option<PurchaseOrderLineStatusNode>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            item_id,
            requested_pack_size,
            requested_number_of_units,
            adjusted_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
            price_per_unit_before_discount,
            price_per_unit_after_discount,
            manufacturer_id,
            note,
            unit,
            supplier_item_code,
            comment,
            status,
        } = self;

        ServiceInput {
            id,
            item_id,
            requested_pack_size,
            requested_number_of_units,
            adjusted_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
            price_per_unit_before_discount,
            price_per_unit_after_discount,
            manufacturer_id: manufacturer_id.map(|v| NullableUpdate { value: v.value }),
            note: note.map(|v| NullableUpdate { value: v.value }),
            unit,
            supplier_item_code: supplier_item_code.map(|v| NullableUpdate { value: v.value }),
            comment: comment.map(|v| NullableUpdate { value: v.value }),
            status: status.map(|s| s.into()),
        }
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "&str"))]
pub enum PurchaseOrderLineError {
    PurchaseOrderLineNotFound(PurchaseOrderLineNotFound),
    UpdatedLineDoesNotExist(UpdatedLineDoesNotExist),
    PurchaseOrderDoesNotExist(PurchaseOrderDoesNotExist),
    CannotEditPurchaseOrder(CannotEditPurchaseOrder),
    CannotEditRequestedQuantity(CannotEditRequestedQuantity),
    CannotEditAdjustedQuantity(CannotEditAdjustedQuantity),
    CannotEditQuantityBelowReceived(CannotEditQuantityBelowReceived),
    ItemCannotBeOrdered(ItemCannotBeOrdered),
}

#[derive(SimpleObject)]
pub struct UpdatePurchaseOrderLineError {
    pub error: PurchaseOrderLineError,
}

#[derive(Union)]
#[graphql(name = "UpdatePurchaseOrderLineResponse")]
pub enum UpdateResponse {
    Error(UpdatePurchaseOrderLineError),
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
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let mut user_has_permission = false;
    if input.adjusted_number_of_units.is_some() {
        user_has_permission = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::AuthorisePurchaseOrder,
                store_id: Some(store_id.to_string()),
            },
        )
        .is_ok();
    }

    map_response(
        service_provider
            .purchase_order_line_service
            .update_purchase_order_line(
                &service_context,
                store_id,
                input.to_domain(),
                Some(user_has_permission),
            ),
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
        ServiceError::PurchaseOrderLineNotFound => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::PurchaseOrderLineNotFound(PurchaseOrderLineNotFound),
            }))
        }
        ServiceError::UpdatedLineDoesNotExist => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::UpdatedLineDoesNotExist(UpdatedLineDoesNotExist),
            }))
        }
        ServiceError::PurchaseOrderDoesNotExist => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::PurchaseOrderDoesNotExist(PurchaseOrderDoesNotExist),
            }))
        }
        ServiceError::CannotEditRequestedQuantity => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::CannotEditRequestedQuantity(
                    CannotEditRequestedQuantity,
                ),
            }))
        }
        ServiceError::CannotEditAdjustedQuantity => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::CannotEditAdjustedQuantity(
                    CannotEditAdjustedQuantity,
                ),
            }))
        }
        ServiceError::CannotEditQuantityBelowReceived => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::CannotEditQuantityBelowReceived(
                    CannotEditQuantityBelowReceived,
                ),
            }))
        }
        ServiceError::CannotEditPurchaseOrder => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::CannotEditPurchaseOrder(CannotEditPurchaseOrder),
            }))
        }
        ServiceError::ItemCannotBeOrdered(line) => {
            return Ok(UpdateResponse::Error(UpdatePurchaseOrderLineError {
                error: PurchaseOrderLineError::ItemCannotBeOrdered(
                    ItemCannotBeOrdered::from_domain(line),
                ),
            }))
        }
        // TODO return these as structured errors? Or leave as is
        ServiceError::PackSizeCodeCombinationExists(_pack_size_code_combination) => {
            BadUserInput(formatted_error)
        }
        ServiceError::ItemDoesNotExist
        | ServiceError::CannotChangeStatus
        | ServiceError::CannotEditPurchaseOrderLine => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

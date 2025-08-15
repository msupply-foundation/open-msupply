use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    standard_graphql_error::{
        validate_auth,
        StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus};
use serde::Serialize;

use service::{
    auth::{Resource, ResourceAccessRequest},
    goods_received::{
        create_goods_received_shipment::CreateGoodsReceivedShipmentError,
        update::{
            UpdateGoodsReceivedError as ServiceError, UpdateGoodsReceivedInput as ServiceInput,
        },
    },
    NullableUpdate,
};

use crate::mutations::errors::{GoodsReceivedEmpty, PurchaseOrderNotFinalised};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GoodsReceivedNodeType {
    New,
    Finalised,
}

impl GoodsReceivedNodeType {
    pub fn from_domain(domain_type: &GoodsReceivedStatus) -> Self {
        match domain_type {
            GoodsReceivedStatus::New => GoodsReceivedNodeType::New,
            GoodsReceivedStatus::Finalised => GoodsReceivedNodeType::Finalised,
        }
    }

    pub fn to_domain(self) -> GoodsReceivedStatus {
        match self {
            GoodsReceivedNodeType::New => GoodsReceivedStatus::New,
            GoodsReceivedNodeType::Finalised => GoodsReceivedStatus::Finalised,
        }
    }
}

#[derive(InputObject)]
#[graphql(name = "UpdateGoodsReceivedInput")]
pub struct UpdateInput {
    pub id: String,
    pub status: Option<GoodsReceivedNodeType>,
    pub received_date: Option<NullableUpdateInput<NaiveDate>>,
    pub comment: Option<String>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            status,
            received_date,
            comment,
        } = self;

        ServiceInput {
            id,
            status: status.map(GoodsReceivedNodeType::to_domain),
            received_date: received_date.map(|r| NullableUpdate { value: r.value }),
            comment,
        }
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "&str"))]
pub enum GoodsReceivedError {
    GoodsReceivedEmpty(GoodsReceivedEmpty),
    PurchaseOrderNotFinalised(PurchaseOrderNotFinalised),
}

#[derive(SimpleObject)]
pub struct UpdateGoodsReceivedError {
    pub error: GoodsReceivedError,
}

#[derive(Union)]
#[graphql(name = "UpdateGoodsReceivedResponse")]
pub enum UpdateResponse {
    Error(UpdateGoodsReceivedError),
    Response(IdResponse),
}

pub fn update_goods_received(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .goods_received_service
            .update_goods_received(&service_context, input.to_domain()),
    )
}

fn map_response(from: Result<GoodsReceivedRow, ServiceError>) -> Result<UpdateResponse> {
    match from {
        Ok(goods_received) => Ok(UpdateResponse::Response(IdResponse(goods_received.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // TODO destructure these appropriately if need be?

        // TODO structured errors:
        ServiceError::ErrorCreatingShipment(
            CreateGoodsReceivedShipmentError::GoodsReceivedEmpty,
        ) => {
            return Ok(UpdateResponse::Error(UpdateGoodsReceivedError {
                error: GoodsReceivedError::GoodsReceivedEmpty(GoodsReceivedEmpty),
            }))
        }

        ServiceError::ErrorCreatingShipment(
            CreateGoodsReceivedShipmentError::PurchaseOrderNotFinalised,
        ) => {
            return Ok(UpdateResponse::Error(UpdateGoodsReceivedError {
                error: GoodsReceivedError::PurchaseOrderNotFinalised(PurchaseOrderNotFinalised),
            }))
        }

        ServiceError::ErrorCreatingShipment(_) => BadUserInput(formatted_error),
        // unstructured errors:
        ServiceError::GoodsReceivedDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) | ServiceError::UpdatedRecordNotFound => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

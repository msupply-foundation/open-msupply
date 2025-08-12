use async_graphql::*;
use graphql_core::simple_generic_errors::{CannotEditGoodsReceived, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::InternalError;
use graphql_core::ContextExt;
use graphql_types::types::IdResponse;
use repository::GoodsReceivedLineRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::goods_received_line::insert::{
    InsertGoodsReceivedLineError as ServiceError, InsertGoodsReceivedLineInput as ServiceInput,
};

use crate::mutations::errors::GoodsReceivedLineWithIdExists;

#[derive(InputObject)]
#[graphql(name = "InsertGoodsReceivedLineInput")]
pub struct InsertInput {
    pub id: String,
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            goods_received_id,
            purchase_order_line_id,
        } = self;

        ServiceInput {
            id,
            goods_received_id,
            purchase_order_line_id,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertGoodsReceivedLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Interface)]
#[graphql(name = "InsertGoodsReceivedLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    GoodsReceivedDoesNotExist(ForeignKeyError),
    CannotEditGoodsReceived(CannotEditGoodsReceived),
    GoodsReceivedLineWithIdExists(GoodsReceivedLineWithIdExists),
}

#[derive(Union)]
#[graphql(name = "InsertGoodsReceivedLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(IdResponse),
}

pub fn insert_goods_received_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .goods_received_line_service
            .insert_goods_received_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<GoodsReceivedLineRow, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(goods_received_line) => {
            InsertResponse::Response(IdResponse(goods_received_line.id.to_owned()))
        }
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };
    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::GoodsReceivedDoesNotExist => {
            return Ok(InsertErrorInterface::GoodsReceivedDoesNotExist(
                ForeignKeyError(ForeignKey::GoodsReceivedId),
            ));
        }
        ServiceError::GoodsReceivedLineAlreadyExists => {
            return Ok(InsertErrorInterface::GoodsReceivedLineWithIdExists(
                GoodsReceivedLineWithIdExists {},
            ));
        }
        ServiceError::CannotEditGoodsReceived => {
            return Ok(InsertErrorInterface::CannotEditGoodsReceived(
                CannotEditGoodsReceived {},
            ))
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

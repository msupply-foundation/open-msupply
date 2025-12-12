use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::simple_generic_errors::{CannotEditGoodsReceived, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::InternalError;
use graphql_core::ContextExt;
use graphql_types::types::IdResponse;
use repository::GoodsReceivedLineRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::goods_received_line::insert::{
    InsertGoodsReceivedLineError as ServiceError, InsertGoodsReceivedLineInput as ServiceInput,
    InsertGoodsReceivedLinesError as ServiceLinesError,
    InsertGoodsReceivedLinesFromPurchaseOrderInput as ServiceLinesInput,
};

use crate::mutations::errors::{
    GoodsReceivedLineWithIdExists, PurchaseOrderLineDoesNotExist, PurchaseOrderNotFound,
};

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
    PurchaseOrderLineDoesNotExist(PurchaseOrderLineDoesNotExist),
}

// Insert Goods Received Line
#[derive(InputObject)]
#[graphql(name = "InsertGoodsReceivedLineInput")]
pub struct InsertInput {
    pub id: String,
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs_received: Option<f64>,
    pub received_pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub comment: Option<String>,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            goods_received_id,
            purchase_order_line_id,
            batch,
            expiry_date,
            number_of_packs_received,
            received_pack_size,
            manufacturer_id,
            comment,
        } = self;

        ServiceInput {
            id,
            goods_received_id,
            purchase_order_line_id,
            batch,
            expiry_date,
            number_of_packs_received,
            received_pack_size,
            manufacturer_id,
            comment,
        }
    }
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
            resource: Resource::MutateGoodsReceived,
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
            InsertResponse::Response(IdResponse(goods_received_line.id.to_string()))
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
        ServiceError::PurchaseOrderLineDoesNotExist => {
            return Ok(InsertErrorInterface::PurchaseOrderLineDoesNotExist(
                PurchaseOrderLineDoesNotExist {},
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

// Insert Lines from Purchase Order
#[derive(SimpleObject)]
#[graphql(name = "InsertGoodsReceivedLinesError")]
pub struct InsertLinesError {
    pub error: InsertLinesErrorInterface,
}

#[derive(Interface)]
#[graphql(name = "InsertGoodsReceivedLinesErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertLinesErrorInterface {
    GoodsReceivedDoesNotExist(ForeignKeyError),
    PurchaseOrderNotFound(PurchaseOrderNotFound),
    CannotEditGoodsReceived(CannotEditGoodsReceived),
}
#[derive(InputObject)]
#[graphql(name = "InsertGoodsReceivedLinesFromPurchaseOrderInput")]
pub struct InsertLinesInput {
    pub goods_received_id: String,
    pub purchase_order_id: String,
}

impl InsertLinesInput {
    pub fn to_domain(self) -> ServiceLinesInput {
        let InsertLinesInput {
            goods_received_id,
            purchase_order_id,
        } = self;

        ServiceLinesInput {
            goods_received_id,
            purchase_order_id,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertLinesFromPurchaseOrderResponseNode")]
pub struct InsertLinesResponseNode {
    pub ids: Vec<String>,
}

#[derive(Union)]
#[graphql(name = "InsertLinesFromPurchaseOrderResponse")]
pub enum InsertLinesResponse {
    Error(InsertLinesError),
    Response(InsertLinesResponseNode),
}

pub fn insert_goods_received_lines_from_purchase_order(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertLinesInput,
) -> Result<InsertLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_lines_response(
        service_provider
            .goods_received_line_service
            .insert_goods_received_lines_from_purchase_order(&service_context, input.to_domain()),
    )
}

pub fn map_lines_response(
    from: Result<Vec<GoodsReceivedLineRow>, ServiceLinesError>,
) -> Result<InsertLinesResponse> {
    let result = match from {
        Ok(goods_received_lines) => {
            let ids = goods_received_lines
                .into_iter()
                .map(|line| line.id)
                .collect();
            InsertLinesResponse::Response(InsertLinesResponseNode { ids })
        }
        Err(error) => InsertLinesResponse::Error(InsertLinesError {
            error: map_lines_error(error)?,
        }),
    };
    Ok(result)
}

pub fn map_lines_error(error: ServiceLinesError) -> Result<InsertLinesErrorInterface> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceLinesError::GoodsReceivedDoesNotExist => {
            return Ok(InsertLinesErrorInterface::GoodsReceivedDoesNotExist(
                ForeignKeyError(ForeignKey::GoodsReceivedId),
            ));
        }
        ServiceLinesError::PurchaseOrderNotFound => {
            return Ok(InsertLinesErrorInterface::PurchaseOrderNotFound(
                PurchaseOrderNotFound {},
            ));
        }
        ServiceLinesError::CannotEditGoodsReceived => {
            return Ok(InsertLinesErrorInterface::CannotEditGoodsReceived(
                CannotEditGoodsReceived {},
            ))
        }
        ServiceLinesError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::simple_generic_errors::{CannotEditPurchaseOrder, ForeignKey, ForeignKeyError};
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::ContextExt;
use graphql_types::types::IdResponse;
use repository::PurchaseOrderLineRow;
use service::auth::{Resource, ResourceAccessRequest};
use service::purchase_order_line::insert::{
    InsertPurchaseOrderLineError as ServiceError, InsertPurchaseOrderLineInput as ServiceInput,
    PackSizeCodeCombination,
};

use crate::mutations::errors::{
    CannnotFindItemByCode, PackSizeCodeCombinationExists, PurchaseOrderLineWithIdExists,
};

#[derive(InputObject)]
#[graphql(name = "InsertPurchaseOrderLineInput")]
pub struct InsertInput {
    pub id: String,
    pub purchase_order_id: String,
    pub item_id: String,
    pub requested_pack_size: Option<f64>,
    pub requested_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            purchase_order_id,
            item_id,
            requested_pack_size,
            requested_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
        } = self;

        ServiceInput {
            id,
            purchase_order_id,
            item_id,
            requested_pack_size,
            requested_number_of_units,
            requested_delivery_date,
            expected_delivery_date,
        }
    }
}

#[derive(Interface)]
#[graphql(name = "InsertPurchaseOrderLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    PurchaseOrderDoesNotExist(ForeignKeyError),
    CannotEditPurchaseOrder(CannotEditPurchaseOrder),
    PurchaseOrderLineWithIdExists(PurchaseOrderLineWithIdExists),
    PackSizeCodeCombinationExists(PackSizeCodeCombinationExists),
    CannotFindItemByCode(CannnotFindItemByCode),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertPurchaseOrderLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Interface)]
#[graphql(name = "InsertPurchaseOrderLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    PurchaseOrderDoesNotExist(ForeignKeyError),
    CannotEditPurchaseOrder(CannotEditPurchaseOrder),
    PurchaseOrderLineWithIdExists(PurchaseOrderLineWithIdExists),
    PackSizeCodeCombinationExists(PackSizeCodeCombinationExists),
    CannotFindItemByCode(CannnotFindItemByCode),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertPurchaseOrderLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertPurchaseOrderLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(IdResponse),
}

pub fn insert_purchase_order_line(
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
            .purchase_order_line_service
            .insert_purchase_order_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<PurchaseOrderLineRow, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(purchase_order_line) => {
            InsertResponse::Response(IdResponse::from_domain(purchase_order_line))
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
        ServiceError::PurchaseOrderDoesNotExist => {
            return Ok(InsertErrorInterface::PurchaseOrderDoesNotExist(
                ForeignKeyError(ForeignKey::PurchaseOrderId),
            ));
        }
        ServiceError::CannotEditPurchaseOrder => {
            return Ok(InsertErrorInterface::CannotEditPurchaseOrder(
                CannotEditPurchaseOrder {},
            ));
        }
        ServiceError::PurchaseOrderLineAlreadyExists => {
            return Ok(InsertErrorInterface::PurchaseOrderLineWithIdExists(
                PurchaseOrderLineWithIdExists {},
            ));
        }
        ServiceError::PackSizeCodeCombinationExists(PackSizeCodeCombination {
            item_code,
            requested_pack_size,
        }) => {
            return Ok(InsertErrorInterface::PackSizeCodeCombinationExists(
                PackSizeCodeCombinationExists {
                    item_code,
                    requested_pack_size,
                },
            ));
        }
        ServiceError::CannotFindItemByCode(_) => {
            return Ok(InsertErrorInterface::CannotFindItemByCode(
                CannnotFindItemByCode {},
            ));
        }
        ServiceError::ItemDoesNotExist | ServiceError::IncorrectStoreId => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

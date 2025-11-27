use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::{CannotEditGoodsReceived, DatabaseError, ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError::InternalError},
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::GoodsReceivedLineRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    goods_received_line::update::{
        UpdateGoodsReceivedLineError as ServiceError, UpdateGoodsReceivedLineInput as ServiceInput,
    },
};

use crate::mutations::errors::GoodsReceivedLineNotFound;

#[derive(SimpleObject)]
#[graphql(name = "UpdateGoodsReceivedLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Interface)]
#[graphql(name = "UpdateGoodsReceivedLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    GoodsReceivedDoesNotExist(ForeignKeyError),
    GoodsReceivedLineNotFound(GoodsReceivedLineNotFound),
    CannotEditGoodsReceived(CannotEditGoodsReceived),
    DatabaseError(DatabaseError),
}

#[derive(InputObject)]
#[graphql(name = "UpdateGoodsReceivedLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs_received: Option<f64>,
    pub received_pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub comment: Option<String>,
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            batch,
            expiry_date,
            number_of_packs_received,
            received_pack_size,
            manufacturer_id,
            comment,
        } = self;

        ServiceInput {
            id,
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
#[graphql(name = "UpdateGoodsReceivedLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(IdResponse),
}

pub fn update_goods_received_line(
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
            .goods_received_line_service
            .update_goods_received_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<GoodsReceivedLineRow, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(goods_received_line) => {
            UpdateResponse::Response(IdResponse(goods_received_line.id.to_string()))
        }
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };
    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    let formattted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::GoodsReceivedDoesNotExist => {
            return Ok(UpdateErrorInterface::GoodsReceivedDoesNotExist(
                ForeignKeyError(ForeignKey::GoodsReceivedId),
            ));
        }
        ServiceError::GoodsReceivedLineDoesNotExist => {
            return Ok(UpdateErrorInterface::GoodsReceivedLineNotFound(
                GoodsReceivedLineNotFound {},
            ));
        }
        ServiceError::CannotEditGoodsReceived => {
            return Ok(UpdateErrorInterface::CannotEditGoodsReceived(
                CannotEditGoodsReceived {},
            ));
        }
        ServiceError::DatabaseError(_) => InternalError(formattted_error),
    };

    Err(graphql_error.extend())
}

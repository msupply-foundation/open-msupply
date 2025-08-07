use async_graphql::*;
// use chrono::{NaiveDate, NaiveDateTime};
use graphql_core::{
    // generic_inputs::NullableUpdateInput,
    standard_graphql_error::{
        validate_auth,
        // StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::types::IdResponse;
// use repository::{GoodsReceivedRow, GoodsReceivedStatus};
use serde::Serialize;

use service::{
    auth::{Resource, ResourceAccessRequest},
    // goods_received::update::{
    //     UpdateGoodsReceivedError as ServiceError, UpdateGoodsReceivedInput as ServiceInput,
    // },
};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GoodsReceivedNodeType {
    New,
    Finalised,
}

// impl GoodsReceivedNodeType {
//     pub fn from_domain(domain_type: &GoodsReceivedStatus) -> Self {
//         match domain_type {
//             GoodsReceivedStatus::New => GoodsReceivedNodeType::New,
//             GoodsReceivedStatus::Finalised => GoodsReceivedNodeType::Finalised,
//         }
//     }

//     pub fn to_domain(self) -> GoodsReceivedStatus {
//         match self {
//             GoodsReceivedNodeType::New => GoodsReceivedStatus::New,
//             GoodsReceivedNodeType::Finalised => GoodsReceivedStatus::Finalised,
//         }
//     }
// }

#[derive(InputObject)]
#[graphql(name = "UpdateGoodsReceivedInput")]
pub struct UpdateInput {
    pub id: String,
    pub status: Option<GoodsReceivedNodeType>,
    pub comment: Option<String>,
}

// impl UpdateInput {
//     pub fn to_domain(self) -> ServiceInput {
//         let UpdateInput {
//             id,
//             status,
//             comment,
//         } = self;

//         ServiceInput {
//             id,
//             status: status.map(GoodsReceivedNodeType::to_domain),
//             comment,
//         }
//     }
// }

#[derive(Union)]
#[graphql(name = "UpdateGoodsReceivedResponse")]
pub enum UpdateResponse {
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
    );

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user?.user_id)?;

    // map_response(
    //     service_provider
    //         .goods_received_service
    //         .update_goods_received(&service_context, store_id, input.to_domain()),
    // )
    Ok(UpdateResponse::Response(IdResponse(
        "NOTIMPLEMENTED".to_string(),
    )))
}

// fn map_response(from: Result<GoodsReceivedRow, ServiceError>) -> Result<UpdateResponse> {
//     match from {
//         Ok(goods_received) => Ok(UpdateResponse::Response(IdResponse(goods_received.id))),
//         Err(error) => map_error(error),
//     }
// }

// fn map_error(error: ServiceError) -> Result<UpdateResponse> {
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         ServiceError::SupplierDoesNotExist
//         | ServiceError::UpdatedRecordNotFound
//         | ServiceError::NotASupplier => BadUserInput(formatted_error),
//         ServiceError::DatabaseError(_) => InternalError(formatted_error),
//     };

//     Err(graphql_error.extend())
// }

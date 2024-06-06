use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::BarcodeNode;
use repository::barcode::Barcode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    barcode::InsertBarcodeError as ServiceError,
};
#[derive(InputObject)]
#[graphql(name = "InsertBarcodeInput")]
pub struct BarcodeInput {
    pub gtin: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
}

#[derive(Union)]
#[graphql(name = "InsertBarcodeResponse")]
pub enum InsertResponse {
    Response(BarcodeNode),
}

#[derive(SimpleObject)]
pub struct InsertBarcodeError {
    pub error: String,
}

impl BarcodeInput {
    pub fn to_domain(&self) -> service::barcode::BarcodeInput {
        service::barcode::BarcodeInput {
            gtin: self.gtin.clone(),
            item_id: self.item_id.clone(),
            pack_size: self.pack_size,
        }
    }
}

pub fn insert_barcode(
    ctx: &Context<'_>,
    store_id: &str,
    input: BarcodeInput,
) -> Result<InsertResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItems,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    map_response(
        service_provider
            .barcode_service
            .upsert_barcode(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Barcode, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(result) => Ok(InsertResponse::Response(BarcodeNode::from_domain(result))),
        Err(error) => {
            use StandardGraphqlError::*;
            let formatted_error = format!("{:#?}", error);

            let graphql_error = match error {
                ServiceError::InternalError(err) => InternalError(err),
                ServiceError::DatabaseError(_) => InternalError(formatted_error),
                ServiceError::InvalidItem => BadUserInput(formatted_error),
            };

            Err(graphql_error.extend())
        }
    }
}

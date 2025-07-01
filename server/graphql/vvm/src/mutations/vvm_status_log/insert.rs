use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError};
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::VVMStatusLogNode;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use service::{
    auth::{Resource, ResourceAccessRequest},
    vvm::vvm_status_log::insert::{
        InsertVVMStatusLogError as ServiceError, InsertVVMStatusLogInput as ServiceInput,
    },
};

#[derive(InputObject)]
#[graphql(name = "InsertVVMStatusLogInput")]
pub struct InsertInput {
    pub id: String,
    pub status_id: String,
    pub stock_line_id: String,
    pub comment: Option<String>,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            status_id,
            stock_line_id,
            comment,
        } = self;

        ServiceInput {
            id,
            status_id,
            stock_line_id,
            comment,
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertVVMStatusLogResponse")]
pub enum InsertResponse {
    Response(VVMStatusLogNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAndMutateVvmStatus,
            store_id: Some(store_id.to_string()),
        },
    );

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user?.user_id)?;

    map_response(service_provider.vvm_service.insert_vvm_status_log(
        &service_context,
        store_id,
        input.to_domain(),
    ))
}

fn map_response(from: Result<VVMStatusLogRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(vvm_status_log) => Ok(InsertResponse::Response(VVMStatusLogNode::from_domain(
            vvm_status_log,
        ))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::VVMStatusLogAlreadyExists
        | ServiceError::VVMStatusDoesNotExist
        | ServiceError::StockLineDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

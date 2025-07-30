use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{
        validate_auth,
        StandardGraphqlError::{BadUserInput, InternalError},
    },
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use service::{
    auth::{Resource, ResourceAccessRequest},
    vvm::vvm_status_log::update::{
        UpdateVVMStatusLogError as ServiceError, UpdateVVMStatusLogInput as ServiceInput,
    },
};

#[derive(InputObject)]
pub struct UpdateVVMStatusLogInput {
    pub id: String,
    pub comment: Option<String>,
}

impl UpdateVVMStatusLogInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateVVMStatusLogInput { id, comment } = self;

        ServiceInput { id, comment }
    }
}

#[derive(Union)]
pub enum UpdateVVMStatusResponse {
    Response(IdResponse),
}

pub fn update_vvm_status_log(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateVVMStatusLogInput,
) -> Result<UpdateVVMStatusResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAndMutateVvmStatus,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .vvm_service
            .update_vvm_status_log(&service_context, input.to_domain()),
    )
}

pub fn map_response(
    from: Result<VVMStatusLogRow, ServiceError>,
) -> Result<UpdateVVMStatusResponse> {
    match from {
        Ok(vvm_status_log) => Ok(UpdateVVMStatusResponse::Response(IdResponse(
            vvm_status_log.id,
        ))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateVVMStatusResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::VVMStatusLogDoesNotExist | ServiceError::UpdatedRecordNotFound => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

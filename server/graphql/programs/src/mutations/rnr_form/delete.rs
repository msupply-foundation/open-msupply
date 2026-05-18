use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use repository::RepositoryError;
use service::{
    auth::{Resource, ResourceAccessRequest},
    rnr_form::delete::{DeleteRnRForm, DeleteRnRFormError as ServiceError},
};

#[derive(InputObject)]
pub struct DeleteRnRFormInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteRnRFormResponse {
    Response(GenericDeleteResponse),
}

pub async fn delete_rnr_form(
    ctx: &Context<'_>,
    store_id: String,
    input: DeleteRnRFormInput,
) -> Result<DeleteRnRFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider_data();

    let result = tokio::task::spawn_blocking(
        move || -> Result<Result<String, ServiceError>, RepositoryError> {
            let service_context = service_provider.context(store_id.clone(), user.user_id)?;
            Ok(service_provider
                .rnr_form_service
                .delete_rnr_form(&service_context, DeleteRnRFormInput::to_domain(input)))
        },
    )
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
        Ok(id) => Ok(DeleteRnRFormResponse::Response(GenericDeleteResponse(id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<DeleteRnRFormResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::RnRFormDoesNotExist
        | ServiceError::NotThisStoreRnRForm
        | ServiceError::CannotEditRnRForm => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl DeleteRnRFormInput {
    fn to_domain(DeleteRnRFormInput { id }: DeleteRnRFormInput) -> DeleteRnRForm {
        DeleteRnRForm { id }
    }
}

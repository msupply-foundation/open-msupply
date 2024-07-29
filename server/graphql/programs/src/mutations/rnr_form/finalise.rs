use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::rnr_form::RnRFormNode;
use repository::RnRForm;
use service::{
    auth::{Resource, ResourceAccessRequest},
    rnr_form::finalise::{FinaliseRnRForm, FinaliseRnRFormError as ServiceError},
};

#[derive(InputObject)]
pub struct FinaliseRnRFormInput {
    pub id: String,
}

#[derive(Union)]
pub enum FinaliseRnRFormResponse {
    Response(RnRFormNode),
}

pub fn finalise_rnr_form(
    ctx: &Context<'_>,
    store_id: String,
    input: FinaliseRnRFormInput,
) -> Result<FinaliseRnRFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    match service_provider.rnr_form_service.finalise_rnr_form(
        &service_context,
        &store_id,
        FinaliseRnRFormInput::to_domain(input),
    ) {
        Ok(RnRForm {
            rnr_form_row,
            name_row,
            store_row: _,
            period_row,
            program_row,
        }) => Ok(FinaliseRnRFormResponse::Response(RnRFormNode {
            rnr_form_row,
            program_row,
            period_row,
            supplier_row: name_row,
        })),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<FinaliseRnRFormResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::RnRFormDoesNotExist | ServiceError::RnRFormAlreadyFinalised => {
            BadUserInput(formatted_error)
        }

        ServiceError::InternalError(_)
        | ServiceError::FinalisedRnRFormDoesNotExist
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl FinaliseRnRFormInput {
    fn to_domain(FinaliseRnRFormInput { id }: FinaliseRnRFormInput) -> FinaliseRnRForm {
        FinaliseRnRForm { id }
    }
}

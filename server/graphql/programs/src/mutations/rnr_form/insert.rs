use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::rnr_form::RnRFormNode;
use repository::RnRForm;
use service::{
    auth::{Resource, ResourceAccessRequest},
    rnr_form::insert::{InsertRnRForm, InsertRnRFormError as ServiceError},
};

#[derive(InputObject)]
pub struct InsertRnRFormInput {
    pub id: String,
    pub supplier_id: String,
    pub program_id: String,
    pub period_id: String,
}

impl From<InsertRnRFormInput> for InsertRnRForm {
    fn from(
        InsertRnRFormInput {
            id,
            supplier_id,
            program_id,
            period_id,
        }: InsertRnRFormInput,
    ) -> Self {
        Self {
            id,
            supplier_id,
            program_id,
            period_id,
        }
    }
}

#[derive(Union)]
pub enum InsertRnRFormResponse {
    Response(RnRFormNode),
}

pub fn insert_rnr_form(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertRnRFormInput,
) -> Result<InsertRnRFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    match service_provider
        .rnr_form_service
        .insert_rnr_form(&service_context, input.into())
    {
        Ok(RnRForm {
            rnr_form_row,
            name_row,
            store_row: _,
            period_row,
            program_row,
        }) => Ok(InsertRnRFormResponse::Response(RnRFormNode {
            rnr_form_row,
            program_row,
            period_row,
            supplier_row: name_row,
        })),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertRnRFormResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::RnRFormAlreadyExists
        | ServiceError::SupplierDoesNotExist
        | ServiceError::SupplierNotVisible
        | ServiceError::NotASupplier
        | ServiceError::ProgramDoesNotExist
        | ServiceError::PeriodDoesNotExist
        | ServiceError::PeriodNotInProgramSchedule
        | ServiceError::RnRFormAlreadyExistsForPeriod => BadUserInput(formatted_error),

        ServiceError::InternalError(_)
        | ServiceError::NewlyCreatedRnRFormDoesNotExist
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

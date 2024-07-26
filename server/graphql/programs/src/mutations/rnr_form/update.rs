use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::rnr_form::RnRFormNode;
use repository::RnRForm;
use service::{
    auth::{Resource, ResourceAccessRequest},
    rnr_form::update::{UpdateRnRForm, UpdateRnRFormError as ServiceError, UpdateRnRFormLine},
};

#[derive(InputObject)]
pub struct UpdateRnRFormInput {
    pub id: String,
    pub lines: Vec<UpdateRnRFormLineInput>,
}

#[derive(InputObject)]
pub struct UpdateRnRFormLineInput {
    pub id: String,
    pub quantity_received: Option<f64>,
    pub quantity_consumed: Option<f64>,
    pub adjustments: Option<f64>,
    pub stock_out_duration: i32,
    pub adjusted_quantity_consumed: f64,
    pub final_balance: f64,
    pub maximum_quantity: f64,
    pub requested_quantity: f64,
    pub comment: Option<String>,
    pub confirmed: bool,
}

#[derive(Union)]
pub enum UpdateRnRFormResponse {
    Response(RnRFormNode),
}

pub fn update_rnr_form(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateRnRFormInput,
) -> Result<UpdateRnRFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRnRForms,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    match service_provider
        .rnr_form_service
        .update_rnr_form(&service_context, UpdateRnRFormInput::to_domain(input))
    {
        Ok(RnRForm {
            rnr_form_row,
            name_row,
            store_row: _,
            period_row,
            program_row,
        }) => Ok(UpdateRnRFormResponse::Response(RnRFormNode {
            rnr_form_row,
            program_row,
            period_row,
            supplier_row: name_row,
        })),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateRnRFormResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::RnRFormDoesNotExist
        | ServiceError::RnRFormAlreadyFinalised
        // Currently, all line errors _should_ be prevented in the UI
        // If that changes, will need to add structured errors here
        | ServiceError::LineError { .. } => BadUserInput(formatted_error),

        ServiceError::InternalError(_)
        | ServiceError::UpdatedRnRFormDoesNotExist
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateRnRFormInput {
    fn to_domain(UpdateRnRFormInput { id, lines }: UpdateRnRFormInput) -> UpdateRnRForm {
        UpdateRnRForm {
            id,
            lines: lines
                .into_iter()
                .map(UpdateRnRFormLineInput::to_domain)
                .collect(),
        }
    }
}

impl UpdateRnRFormLineInput {
    fn to_domain(
        UpdateRnRFormLineInput {
            id,
            quantity_received,
            quantity_consumed,
            adjustments,
            stock_out_duration,
            adjusted_quantity_consumed,
            final_balance,
            maximum_quantity,
            requested_quantity,
            comment,
            confirmed,
        }: UpdateRnRFormLineInput,
    ) -> UpdateRnRFormLine {
        UpdateRnRFormLine {
            id,
            quantity_received,
            quantity_consumed,
            adjustments,
            stock_out_duration,
            adjusted_quantity_consumed,
            final_balance,
            maximum_quantity,
            requested_quantity,
            comment,
            confirmed,
        }
    }
}

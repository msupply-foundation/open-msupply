use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::patient::PatientNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::GetOrCreateUnnamedPatientError,
};

/// The store's unnamed patient, created on the first call
/// (spec/prescriptions contract › the unnamed patient). Gated on dispensing,
/// not on creating patients: any dispenser can dispense to it. This is why
/// the server creates it rather than the front end calling `insertPatient`,
/// which needs the permission to add patients that a dispenser may not have,
/// so their first walk-in visit couldn't be saved.
pub fn get_or_create_unnamed_patient(ctx: &Context<'_>, store_id: String) -> Result<PatientNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context =
        service_provider.context(store_id.to_string(), user.user_id.to_string())?;

    match service_provider
        .patient_service
        .get_or_create_unnamed_patient(&service_context, &store_id)
    {
        Ok(patient) => Ok(PatientNode {
            store_id,
            patient,
            allowed_ctx: user.capabilities().clone(),
        }),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let std_err = match error {
                GetOrCreateUnnamedPatientError::NotUsedByStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                GetOrCreateUnnamedPatientError::PreferenceError(_)
                | GetOrCreateUnnamedPatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}

use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::PatientNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{UpdatePatientCustomFields, UpdatePatientCustomFieldsError},
};

/// Patch of patient `custom_fields` values. `customFields` must be a JSON object
/// of `key -> value`; a `null` value clears that key. Keys absent from the patch
/// are left unchanged.
#[derive(InputObject)]
pub struct UpdatePatientCustomFieldsInput {
    pub id: String,
    pub custom_fields: serde_json::Value,
}

#[derive(Union)]
pub enum UpdatePatientCustomFieldsResponse {
    Response(PatientNode),
}

pub fn update_patient_custom_fields(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdatePatientCustomFieldsInput,
) -> Result<UpdatePatientCustomFieldsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePatient,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context =
        service_provider.context(store_id.to_string(), user.user_id.to_string())?;

    // The JSON scalar must be an object (the key->value patch).
    let custom_fields = match input.custom_fields {
        serde_json::Value::Object(map) => map,
        other => {
            return Err(StandardGraphqlError::BadUserInput(format!(
                "customFields must be a JSON object, got: {other}"
            ))
            .extend())
        }
    };

    match service_provider
        .patient_service
        .update_patient_custom_fields(
            &service_context,
            service_provider,
            UpdatePatientCustomFields {
                id: input.id,
                custom_fields,
            },
        ) {
        Ok(patient) => Ok(UpdatePatientCustomFieldsResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let std_err = match error {
                UpdatePatientCustomFieldsError::PatientDoesNotExist
                | UpdatePatientCustomFieldsError::NotAPatient
                | UpdatePatientCustomFieldsError::UnknownCustomFieldKey(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientCustomFieldsError::InternalError(_)
                | UpdatePatientCustomFieldsError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}

use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::PatientNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{UpdatePatientPropertiesV2, UpdatePatientPropertiesV2Error},
};

/// Patch of patient `properties_v2` values. `propertiesV2` must be a JSON object
/// of `key -> value`; a `null` value clears that key. Keys absent from the patch
/// are left unchanged.
#[derive(InputObject)]
pub struct UpdatePatientPropertiesV2Input {
    pub id: String,
    pub properties_v2: serde_json::Value,
}

#[derive(Union)]
pub enum UpdatePatientPropertiesV2Response {
    Response(PatientNode),
}

pub fn update_patient_properties_v2(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdatePatientPropertiesV2Input,
) -> Result<UpdatePatientPropertiesV2Response> {
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
    let properties = match input.properties_v2 {
        serde_json::Value::Object(map) => map,
        other => {
            return Err(StandardGraphqlError::BadUserInput(format!(
                "propertiesV2 must be a JSON object, got: {other}"
            ))
            .extend())
        }
    };

    match service_provider
        .patient_service
        .update_patient_properties_v2(
            &service_context,
            service_provider,
            UpdatePatientPropertiesV2 {
                id: input.id,
                properties,
            },
        ) {
        Ok(patient) => Ok(UpdatePatientPropertiesV2Response::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let std_err = match error {
                UpdatePatientPropertiesV2Error::PatientDoesNotExist
                | UpdatePatientPropertiesV2Error::NotAPatient
                | UpdatePatientPropertiesV2Error::UnknownPropertyKey(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientPropertiesV2Error::InternalError(_)
                | UpdatePatientPropertiesV2Error::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}

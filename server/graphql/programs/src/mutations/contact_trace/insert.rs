use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::contact_trace::ContactTraceNode;
use repository::{contact_trace::ContactTraceFilter, StringFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::contact_trace::upsert::{UpsertContactTrace, UpsertContactTraceError},
};

#[derive(InputObject)]
pub struct InsertContactTraceInput {
    /// The patient ID the contact belongs to
    pub patient_id: String,
    /// The contact trace document type
    pub r#type: String,
    /// Contact trace document data
    pub data: serde_json::Value,
    /// The schema id used for the encounter data
    pub schema_id: String,
}

#[derive(Union)]
pub enum InsertContactTraceResponse {
    Response(ContactTraceNode),
}

pub fn insert_contact_trace(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertContactTraceInput,
) -> Result<InsertContactTraceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateContactTrace,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let InsertContactTraceInput {
        r#type,
        patient_id,
        data,
        schema_id,
    } = input;
    let document = match service_provider.contact_trace_service.upsert_contact_trace(
        &service_context,
        service_provider,
        &user.user_id,
        UpsertContactTrace {
            r#type,
            data,
            patient_id,
            schema_id,
            parent: None,
        },
        allowed_ctx.clone(),
    ) {
        Ok(document) => document,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpsertContactTraceError::NotAllowedToMutateDocument => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                UpsertContactTraceError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertContactTraceError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertContactTraceError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpsertContactTraceError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpsertContactTraceError::InvalidPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertContactTraceError::InvalidContactPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertContactTraceError::InvalidParentId => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpsertContactTraceError::DocumentTypeDoesNotExit => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            return Err(std_err.extend());
        }
    };

    let row = service_provider
        .contact_trace_service
        .contact_trace(
            &service_context,
            ContactTraceFilter {
                document_name: Some(StringFilter::equal_to(&document.name)),
                ..Default::default()
            },
            allowed_ctx.clone(),
        )?
        .ok_or(
            StandardGraphqlError::InternalError("Contact trace went missing".to_string()).extend(),
        )?;

    Ok(InsertContactTraceResponse::Response(ContactTraceNode {
        store_id,
        contact_trace: row,
        allowed_ctx: allowed_ctx.clone(),
    }))
}

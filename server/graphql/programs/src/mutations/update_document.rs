use async_graphql::*;
use chrono::{DateTime, Utc};
use repository::{
    DocumentContext, DocumentRegistryFilter, DocumentRegistryRepository, DocumentStatus,
    EqualFilter, StorageConnection,
};
use service::{
    auth::{CapabilityTag, Resource, ResourceAccessRequest},
    document::{document_service::DocumentInsertError, raw_document::RawDocument},
    programs::patient::PATIENT_TYPE,
};

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use crate::types::document::{DocumentNode, RawDocumentNode};

#[derive(InputObject)]
pub struct UpdateDocumentInput {
    pub name: String,
    pub parents: Vec<String>,
    pub author: String,
    pub timestamp: DateTime<Utc>,
    pub r#type: String,
    pub data: serde_json::Value,
    pub schema_id: Option<String>,
    pub patient_id: Option<String>,
}

pub struct MergeRequiredError(Option<RawDocument>);
#[Object]
impl MergeRequiredError {
    pub async fn description(&self) -> &'static str {
        "Merge required"
    }

    pub async fn auto_merge(&self) -> Option<RawDocumentNode> {
        self.0.as_ref().map(|document| RawDocumentNode {
            document: document.clone(),
        })
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateDocumentErrorInterface {
    MergeRequired(MergeRequiredError),
}

#[derive(SimpleObject)]
pub struct UpdateDocumentError {
    pub error: UpdateDocumentErrorInterface,
}

#[derive(Union)]
pub enum UpdateDocumentResponse {
    Error(UpdateDocumentError),
    Response(DocumentNode),
}

pub fn update_document(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateDocumentInput,
) -> Result<UpdateDocumentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateDocument,
            store_id: Some(store_id),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;
    validate_document_type(&context.connection, &input)?;

    // Move this after validate_document_type to make the tests happy (test don't have permissions)
    // TODO make allowed_docs optional if debug_no_access_control is set?
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let response = match service_provider.document_service.update_document(
        &context,
        input_to_raw_document(input),
        allowed_docs,
    ) {
        Ok(document) => UpdateDocumentResponse::Response(DocumentNode {
            allowed_docs: allowed_docs.clone(),
            document,
        }),
        Err(error) => UpdateDocumentResponse::Error(UpdateDocumentError {
            error: map_error(error)?,
        }),
    };
    Ok(response)
}

/// Check that the document is allowed to be updated through this endpoint or if a special endpoint
/// should be used
fn validate_document_type(
    connection: &StorageConnection,
    input: &UpdateDocumentInput,
) -> Result<()> {
    if input.r#type == PATIENT_TYPE {
        return Err(StandardGraphqlError::BadUserInput(
            "Patients need to be updated through the matching endpoint".to_string(),
        )
        .extend());
    }

    let entries = DocumentRegistryRepository::new(connection).query_by_filter(
        DocumentRegistryFilter::new().document_type(EqualFilter::equal_to(&input.r#type)),
    )?;
    for entry in entries {
        match entry.context {
            DocumentContext::Program => {
                return Err(StandardGraphqlError::BadUserInput(
                    "Programs need to be updated through the matching endpoint".to_string(),
                )
                .extend())
            }
            DocumentContext::Encounter => {
                return Err(StandardGraphqlError::BadUserInput(
                    "Encounters need to be updated through the matching endpoint".to_string(),
                )
                .extend())
            }
            _ => {}
        }
    }
    Ok(())
}

fn map_error(error: DocumentInsertError) -> Result<UpdateDocumentErrorInterface> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        DocumentInsertError::NotAllowedToMutateDocument => {
            StandardGraphqlError::Forbidden(formatted_error)
        }
        DocumentInsertError::DatabaseError(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
        DocumentInsertError::InvalidDataSchema(_) => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
        DocumentInsertError::InternalError(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
        DocumentInsertError::DataSchemaDoesNotExist => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
        DocumentInsertError::InvalidParent(_) => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

fn input_to_raw_document(
    UpdateDocumentInput {
        name,
        parents,
        author,
        timestamp,
        r#type,
        data,
        schema_id,
        patient_id,
    }: UpdateDocumentInput,
) -> RawDocument {
    RawDocument {
        name,
        parents,
        author,
        timestamp,
        r#type: r#type.clone(),
        data,
        schema_id,
        status: DocumentStatus::Active,
        comment: None,
        owner: patient_id,
        context: Some(r#type),
    }
}

#[cfg(test)]
mod graphql {
    use graphql_core::assert_standard_graphql_error;
    use graphql_core::test_helpers::setup_graphl_test;

    use repository::{
        mock::{mock_form_schema_empty, MockDataInserts},
        DocumentContext, DocumentRegistryRow, DocumentRegistryRowRepository,
        FormSchemaRowRepository,
    };
    use serde_json::json;

    use crate::{ProgramsMutations, ProgramsQueries};

    #[actix_rt::test]
    async fn test_patient_update_not_allowed() {
        let (_, _, _, settings) = setup_graphl_test(
            ProgramsQueries,
            ProgramsMutations,
            "test_patient_update_not_allowed",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let query = r#"mutation MyMutation($data: JSON!, $storeId: String!) {
            updateDocument(input: {
                name: \"test_doc\", parents: [], author: \"me\", timestamp: \"2022-07-21T22:34:45.963Z\",
                data: $data, type: \"Patient\" }, storeId: $storeId) {
              ... on DocumentNode {
                id
                name
                type
              }
            }
          }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "data": { "some": "data" }
        }));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            Some(json!({ "details": "Patients need to be updated through the matching endpoint" })),
            None
        );
    }

    #[actix_rt::test]
    async fn test_program_update_not_allowed() {
        let (_, con, _, settings) = setup_graphl_test(
            ProgramsQueries,
            ProgramsMutations,
            "test_program_update_not_allowed",
            MockDataInserts::none()
                .names()
                .stores()
                .user_permissions()
                .user_accounts(),
        )
        .await;

        let schema = mock_form_schema_empty();
        FormSchemaRowRepository::new(&con)
            .upsert_one(&schema)
            .unwrap();
        DocumentRegistryRowRepository::new(&con)
            .upsert_one(&DocumentRegistryRow {
                id: "someid".to_string(),
                document_type: "TestProgram".to_string(),
                context: DocumentContext::Program,
                name: None,
                parent_id: None,
                form_schema_id: Some(schema.id),
            })
            .unwrap();
        let query = r#"mutation MyMutation($data: JSON!, $storeId: String!) {
            updateDocument(input: {
                name: \"test_doc\", parents: [], author: \"me\", timestamp: \"2022-07-21T22:34:45.963Z\",
                data: $data, type: \"TestProgram\" }, storeId: $storeId) {
              ... on DocumentNode {
                id
                name
                type
              }
            }
          }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "data": { "some": "data" }
        }));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            Some(json!({ "details": "Programs need to be updated through the matching endpoint" })),
            None
        );
    }

    #[actix_rt::test]
    async fn test_encounter_update_not_allowed() {
        let (_, con, _, settings) = setup_graphl_test(
            ProgramsQueries,
            ProgramsMutations,
            "test_encounter_update_not_allowed",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let schema = mock_form_schema_empty();
        FormSchemaRowRepository::new(&con)
            .upsert_one(&schema)
            .unwrap();
        DocumentRegistryRowRepository::new(&con)
            .upsert_one(&DocumentRegistryRow {
                id: "someid".to_string(),
                document_type: "TestEncounter".to_string(),
                context: DocumentContext::Encounter,
                name: None,
                parent_id: None,
                form_schema_id: Some(schema.id),
            })
            .unwrap();
        let query = r#"mutation MyMutation($data: JSON!, $storeId: String!) {
            updateDocument(input: {
                name: \"test_doc\", parents: [], author: \"me\", timestamp: \"2022-07-21T22:34:45.963Z\",
                data: $data, type: \"TestEncounter\" }, storeId: $storeId) {
              ... on DocumentNode {
                id
                name
                type
              }
            }
          }"#;

        let variables = Some(json!({
            "storeId": "store_a",
            "data": { "some": "data" }
        }));

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &variables,
            &expected_message,
            Some(
                json!({ "details": "Encounters need to be updated through the matching endpoint" })
            ),
            None
        );
    }
}

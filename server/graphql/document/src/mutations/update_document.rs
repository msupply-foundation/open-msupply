use async_graphql::*;
use chrono::{DateTime, Utc};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::{
        document_service::DocumentInsertError, patient::PATIENT_TYPE, raw_document::RawDocument,
    },
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
    store_id: &str,
    input: UpdateDocumentInput,
) -> Result<UpdateDocumentResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateDocument,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    validate_document_type(&input)?;

    let response = match service_provider.document_service.update_document(
        &context,
        store_id,
        input_to_raw_document(input),
    ) {
        Ok(document) => UpdateDocumentResponse::Response(DocumentNode { document }),
        Err(error) => UpdateDocumentResponse::Error(UpdateDocumentError {
            error: map_error(error)?,
        }),
    };
    Ok(response)
}

/// Check that the document is allowed to be updated through this endpoint or if a special endpoint
/// should be used
fn validate_document_type(input: &UpdateDocumentInput) -> Result<()> {
    if input.r#type == PATIENT_TYPE {
        return Err(StandardGraphqlError::BadUserInput(
            "Patient need to be update through the patient endpoint".to_string(),
        )
        .extend());
    }
    Ok(())
}

fn map_error(error: DocumentInsertError) -> Result<UpdateDocumentErrorInterface> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        DocumentInsertError::MergeRequired(auto_merge) => {
            return Ok(UpdateDocumentErrorInterface::MergeRequired(
                MergeRequiredError(auto_merge),
            ))
        }
        // Standard Graphql Errors
        DocumentInsertError::DatabaseError(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
        DocumentInsertError::InvalidDataSchema(_) => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
        DocumentInsertError::InvalidDocumentHistory => {
            StandardGraphqlError::InternalError(formatted_error)
        }
        DocumentInsertError::InternalError(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
        DocumentInsertError::SchemaDoesNotExist => {
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
    }: UpdateDocumentInput,
) -> RawDocument {
    RawDocument {
        name,
        parents,
        author,
        timestamp,
        r#type,
        data,
        schema_id,
    }
}

#[cfg(test)]
mod graphql {
    use graphql_core::assert_standard_graphql_error;
    use graphql_core::test_helpers::setup_graphl_test;

    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::{DocumentMutations, DocumentQueries};

    #[actix_rt::test]
    async fn test_patient_update_not_allowed() {
        let (_, _, _, settings) = setup_graphl_test(
            DocumentQueries,
            DocumentMutations,
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
            None,
            None
        );
    }
}

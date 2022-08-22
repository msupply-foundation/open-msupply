#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use repository::{DocumentContext, DocumentRegistry, FormSchema, FormSchemaRowRepository};
    use serde_json::json;

    use crate::document::document_registry::insert::{
        InsertDocRegistryError, InsertDocumentRegistry,
    };
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn insert_document_registry_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_document_registry_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.document_registry_service;

        // InsertDocRegistryError::DataSchemaDoesNotExist
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "id".to_string(),
                    parent_id: None,
                    document_type: "MyDocType".to_string(),
                    context: DocumentContext::Patient,
                    name: None,
                    form_schema_id: "invalid".to_string(),
                }
            ),
            Err(InsertDocRegistryError::DataSchemaDoesNotExist)
        );

        // InsertDocRegistryError::InvalidParent
        FormSchemaRowRepository::new(&context.connection)
            .upsert_one(&FormSchema {
                id: "schema1".to_string(),
                r#type: "type".to_string(),
                json_schema: json!({}),
                ui_schema: json!({}),
            })
            .unwrap();
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "id".to_string(),
                    parent_id: Some("invalid".to_string()),
                    document_type: "MyDocType".to_string(),
                    context: DocumentContext::Patient,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                }
            ),
            Err(InsertDocRegistryError::InvalidParent)
        );

        // success 1
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "program1".to_string(),
                    parent_id: None,
                    document_type: "MyProgram".to_string(),
                    context: DocumentContext::Program,
                    name: Some("name".to_string()),
                    form_schema_id: "schema1".to_string(),
                }
            ),
            Ok(DocumentRegistry {
                id: "program1".to_string(),
                parent_id: None,
                document_type: "MyProgram".to_string(),
                context: DocumentContext::Program,
                name: Some("name".to_string()),
                form_schema_id: "schema1".to_string(),
                json_schema: json!({}),
                ui_schema_type: "type".to_string(),
                ui_schema: json!({}),
            })
        );

        // success 2
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "encounter1".to_string(),
                    parent_id: Some("program1".to_string()),
                    document_type: "MyEncounter".to_string(),
                    context: DocumentContext::Encounter,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                }
            ),
            Ok(DocumentRegistry {
                id: "encounter1".to_string(),
                parent_id: Some("program1".to_string()),
                document_type: "MyEncounter".to_string(),
                context: DocumentContext::Encounter,
                name: None,
                form_schema_id: "schema1".to_string(),
                json_schema: json!({}),
                ui_schema_type: "type".to_string(),
                ui_schema: json!({}),
            })
        );

        // InsertDocRegistryError::OnlyOnePatientEntryAllowed
        service
            .insert(
                &context,
                InsertDocumentRegistry {
                    id: "patient1".to_string(),
                    parent_id: None,
                    document_type: "Patient1".to_string(),
                    context: DocumentContext::Patient,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                },
            )
            .unwrap();
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "patient2".to_string(),
                    parent_id: None,
                    document_type: "Patient2".to_string(),
                    context: DocumentContext::Patient,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                }
            ),
            Err(InsertDocRegistryError::OnlyOnePatientEntryAllowed)
        );
    }
}

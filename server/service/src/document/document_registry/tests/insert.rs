#[cfg(test)]
mod tests {
    use repository::mock::context_program_a;
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use repository::{
        DocumentRegistry, DocumentRegistryCategory, FormSchema, FormSchemaRowRepository,
    };
    use serde_json::json;
    use util::constants::PATIENT_CONTEXT_ID;

    use crate::document::document_registry::insert::{
        InsertDocRegistryError, InsertDocumentRegistry,
    };
    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn insert_document_registry_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_document_registry_errors",
            MockDataInserts::none().contexts(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.document_registry_service;
        let context_id = context_program_a().id;

        // InsertDocRegistryError::NotAllowedToMutateDocument
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "id".to_string(),
                    document_type: "MyDocType".to_string(),
                    context_id: context_id.clone(),
                    category: DocumentRegistryCategory::Patient,
                    name: None,
                    form_schema_id: "invalid".to_string(),
                },
                &["WrongType".to_string()]
            ),
            Err(InsertDocRegistryError::NotAllowedToMutateDocument)
        );

        // InsertDocRegistryError::DataSchemaDoesNotExist
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "id".to_string(),
                    document_type: "MyDocType".to_string(),
                    context_id: context_id.clone(),
                    category: DocumentRegistryCategory::Patient,
                    name: None,
                    form_schema_id: "invalid".to_string(),
                },
                &[context_id.clone()]
            ),
            Err(InsertDocRegistryError::DataSchemaDoesNotExist)
        );

        // success 1
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
                    id: "program1".to_string(),
                    document_type: "MyProgram".to_string(),
                    context_id: context_id.clone(),
                    category: DocumentRegistryCategory::ProgramEnrolment,
                    name: Some("name".to_string()),
                    form_schema_id: "schema1".to_string(),
                },
                &[context_id.clone()]
            ),
            Ok(DocumentRegistry {
                id: "program1".to_string(),
                document_type: "MyProgram".to_string(),
                context_id: context_id.clone(),
                category: DocumentRegistryCategory::ProgramEnrolment,
                name: Some("name".to_string()),
                form_schema_id: "schema1".to_string(),
                json_schema: json!({}),
                ui_schema_type: "type".to_string(),
                ui_schema: json!({}),
                config: None,
            })
        );

        // success 2
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "encounter1".to_string(),
                    document_type: "MyEncounter".to_string(),
                    context_id: context_id.clone(),
                    category: DocumentRegistryCategory::Encounter,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                },
                &[context_id.clone()]
            ),
            Ok(DocumentRegistry {
                id: "encounter1".to_string(),
                document_type: "MyEncounter".to_string(),
                context_id: context_id.clone(),
                category: DocumentRegistryCategory::Encounter,
                name: None,
                form_schema_id: "schema1".to_string(),
                json_schema: json!({}),
                ui_schema_type: "type".to_string(),
                ui_schema: json!({}),
                config: None,
            })
        );

        // InsertDocRegistryError::OnlyOnePatientEntryAllowed
        service
            .insert(
                &context,
                InsertDocumentRegistry {
                    id: "patient1".to_string(),
                    document_type: "Patient1".to_string(),
                    context_id: PATIENT_CONTEXT_ID.to_string(),
                    category: DocumentRegistryCategory::Patient,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                },
                &[PATIENT_CONTEXT_ID.to_string()],
            )
            .unwrap();
        assert_eq!(
            service.insert(
                &context,
                InsertDocumentRegistry {
                    id: "patient2".to_string(),
                    document_type: "Patient2".to_string(),
                    context_id: PATIENT_CONTEXT_ID.to_string(),
                    category: DocumentRegistryCategory::Patient,
                    name: None,
                    form_schema_id: "schema1".to_string(),
                },
                &[PATIENT_CONTEXT_ID.to_string()]
            ),
            Err(InsertDocRegistryError::OnlyOnePatientEntryAllowed)
        );
    }
}

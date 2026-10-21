#[cfg(test)]
mod tests {
    use std::slice;

    use repository::mock::context_program_a;
    use repository::{
        DocumentRegistry, DocumentRegistryCategory, DocumentRegistryRow,
        DocumentRegistryRowRepository, FormSchema, FormSchemaRowRepository,
    };
    use repository::{mock::MockDataInserts, test_db::setup_all};
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

        let service_provider = ServiceProvider::new(connection_manager);
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

    /// An insert over an entry a form plugin installed must be refused: it
    /// would replace the whole row, so the entry would lose its event rules,
    /// its owner and its program key, and the next install of the plugin would
    /// find an entry no plugin owns. The same goes for a new entry for a type
    /// a plugin owns. Remaining work item 10.
    #[actix_rt::test]
    async fn insert_over_a_plugin_owned_entry_is_refused() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_over_a_plugin_owned_entry_is_refused",
            MockDataInserts::none().contexts(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.document_registry_service;
        let context_id = context_program_a().id;

        FormSchemaRowRepository::new(&context.connection)
            .upsert_one(&FormSchema {
                id: "demo_program_DemoEncounter_v2".to_string(),
                r#type: "JsonForms".to_string(),
                json_schema: json!({}),
                ui_schema: json!({}),
            })
            .unwrap();
        // As install writes it (service/src/plugin/form_plugin.rs).
        let owned = DocumentRegistryRow {
            id: "demo_program_DemoEncounter".to_string(),
            category: DocumentRegistryCategory::Encounter,
            document_type: "DemoEncounter".to_string(),
            context_id: context_id.clone(),
            name: Some("Demo encounter".to_string()),
            form_schema_id: Some("demo_program_DemoEncounter_v2".to_string()),
            config: Some(
                json!({
                    "events": [{
                        "type": "Field",
                        "conditions": [{ "field": "extension.demo.regimen", "isSet": true }],
                        "event": {
                            "documentType": "DemoProgramEnrolment",
                            "type": "currentRegimen",
                            "dataField": "extension.demo.regimen"
                        }
                    }]
                })
                .to_string(),
            ),
            plugin_code: Some("demo_program".to_string()),
            program_key: Some("demo".to_string()),
        };
        let repo = DocumentRegistryRowRepository::new(&context.connection);
        repo.upsert_one(&owned).unwrap();

        let result = service.insert(
            &context,
            InsertDocumentRegistry {
                id: owned.id.clone(),
                document_type: "DemoEncounter".to_string(),
                context_id: context_id.clone(),
                category: DocumentRegistryCategory::Encounter,
                name: Some("Pushed over".to_string()),
                form_schema_id: "demo_program_DemoEncounter_v2".to_string(),
            },
            slice::from_ref(&context_id),
        );

        assert_eq!(
            result,
            Err(InsertDocRegistryError::OwnedByPlugin(
                "demo_program".to_string()
            ))
        );
        // The entry is as the plugin left it.
        assert_eq!(repo.find_one_by_id(&owned.id).unwrap(), Some(owned.clone()));

        // A second entry for the plugin's type, under a new id.
        let result = service.insert(
            &context,
            InsertDocumentRegistry {
                id: "another_demo_encounter_entry".to_string(),
                document_type: "DemoEncounter".to_string(),
                context_id: context_id.clone(),
                category: DocumentRegistryCategory::Encounter,
                name: Some("Second entry".to_string()),
                form_schema_id: "demo_program_DemoEncounter_v2".to_string(),
            },
            slice::from_ref(&context_id),
        );
        assert_eq!(
            result,
            Err(InsertDocRegistryError::OwnedByPlugin(
                "demo_program".to_string()
            ))
        );
        assert_eq!(
            repo.find_one_by_id("another_demo_encounter_entry").unwrap(),
            None
        );

        // An entry no plugin owns can still be inserted.
        let result = service.insert(
            &context,
            InsertDocumentRegistry {
                id: "unowned_entry".to_string(),
                document_type: "UnownedEncounter".to_string(),
                context_id: context_id.clone(),
                category: DocumentRegistryCategory::Encounter,
                name: None,
                form_schema_id: "demo_program_DemoEncounter_v2".to_string(),
            },
            slice::from_ref(&context_id),
        );
        assert!(result.is_ok(), "{:?}", result);
    }
}

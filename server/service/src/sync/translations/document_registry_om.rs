use repository::{
    ChangelogRow, ChangelogTableName, DocumentRegistryRow, Row, StorageConnection, SyncBufferRow,
};

use super::{
    FkChecker, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
    document_registry::{DocumentRegistryTranslation, check_foreign_keys},
    form_schema::FormSchemaTranslation,
    master_list::MasterListTranslation,
    om_form_schema::OmFormSchemaTranslation,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(OmDocumentRegistryTranslation)
}

/// Registry entries written on open mSupply central, as installing a form
/// plugin does, sent to sites that pull from it over v6.
///
/// The entries legacy central sends arrive through `DocumentRegistryTranslation`
/// instead, and v7 sites get the bare row without either.
pub(crate) struct OmDocumentRegistryTranslation;

impl SyncTranslation for OmDocumentRegistryTranslation {
    fn table_name(&self) -> &str {
        // Not `om_document_registry`: that is legacy central's table, and its
        // rows come in a different shape.
        "document_registry"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            // An entry's schema may have come from either central.
            FormSchemaTranslation.table_name(),
            OmFormSchemaTranslation.table_name(),
            // The program context is synced via the program master list
            MasterListTranslation.table_name(),
            // A type a plugin took over keeps its entry's id, so a site can get both
            // centrals' copies in one sync (initialising, say). Legacy central's goes
            // in first and this one last, so the site ends with what open mSupply
            // central holds; otherwise the order between them would be arbitrary.
            DocumentRegistryTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row: DocumentRegistryRow = sync_record.deserialize()?;
        Ok(PullTranslateResult::upsert(check_foreign_keys(
            connection, fk_checker, row,
        )?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::DocumentRegistry)
    }

    // Only sent from open mSupply central to the sites pulling from it. No site
    // writes an entry, and legacy central keeps its own.
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::DocumentRegistry(row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }

    // There is no delete: nothing removes a registry entry yet.
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::{
        synchroniser::integrate_and_translate_sync_buffer,
        test::test_data::document_registry_om as test_data,
        translations::{all_translators, pull_integration_order, translate_rows_to_sync_records},
    };
    use repository::{
        ChangelogFilter, ChangelogRepository, CursorAndLimit, DocumentRegistryCategory,
        DocumentRegistryRowRepository, KeyType, KeyValueStoreRow, ProgramEnrolmentFilter,
        ProgramEnrolmentRepository, StringFilter, SyncAction, SyncBufferRepository,
        SyncBufferRowInsert, SyncRecordData, SyncVersions,
        mock::{
            MockData, MockDataInserts, context_program_a, mock_form_schema_simple, mock_patient,
        },
        test_db::{setup_all, setup_all_with_data},
    };

    #[actix_rt::test]
    async fn test_om_document_registry_translation() {
        let translator = OmDocumentRegistryTranslation;
        let (_, connection, _, _) = setup_all(
            "test_om_document_registry_translation",
            MockDataInserts::none().contexts().form_schemas(),
        )
        .await;
        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// An entry a form plugin install writes on open mSupply central is picked
    /// up by a v6 site's pull, sent with its owner, and reads back as the same
    /// row on the site.
    #[actix_rt::test]
    async fn an_entry_written_on_central_reaches_a_v6_site_whole() {
        let central_site_id = 1;
        let (_, connection, _, _) = setup_all_with_data(
            "an_entry_written_on_central_reaches_a_v6_site_whole",
            MockDataInserts::none().contexts().form_schemas(),
            MockData {
                key_value_store_rows: vec![KeyValueStoreRow {
                    id: KeyType::SettingsSyncSiteId,
                    value_int: Some(central_site_id),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;
        let entry = DocumentRegistryRow {
            id: "demo_program_DemoEncounter".to_string(),
            category: DocumentRegistryCategory::Encounter,
            document_type: "DemoEncounter".to_string(),
            context_id: context_program_a().id,
            name: Some("Demo encounter".to_string()),
            form_schema_id: Some(mock_form_schema_simple().id),
            config: Some(r#"{"events":[]}"#.to_string()),
            plugin_code: Some("demo_program".to_string()),
            program_key: Some("demo".to_string()),
        };
        let cursor = ChangelogRepository::new(&connection).max_cursor().unwrap();
        DocumentRegistryRowRepository::new(&connection)
            .upsert_one(&entry)
            .unwrap();

        // What central's v6 pull selects for a site, as it asks for it.
        let pulling_site_id = 2;
        let rows = ChangelogRepository::new(&connection)
            .query_with_data(
                ChangelogFilter::all_data_for_site(
                    pulling_site_id,
                    false,
                    Some(SyncVersions {
                        is_v6: true,
                        is_v5: false,
                    }),
                ),
                // Rows after the cursor, as a pull reads them.
                CursorAndLimit {
                    cursor: cursor as i64,
                    limit: 100,
                },
            )
            .unwrap()
            .rows;
        let sent = translate_rows_to_sync_records(
            &connection,
            rows,
            vec![ToSyncRecordTranslationType::PullFromOmSupplyCentral],
        )
        .unwrap();
        assert_eq!(sent.len(), 1);
        let sent = &sent[0].record;
        assert_eq!(sent.table_name, "document_registry");

        let received = SyncBufferRow {
            table_name: sent.table_name.clone(),
            record_id: sent.record_id.clone(),
            data: SyncRecordData(sent.record_data.clone()),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        assert_eq!(
            OmDocumentRegistryTranslation
                .try_translate_from_upsert_sync_record(&connection, &FkChecker::new(), &received)
                .unwrap(),
            PullTranslateResult::upsert(entry)
        );
    }

    /// Entries are never pushed: not to legacy central, and not by a site to
    /// open mSupply central.
    #[test]
    fn entries_are_only_sent_on_the_v6_pull() {
        let changelog = ChangelogRow {
            table_name: ChangelogTableName::DocumentRegistry,
            ..Default::default()
        };
        let sent_for = |r#type| {
            OmDocumentRegistryTranslation.should_translate_to_sync_record(&changelog, &r#type)
        };
        assert!(sent_for(
            ToSyncRecordTranslationType::PullFromOmSupplyCentral
        ));
        assert!(!sent_for(ToSyncRecordTranslationType::PushToLegacyCentral));
        assert!(!sent_for(
            ToSyncRecordTranslationType::PushToOmSupplyCentral
        ));
    }

    /// Legacy central's copy of an entry integrates first and open mSupply central's
    /// last, then documents, so a site keeps open mSupply central's copy and a
    /// document whose type arrives in the same sync gets its enrolment or encounter
    /// row.
    #[test]
    fn entries_integrate_legacy_first_then_central_then_documents() {
        let translators = all_translators();
        let order = pull_integration_order(&translators);
        let position = |table: &str| order.iter().position(|t| *t == table).unwrap();
        assert!(position("om_document_registry") < position("document_registry"));
        assert!(position("document_registry") < position("om_document"));
    }

    /// Both centrals' copies of a taken-over entry in one sync: the site keeps open
    /// mSupply central's, with the plugin as its owner.
    #[actix_rt::test]
    async fn central_copy_of_an_entry_wins_over_legacy_copy_in_the_same_sync() {
        let (_, connection, _, _) = setup_all(
            "central_copy_of_an_entry_wins_over_legacy_copy_in_the_same_sync",
            MockDataInserts::all(),
        )
        .await;

        buffer(&connection, 0, plugin_entry());
        buffer(&connection, 0, legacy_copy_of_plugin_entry());
        integrate_and_translate_sync_buffer(&connection, None, 0, true).unwrap();

        let entry = DocumentRegistryRowRepository::new(&connection)
            .find_one_by_id("demo_program_PluginEnrolment")
            .unwrap()
            .unwrap();
        assert_eq!(entry.plugin_code.as_deref(), Some("demo_program"));
    }

    /// A document pulled from legacy central and the entry for its type pulled from
    /// open mSupply central in the same sync. The document is buffered first, yet the
    /// entry integrates first, so the document gets its enrolment row.
    #[actix_rt::test]
    async fn a_document_gets_its_row_when_its_entry_arrives_in_the_same_sync() {
        let (_, connection, _, _) = setup_all(
            "a_document_gets_its_row_when_its_entry_arrives_in_the_same_sync",
            MockDataInserts::all(),
        )
        .await;

        buffer(&connection, 0, enrolment_document());
        buffer(&connection, 0, plugin_entry());
        integrate_and_translate_sync_buffer(&connection, None, 0, true).unwrap();

        assert_eq!(enrolments(&connection), 1);
    }

    /// A site before 3.4 has no translator for these rows and never reads them, so
    /// they wait in its buffer, from legacy central's site id after the 3.0 buffer
    /// rebuild. The first sync on 3.4 integrates them.
    #[actix_rt::test]
    async fn an_entry_an_older_version_left_waiting_integrates_after_the_upgrade() {
        let legacy_central_site_id = 1;
        let (_, connection, _, _) = setup_all(
            "an_entry_an_older_version_left_waiting_integrates_after_the_upgrade",
            MockDataInserts::all(),
        )
        .await;

        buffer(&connection, legacy_central_site_id, plugin_entry());
        integrate_and_translate_sync_buffer(&connection, None, legacy_central_site_id, true)
            .unwrap();

        let entry = DocumentRegistryRowRepository::new(&connection)
            .find_one_by_id("demo_program_PluginEnrolment")
            .unwrap()
            .unwrap();
        assert_eq!(entry.plugin_code.as_deref(), Some("demo_program"));
        assert_eq!(entry.program_key.as_deref(), Some("demo"));
    }

    /// Adds a pending row to the sync buffer, as a pull leaves it.
    fn buffer(connection: &StorageConnection, source_site_id: i32, row: SyncBufferRow) {
        SyncBufferRepository::new(connection)
            .insert_many(&[SyncBufferRowInsert::from(SyncBufferRow {
                source_site_id,
                ..row
            })])
            .unwrap();
    }

    /// An entry for a type no other entry has, as open mSupply central sends it.
    fn plugin_entry() -> SyncBufferRow {
        SyncBufferRow {
            table_name: "document_registry".to_string(),
            record_id: "demo_program_PluginEnrolment".to_string(),
            data: SyncRecordData(serde_json::json!({
                "id": "demo_program_PluginEnrolment",
                "category": "ProgramEnrolment",
                "document_type": "PluginEnrolment",
                "context_id": context_program_a().id,
                "name": "Plugin enrolment",
                // Install always sets a schema, and the registry lookup that documents
                // integrate through only sees entries that have one.
                "form_schema_id": mock_form_schema_simple().id,
                "plugin_code": "demo_program",
                "program_key": "demo"
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    /// The same entry as legacy central holds it from before the take-over.
    fn legacy_copy_of_plugin_entry() -> SyncBufferRow {
        SyncBufferRow {
            table_name: "om_document_registry".to_string(),
            record_id: "demo_program_PluginEnrolment".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "demo_program_PluginEnrolment",
                "category": "PROGRAM_ENROLMENT",
                "document_type": "PluginEnrolment",
                "context_ID": context_program_a().id,
                "name": "Plugin enrolment",
                "form_schema_ID": mock_form_schema_simple().id,
                "config": null
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    /// An enrolment of that type, as legacy central sends it.
    fn enrolment_document() -> SyncBufferRow {
        SyncBufferRow {
            table_name: "om_document".to_string(),
            record_id: "plugin_enrolment_v1".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "plugin_enrolment_v1",
                "name": "p/plugin_patient/PluginEnrolment",
                "parent_IDs": "[]",
                "user_ID": "user",
                "datetime": "2026-10-09T01:00:00",
                "type": "PluginEnrolment",
                "data": {
                    "enrolmentDatetime": "2026-10-09T01:00:00.000Z",
                    "status": "ACTIVE",
                    "programEnrolmentId": "plugin-1",
                    "storeId": "store_a"
                },
                "form_schema_ID": "",
                "status": "ACTIVE",
                "owner_name_ID": mock_patient().id,
                "context_ID": context_program_a().id
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    fn enrolments(connection: &StorageConnection) -> i64 {
        ProgramEnrolmentRepository::new(connection)
            .count(Some(
                ProgramEnrolmentFilter::new()
                    .program_enrolment_id(StringFilter::equal_to("plugin-1")),
            ))
            .unwrap()
    }
}

use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, InvoiceFilter, InvoiceRepository,
    InvoiceType, NameRowRepository, NameRowType, NameStoreJoin, NameStoreJoinFilter,
    NameStoreJoinRepository, NameStoreJoinRow, NameStoreJoinRowDelete, Row, StorageConnection,
    StoreFilter, StoreRepository, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use crate::sync::{
    translations::{name::NameTranslation, store::StoreTranslation},
    CentralServerConfig,
};

use super::{
    FkField, IntegrationOperation, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameStoreJoinRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "name_ID")]
    pub name_id: String,
    pub inactive: Option<bool>,
    #[serde(rename = "om_name_is_customer")]
    pub name_is_customer: Option<bool>,
    #[serde(rename = "om_name_is_supplier")]
    pub name_is_supplier: Option<bool>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameStoreJoinTranslation)
}

pub(super) struct NameStoreJoinTranslation;
impl SyncTranslation for NameStoreJoinTranslation {
    fn table_name(&self) -> &str {
        "name_store_join"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![NameTranslation.table_name(), StoreTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::NameStoreJoin)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                let is_name_store_record = self.change_log_type().as_ref() == Some(&row.table_name);

                if !is_name_store_record {
                    return false;
                }

                // Check if we're the central server, if we are don't push changes received from remote sites
                // Otherwise we could end up syncing changes back to the site they came from
                if CentralServerConfig::is_central_server() && row.source_site_id.is_some() {
                    log::debug!(
                        "Not pushing name_store_join update from remote site back to central for id: {}", row.record_id
                    );
                    return false;
                }

                true
            }
            // We are also pushing to omsupply central so that it's available for
            // cross site patient details sharing, same for name
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyNameStoreJoinRow>()?;

        // in mSupply the inactive flag is used for soft-deletes.
        // given that we don't handle soft deletes, translate to a hard-delete
        if let Some(inactive) = data.inactive {
            if inactive {
                if !NameStoreJoinRepository::new(connection).check_exists_by_id(&data.id)? {
                    return Ok(PullTranslateResult::Ignored(
                        "Is inactive and not found".to_string(),
                    ));
                }
                return self.try_translate_from_delete_sync_record(connection, sync_record);
            }
        }

        let name = match NameRowRepository::new(connection).find_one_by_id(&data.name_id)? {
            Some(name) => name,
            None => {
                return Err(anyhow::anyhow!(
                    "Failed to get name '{}' for name_store_join '{}'",
                    data.name_id,
                    data.id
                ))
            }
        };

        if let Some(store) = StoreRepository::new(connection)
            .query_by_filter(
                StoreFilter::new().id(EqualFilter::equal_to(data.store_id.to_string())),
            )?
            .pop()
        {
            // if the name_store_join is referencing itself, then exclude it
            // this is an invalid configuration which shouldn't be possible.. but is
            if store.name_row.id == data.name_id {
                return Ok(PullTranslateResult::Ignored(
                    "Name store join references itself".to_string(),
                ));
            }
        }

        let check_fk = fk_checker.with_table_required(connection, "name_store_join", &data.id);

        let result = NameStoreJoinRow {
            id: data.id,
            name_id: check_fk(data.name_id, "name_link_id", FkField::NameLink)?,
            store_id: check_fk(data.store_id, "store_id", FkField::Store)?,
            // name_is_customer: data.name_is_customer.unwrap_or(name.is_customer),
            // name_is_supplier: data.name_is_supplier.unwrap_or(name.is_supplier),
            // TODO in mirror setup primary server sends name_store_join to central with previous sync
            // api, and name_is_customer or name_is_supplier on name_store_join are set to `false` rather then
            // remaining as null, for now always names properties for name_is_supplier/customer
            name_is_customer: name.is_customer,
            name_is_supplier: name.is_supplier,
        };

        // On central, keep the incoming OG join for a patient and delete any other
        // join for the same name & store (issue #12365): a synthesized
        // prescription-visibility join (see the invoice translator) is replaced by
        // OG's, and OG duplicates converge to the most recently received one.
        // Patients only — that's the scope of the prescription-visibility flow, and
        // it avoids the duplicate lookup for the far more common facility joins
        if CentralServerConfig::is_central_server() && name.r#type == NameRowType::Patient {
            let duplicate_joins: Vec<IntegrationOperation> =
                NameStoreJoinRepository::new(connection)
                    .query_by_filter(
                        NameStoreJoinFilter::new()
                            .name_id(EqualFilter::equal_to(name.id.clone()))
                            .store_id(EqualFilter::equal_to(result.store_id.clone())),
                    )?
                    .into_iter()
                    .filter(|join| join.name_store_join.id != result.id)
                    .map(|join| {
                        IntegrationOperation::delete(NameStoreJoinRowDelete(
                            join.name_store_join.id,
                        ))
                    })
                    .collect();

            if !duplicate_joins.is_empty() {
                let mut operations = vec![IntegrationOperation::upsert(result)];
                operations.extend(duplicate_joins);
                return Ok(PullTranslateResult::IntegrationOperations(operations));
            }
        }

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::NameStoreJoin(name_store_join_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let NameStoreJoin {
            name_store_join:
                NameStoreJoinRow {
                    id,
                    name_id: _,
                    store_id,
                    name_is_customer,
                    name_is_supplier,
                },
            name,
        } = NameStoreJoinRepository::new(connection)
            .query_by_filter(
                NameStoreJoinFilter::new().id(EqualFilter::equal_to(name_store_join_row.id)),
            )?
            .pop()
            .ok_or(anyhow::anyhow!("Name store join not found"))?;

        let legacy_row = LegacyNameStoreJoinRow {
            id,
            name_id: name.id,
            store_id,
            name_is_customer: Some(name_is_customer),
            name_is_supplier: Some(name_is_supplier),
            inactive: Some(false),
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // On central, keep the join while the name still has prescriptions in the
        // store (issue #12365): deleting it would stop the patient syncing to the
        // site that holds those prescriptions, breaking FK integration there.
        // In the future this should mark the join inactive instead
        if CentralServerConfig::is_central_server() {
            if let Some(join) =
                NameStoreJoinRepository::new(connection).find_one_by_id(&sync_record.record_id)?
            {
                let prescription_count = InvoiceRepository::new(connection).count(Some(
                    InvoiceFilter::new()
                        .name_id(EqualFilter::equal_to(join.name_id))
                        .store_id(EqualFilter::equal_to(join.store_id))
                        .r#type(InvoiceType::Prescription.equal_to()),
                ))?;

                if prescription_count > 0 {
                    return Ok(PullTranslateResult::Ignored(
                        "Not deleted, name has prescriptions in store".to_string(),
                    ));
                }
            }
        }

        // it is possible for name store join to be set inactive
        // this is handled in the upsert translation
        Ok(PullTranslateResult::delete(NameStoreJoinRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::{
        test::merge_helpers::merge_all_name_links, test_util_set_is_central_server,
        translations::ToSyncRecordTranslationType,
    };
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogCondition, ChangelogRepository,
        CursorAndLimit, FilterBuilder, InvoiceRow, InvoiceRowRepository, RowOrDelete, SyncAction,
        SyncRecordData,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_name_store_join_translation() {
        use crate::sync::test::test_data::name_store_join as test_data;
        let translator = NameStoreJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_store_join_translation",
            MockDataInserts::none().names().stores(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        // The inactive (soft-delete) record translates to a delete only if the row
        // already exists locally, so insert it first (it's ignored otherwise).
        NameStoreJoinRepository::new(&connection)
            .upsert_one_without_changelog(&NameStoreJoinRow {
                id: "BE65A4A05E4D47E88303D6105A7872CC".to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_a".to_string(),
                name_is_customer: false,
                name_is_supplier: true,
            })
            .unwrap();

        for record in test_data::test_pull_upsert_inactive_records() {
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_name_store_join_push_merged() {
        let (mock_data, connection, _, _) =
            setup_all("test_name_store_join_push_merged", MockDataInserts::all()).await;

        merge_all_name_links(&connection, &mock_data).unwrap();

        let entries = ChangelogRepository::new(&connection)
            .query_with_data(
                ChangelogCondition::table_name::equal(ChangelogTableName::NameStoreJoin),
                CursorAndLimit {
                    cursor: -1,
                    limit: 1_000_000,
                },
            )
            .unwrap();

        let translator = NameStoreJoinTranslation {};
        for entry in entries.rows {
            let RowOrDelete::Row { changelog, row } = entry else {
                panic!("expected upsert row")
            };
            assert!(translator.should_translate_to_sync_record(
                &changelog,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ));
            let translated = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog, row)
                .unwrap();

            assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

            let PushTranslateResult::PushRecord(translated) = translated else {
                panic!("Test fail, should translate")
            };

            assert_eq!(translated[0].record.record_data["name_ID"], json!("name_a"));
        }
    }

    /// On central, an incoming OG join for a patient replaces any existing join
    /// for the same name & store — a synthesized prescription-visibility join or
    /// an OG duplicate. Non-patient joins are not deduped (issue #12365)
    #[actix_rt::test]
    async fn test_name_store_join_dedup_keeps_incoming_join() {
        let translator = NameStoreJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_store_join_dedup_keeps_incoming_join",
            MockDataInserts::none().names().stores(),
        )
        .await;
        test_util_set_is_central_server(true);

        let incoming_join = |id: &str, name_id: &str, store_id: &str| SyncBufferRow {
            table_name: "name_store_join".to_string(),
            record_id: id.to_string(),
            data: SyncRecordData(json!({
                "ID": id,
                "name_ID": name_id,
                "store_ID": store_id,
                "inactive": false
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        // A synthesized prescription-visibility join for the patient ("testId")
        // is replaced by OG's
        let synthesized_id = "synthesized_join".to_string();
        NameStoreJoinRepository::new(&connection)
            .upsert_one_without_changelog(&NameStoreJoinRow {
                id: synthesized_id.clone(),
                store_id: "store_b".to_string(),
                name_id: "testId".to_string(),
                name_is_customer: true,
                name_is_supplier: false,
            })
            .unwrap();

        let patient = NameRowRepository::new(&connection)
            .find_one_by_id("testId")
            .unwrap()
            .unwrap();

        let translation_result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &incoming_join("og_name_store_join", "testId", "store_b"),
            )
            .unwrap();

        assert_eq!(
            translation_result,
            PullTranslateResult::IntegrationOperations(vec![
                IntegrationOperation::upsert(NameStoreJoinRow {
                    id: "og_name_store_join".to_string(),
                    store_id: "store_b".to_string(),
                    name_id: "testId".to_string(),
                    name_is_customer: patient.is_customer,
                    name_is_supplier: patient.is_supplier,
                }),
                IntegrationOperation::delete(NameStoreJoinRowDelete(synthesized_id)),
            ])
        );

        // An OG duplicate for the same patient & store is replaced too
        NameStoreJoinRepository::new(&connection)
            .upsert_one_without_changelog(&NameStoreJoinRow {
                id: "og_join_old".to_string(),
                store_id: "store_a".to_string(),
                name_id: "patient2".to_string(),
                name_is_customer: true,
                name_is_supplier: false,
            })
            .unwrap();

        let patient = NameRowRepository::new(&connection)
            .find_one_by_id("patient2")
            .unwrap()
            .unwrap();

        let translation_result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &incoming_join("og_join_new", "patient2", "store_a"),
            )
            .unwrap();

        assert_eq!(
            translation_result,
            PullTranslateResult::IntegrationOperations(vec![
                IntegrationOperation::upsert(NameStoreJoinRow {
                    id: "og_join_new".to_string(),
                    store_id: "store_a".to_string(),
                    name_id: "patient2".to_string(),
                    name_is_customer: patient.is_customer,
                    name_is_supplier: patient.is_supplier,
                }),
                IntegrationOperation::delete(NameStoreJoinRowDelete("og_join_old".to_string())),
            ])
        );

        // Re-receiving the same join (same id) is a plain upsert, not a dedup
        let translation_result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &incoming_join("og_join_old", "patient2", "store_a"),
            )
            .unwrap();

        assert_eq!(
            translation_result,
            PullTranslateResult::upsert(NameStoreJoinRow {
                id: "og_join_old".to_string(),
                store_id: "store_a".to_string(),
                name_id: "patient2".to_string(),
                name_is_customer: patient.is_customer,
                name_is_supplier: patient.is_supplier,
            })
        );

        // A non-patient join is not deduped, even with a duplicate present
        NameStoreJoinRepository::new(&connection)
            .upsert_one_without_changelog(&NameStoreJoinRow {
                id: "facility_join_old".to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_a".to_string(),
                name_is_customer: false,
                name_is_supplier: true,
            })
            .unwrap();

        let facility_name = NameRowRepository::new(&connection)
            .find_one_by_id("name_store_a")
            .unwrap()
            .unwrap();

        let translation_result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &incoming_join("facility_join_new", "name_store_a", "store_b"),
            )
            .unwrap();

        assert_eq!(
            translation_result,
            PullTranslateResult::upsert(NameStoreJoinRow {
                id: "facility_join_new".to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_a".to_string(),
                name_is_customer: facility_name.is_customer,
                name_is_supplier: facility_name.is_supplier,
            })
        );
    }

    /// On central, a join is not deleted while the name still has prescriptions
    /// in the store (issue #12365)
    #[actix_rt::test]
    async fn test_name_store_join_delete_blocked_by_prescriptions() {
        let translator = NameStoreJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_store_join_delete_blocked_by_prescriptions",
            MockDataInserts::none().names().stores(),
        )
        .await;
        test_util_set_is_central_server(true);

        NameStoreJoinRepository::new(&connection)
            .upsert_one_without_changelog(&NameStoreJoinRow {
                id: "og_name_store_join".to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_a".to_string(),
                name_is_customer: false,
                name_is_supplier: true,
            })
            .unwrap();

        let delete_record = SyncBufferRow {
            table_name: "name_store_join".to_string(),
            record_id: "og_name_store_join".to_string(),
            data: SyncRecordData(json!({})),
            action: SyncAction::Delete,
            ..Default::default()
        };

        // No prescriptions for the name in the store: delete goes through
        let translation_result = translator
            .try_translate_from_delete_sync_record(&connection, &delete_record)
            .unwrap();
        assert_eq!(
            translation_result,
            PullTranslateResult::delete(NameStoreJoinRowDelete("og_name_store_join".to_string()))
        );

        InvoiceRowRepository::new(&connection)
            .upsert_one(&InvoiceRow {
                id: "prescription_for_name_store_a".to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_a".to_string(),
                r#type: InvoiceType::Prescription,
                ..Default::default()
            })
            .unwrap();

        // With a prescription the join is kept
        let translation_result = translator
            .try_translate_from_delete_sync_record(&connection, &delete_record)
            .unwrap();
        assert_eq!(
            translation_result,
            PullTranslateResult::Ignored(
                "Not deleted, name has prescriptions in store".to_string()
            )
        );

        // The inactive soft-delete routes through the same path and is also kept
        let inactive_record = SyncBufferRow {
            table_name: "name_store_join".to_string(),
            record_id: "og_name_store_join".to_string(),
            data: SyncRecordData(json!({
                "ID": "og_name_store_join",
                "name_ID": "name_store_a",
                "store_ID": "store_b",
                "inactive": true
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        let translation_result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &inactive_record,
            )
            .unwrap();
        assert_eq!(
            translation_result,
            PullTranslateResult::Ignored(
                "Not deleted, name has prescriptions in store".to_string()
            )
        );
    }

}

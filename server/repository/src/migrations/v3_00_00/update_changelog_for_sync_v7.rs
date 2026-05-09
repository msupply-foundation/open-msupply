use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_changelog_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Add name_store_id to requisition and fill it based on the store_id → name_link → name relationship.
        sql!(
            connection,
            r#"
                -- Add name_store_id for requisition. transfer_store_id for a changelog is name_store_id
                ALTER TABLE requisition ADD COLUMN name_store_id TEXT;

                -- Update requisition name_store_id column.
                UPDATE requisition
                SET name_store_id = store.id
                FROM store
                JOIN name_link store_name_link ON store_name_link.id = store.name_link_id
                JOIN name_link requisition_name_link ON requisition_name_link.name_id = store_name_link.name_id
                WHERE requisition_name_link.id = requisition.name_link_id
                    AND requisition.name_store_id IS NULL;
            "#
        )?;

        // Populate changelog with transfer_store_id and patient_id
        sql!(
            connection,
            r#"
                -- transfer_store_id: the store on the other side of the transfer
                -- For invoices: invoice.name_store_id is already the resolved store of the other party
                UPDATE changelog
                SET transfer_store_id = i.name_store_id
                FROM invoice i
                WHERE changelog.table_name = 'invoice'
                  AND changelog.record_id = i.id
                  AND i.name_store_id IS NOT NULL
                  AND changelog.transfer_store_id IS NULL;

                -- For invoice lines: lookup via parent invoice's name_store_id
                UPDATE changelog
                SET transfer_store_id = i.name_store_id
                FROM invoice_line il
                JOIN invoice i ON i.id = il.invoice_id
                WHERE changelog.table_name = 'invoice_line'
                  AND changelog.record_id = il.id
                  AND i.name_store_id IS NOT NULL
                  AND changelog.transfer_store_id IS NULL;

                -- For requisitions: requisition.name_store_id is already the resolved store of the other party
                UPDATE changelog
                SET transfer_store_id = r.name_store_id
                FROM requisition r
                WHERE changelog.table_name = 'requisition'
                  AND changelog.record_id = r.id
                  AND r.name_store_id IS NOT NULL
                  AND changelog.transfer_store_id IS NULL;

                -- For requisition lines: lookup via parent requisition's name_store_id
                UPDATE changelog
                SET transfer_store_id = r.name_store_id
                FROM requisition_line rl
                JOIN requisition r ON r.id = rl.requisition_id
                WHERE changelog.table_name = 'requisition_line'
                  AND changelog.record_id = rl.id
                  AND r.name_store_id IS NOT NULL
                  AND changelog.transfer_store_id IS NULL;

                -- For rnr_form: resolve other-party name to its backing store via name_link
                UPDATE changelog
                SET transfer_store_id = store.id
                FROM rnr_form rf
                JOIN name_link rnr_form_name_link ON rnr_form_name_link.id = rf.name_link_id
                JOIN name_link store_name_link ON store_name_link.name_id = rnr_form_name_link.name_id
                JOIN store ON store.name_link_id = store_name_link.id
                WHERE changelog.table_name = 'rnr_form'
                  AND changelog.record_id = rf.id
                  AND changelog.transfer_store_id IS NULL;

                -- For rnr_form_line: lookup via parent rnr_form
                UPDATE changelog
                SET transfer_store_id = store.id
                FROM rnr_form_line rfl
                JOIN rnr_form rf ON rf.id = rfl.rnr_form_id
                JOIN name_link rnr_form_name_link ON rnr_form_name_link.id = rf.name_link_id
                JOIN name_link store_name_link ON store_name_link.name_id = rnr_form_name_link.name_id
                JOIN store ON store.name_link_id = store_name_link.id
                WHERE changelog.table_name = 'rnr_form_line'
                  AND changelog.record_id = rfl.id
                  AND changelog.transfer_store_id IS NULL;

                -- For name_store_join: resolve the joined name to its backing store
                UPDATE changelog
                SET transfer_store_id = store.id
                FROM name_store_join nsj
                JOIN name_link nsj_name_link ON nsj_name_link.id = nsj.name_link_id
                JOIN name_link store_name_link ON store_name_link.name_id = nsj_name_link.name_id
                JOIN store ON store.name_link_id = store_name_link.id
                WHERE changelog.table_name = 'name_store_join'
                  AND changelog.record_id = nsj.id
                  AND changelog.transfer_store_id IS NULL;

                -- patient_id: the patient's name_id at the time the changelog row was written.

                -- For prescription invoices: patient is the invoice's other-party name at the time of upsert
                UPDATE changelog
                SET patient_id = i.name_link_id
                FROM invoice i
                WHERE changelog.table_name = 'invoice'
                  AND changelog.record_id = i.id
                  AND i.type = 'PRESCRIPTION'
                  AND changelog.patient_id IS NULL;

                -- For prescription invoice lines: patient from parent invoice
                UPDATE changelog
                SET patient_id = i.name_link_id
                FROM invoice_line il
                JOIN invoice i ON i.id = il.invoice_id
                WHERE changelog.table_name = 'invoice_line'
                  AND changelog.record_id = il.id
                  AND i.type = 'PRESCRIPTION'
                  AND changelog.patient_id IS NULL;

                -- For vaccinations: vaccination.patient_link_id is the patient id at the time of upsert
                UPDATE changelog
                SET patient_id = v.patient_link_id
                FROM vaccination v
                WHERE changelog.table_name = 'vaccination'
                  AND changelog.record_id = v.id
                  AND changelog.patient_id IS NULL;

                -- For encounters: encounter.patient_link_id is the patient id at the time of upsert
                UPDATE changelog
                SET patient_id = e.patient_link_id
                FROM encounter e
                WHERE changelog.table_name = 'encounter'
                  AND changelog.record_id = e.id
                  AND changelog.patient_id IS NULL;

                -- For names of type PATIENT: patient_id is the name's own id
                UPDATE changelog
                SET patient_id = n.id
                FROM name n
                WHERE changelog.table_name = 'name'
                  AND changelog.record_id = n.id
                  AND n.type = 'PATIENT'
                  AND changelog.patient_id IS NULL;

                -- For documents: owner_name_link_id is the patient id at the time of upsert
                UPDATE changelog
                SET patient_id = d.owner_name_link_id
                FROM document d
                WHERE changelog.table_name = 'document'
                  AND changelog.record_id = d.id
                  AND d.owner_name_link_id IS NOT NULL
                  AND changelog.patient_id IS NULL;

                -- For sync_message: copy `to_store_id` to changelog.store_id so the
                -- new hybrid Remote+Central routing places addressed messages with
                -- the owning site only, and unaddressed messages fan out to all sites.
                UPDATE changelog
                SET store_id = sm.to_store_id
                FROM sync_message sm
                WHERE changelog.table_name = 'sync_message'
                  AND changelog.record_id = sm.id
                  AND sm.to_store_id IS NOT NULL
                  AND changelog.store_id IS NULL;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v3_00_00::V3_00_00, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*, RunQueryDsl};

    // Minimal changelog columns needed for verification
    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            transfer_store_id -> Nullable<Text>,
            patient_id -> Nullable<Text>,
        }
    }

    /// Set up base entities: two stores, two names linked to those stores,
    /// a patient name, and the name_store_join mappings.
    fn setup_test_data(connection: &StorageConnection) {
        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                -- Names
                INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('supplier_name', 'FACILITY', false, true, 'SUP', 'Supplier'),
                    ('patient_name', 'PATIENT', true, false, 'PAT', 'Patient'),
                    ('store_a_name', 'FACILITY', true, false, 'STA', 'Store A'),
                    ('store_b_name', 'FACILITY', true, false, 'STB', 'Store B');

                INSERT INTO name_link (id, name_id) VALUES
                    ('supplier_name', 'supplier_name'),
                    ('patient_name', 'patient_name'),
                    ('store_a_name', 'store_a_name'),
                    ('store_b_name', 'store_b_name');

                -- Stores
                INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_a', 'store_a_name', 'STORE_A', 1),
                    ('store_b', 'store_b_name', 'STORE_B', 2);

                -- name_store_joins:
                -- nsj1: supplier_name (no backing store) → expected transfer_store_id = NULL on its changelog
                -- nsj2: store_b_name (backed by store_b)  → expected transfer_store_id = store_b
                INSERT INTO name_store_join (id, name_link_id, store_id, name_is_customer, name_is_supplier) VALUES
                    ('nsj1', 'supplier_name', 'store_b', false, true),
                    ('nsj2', 'store_b_name', 'store_a', false, true);

                -- Item (needed for invoice_line)
                INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES
                    ('item1', 'Test Item', 'ITEM1', 1.0, 'STOCK', '');
                INSERT INTO item_link (id, item_id) VALUES ('item1', 'item1');

                -- Invoices
                -- inv1: outbound shipment from store_a to supplier_name (transfer to store_b)
                -- prescription1: prescription invoice (patient-related)
                INSERT INTO invoice (id, name_link_id, name_store_id, store_id, invoice_number, type, status, created_datetime, currency_rate, on_hold, is_cancellation, charges_local_currency, charges_foreign_currency) VALUES
                    ('inv1', 'supplier_name', 'store_b', 'store_a', 1, 'OUTBOUND_SHIPMENT', 'NEW', '2024-01-01 00:00:00', 1.0, false, false, 0, 0),
                    ('prescription1', 'patient_name', NULL, 'store_a', 2, 'PRESCRIPTION', 'NEW', '2024-01-01 00:00:00', 1.0, false, false, 0, 0);

                INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, pack_size, number_of_packs, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax) VALUES
                    ('inv_line1', 'inv1', 'item1', 'Test Item', 'ITEM1', 'STOCK_OUT', 1.0, 10.0, 5.0, 10.0, 50.0, 50.0),
                    ('presc_line1', 'prescription1', 'item1', 'Test Item', 'ITEM1', 'STOCK_OUT', 1.0, 5.0, 5.0, 10.0, 25.0, 25.0);

                -- Requisition from store_a, counterparty is store_b (other-party name is store_b_name, which is backed by store_b)
                INSERT INTO requisition (id, name_link_id, store_id, requisition_number, type, status, created_datetime, max_months_of_stock, min_months_of_stock) VALUES
                    ('req1', 'store_b_name', 'store_a', 1, 'REQUEST', 'DRAFT', '2024-01-01 00:00:00', 3.0, 1.0);

                INSERT INTO requisition_line (id, requisition_id, item_link_id, requested_quantity, suggested_quantity, supply_quantity, available_stock_on_hand, average_monthly_consumption) VALUES
                    ('req_line1', 'req1', 'item1', 0, 0, 0, 0, 0);

                -- Context and program (needed for encounter, vaccine_course, rnr_form FKs)
                INSERT INTO context (id, name) VALUES ('test_context', 'Test Context');
                INSERT INTO program (id, name, context_id, is_immunisation) VALUES ('prog1', 'Test Program', 'test_context', true);

                -- Period schedule + period (needed for rnr_form FK)
                INSERT INTO period_schedule (id, name) VALUES ('ps1', 'Test Schedule');
                INSERT INTO period (id, period_schedule_id, name, start_date, end_date) VALUES
                    ('period1', 'ps1', 'Period 1', '2024-01-01', '2024-12-31');

                -- rnr_form: counterparty is store_b_name (backed by store_b)
                INSERT INTO rnr_form (id, store_id, name_link_id, period_id, program_id, status, created_datetime) VALUES
                    ('rnr1', 'store_a', 'store_b_name', 'period1', 'prog1', 'DRAFT', '2024-01-01 00:00:00');
                INSERT INTO rnr_form_line (id, rnr_form_id, item_link_id, average_monthly_consumption, previous_monthly_consumption_values, initial_balance, snapshot_quantity_received, snapshot_quantity_consumed, snapshot_adjustments, adjusted_quantity_consumed, stock_out_duration, final_balance, maximum_quantity, calculated_requested_quantity) VALUES
                    ('rnr_line1', 'rnr1', 'item1', 0, '', 0, 0, 0, 0, 0, 0, 0, 0, 0);

                -- Encounter with patient
                INSERT INTO encounter (id, patient_link_id, document_type, document_name, store_id, created_datetime, start_datetime, status, program_id) VALUES
                    ('enc1', 'patient_name', 'encounter', 'enc_doc', 'store_a', '2024-01-01 00:00:00', '2024-01-01 00:00:00', 'VISITED', 'prog1');

                -- Vaccine course dose (needed for vaccination FK)
                INSERT INTO vaccine_course (id, name, program_id) VALUES ('vc1', 'Test Course', 'prog1');
                INSERT INTO vaccine_course_dose (id, vaccine_course_id, label, min_age, max_age, min_interval_days, custom_age_label) VALUES
                    ('dose1', 'vc1', 'Dose 1', 0, 100, 0, '');

                -- Program enrolment (needed for vaccination FK).
                -- doc1 has no owner_name_link_id; doc_patient is owned by patient_name (used to test the document patient_id backfill).
                INSERT INTO document (id, name, parent_ids, user_id, type, data, datetime, status, context_id, owner_name_link_id) VALUES
                    ('doc1', 'enrollment', '', 'user1', 'ProgramEnrolment', '{}', '2024-01-01 00:00:00', 'ACTIVE', 'test_context', NULL),
                    ('doc_patient', 'doc_patient', '', 'user1', 'PatientDoc', '{}', '2024-01-01 00:00:00', 'ACTIVE', 'test_context', 'patient_name');
                INSERT INTO program_enrolment (id, document_name, patient_link_id, program_enrolment_id, enrolment_datetime, document_type, status, program_id) VALUES
                    ('pe1', 'enrollment', 'patient_name', NULL, '2024-01-01 00:00:00', 'ProgramEnrolment', 'ACTIVE', 'prog1');

                -- Vaccination linked to encounter
                INSERT INTO vaccination (id, store_id, program_enrolment_id, patient_link_id, encounter_id, user_id, vaccine_course_dose_id, created_datetime, vaccination_date, given) VALUES
                    ('vacc1', 'store_a', 'pe1', 'patient_name', 'enc1', 'user1', 'dose1', '2024-01-01 00:00:00', '2024-01-01', true);

                -- Changelog rows for all the above (pre-migration these won't have transfer_store_id/patient_id yet)
                INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES
                    ('invoice', 'inv1', 'UPSERT', 'store_a'),
                    ('invoice_line', 'inv_line1', 'UPSERT', 'store_a'),
                    ('invoice', 'prescription1', 'UPSERT', 'store_a'),
                    ('invoice_line', 'presc_line1', 'UPSERT', 'store_a'),
                    ('requisition', 'req1', 'UPSERT', 'store_a'),
                    ('requisition_line', 'req_line1', 'UPSERT', 'store_a'),
                    ('encounter', 'enc1', 'UPSERT', 'store_a'),
                    ('vaccination', 'vacc1', 'UPSERT', 'store_a'),
                    ('rnr_form', 'rnr1', 'UPSERT', 'store_a'),
                    ('rnr_form_line', 'rnr_line1', 'UPSERT', 'store_a'),
                    ('name_store_join', 'nsj2', 'UPSERT', 'store_a'),
                    ('name', 'patient_name', 'UPSERT', 'store_a'),
                    ('document', 'doc_patient', 'UPSERT', 'store_a');
                "#,
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn test_changelog_backfill_transfer_store_id_and_patient_id() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_changelog_backfill",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_data(&connection);

        // Run migration
        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        // Query changelog and verify backfilled fields
        let rows = changelog::table
            .select((
                changelog::record_id,
                changelog::table_name,
                changelog::transfer_store_id,
                changelog::patient_id,
            ))
            .order_by(changelog::cursor.asc())
            .load::<(String, String, Option<String>, Option<String>)>(
                connection.lock().connection(),
            )
            .unwrap();

        // Filter to only our test records (other records may exist from mock setup)
        let test_ids = [
            "inv1",
            "inv_line1",
            "prescription1",
            "presc_line1",
            "req1",
            "req_line1",
            "enc1",
            "vacc1",
            "rnr1",
            "rnr_line1",
            "nsj2",
            "patient_name",
            "doc_patient",
        ];
        let rows: Vec<_> = rows
            .into_iter()
            .filter(|(id, _, _, _)| test_ids.contains(&id.as_str()))
            .collect();

        // (record_id, table_name, transfer_store_id, patient_id)
        let expected = vec![
            // Outbound invoice: transfer_store_id = store_b (from invoice.name_store_id), no patient
            (
                "inv1".into(),
                "invoice".into(),
                Some("store_b".into()),
                None,
            ),
            // Invoice line: inherits transfer_store_id from parent invoice
            (
                "inv_line1".into(),
                "invoice_line".into(),
                Some("store_b".into()),
                None,
            ),
            // Prescription invoice: no transfer_store_id (name_store_id is NULL), patient_id = patient_name
            (
                "prescription1".into(),
                "invoice".into(),
                None,
                Some("patient_name".into()),
            ),
            // Prescription line: no transfer_store_id, patient_id from parent
            (
                "presc_line1".into(),
                "invoice_line".into(),
                None,
                Some("patient_name".into()),
            ),
            // Requisition: transfer_store_id = store_b (via requisition.name_store_id, backfilled from store table), no patient
            (
                "req1".into(),
                "requisition".into(),
                Some("store_b".into()),
                None,
            ),
            // Requisition line: inherits transfer_store_id from parent
            (
                "req_line1".into(),
                "requisition_line".into(),
                Some("store_b".into()),
                None,
            ),
            // Encounter: no transfer_store_id, patient_id = patient_name
            (
                "enc1".into(),
                "encounter".into(),
                None,
                Some("patient_name".into()),
            ),
            // Vaccination: no transfer_store_id, patient_id = patient_name (resolved through name_link from vaccination.patient_link_id)
            (
                "vacc1".into(),
                "vaccination".into(),
                None,
                Some("patient_name".into()),
            ),
            // R&R form: transfer_store_id = store_b (rnr_form.name_link_id resolves to store_b_name → store_b)
            (
                "rnr1".into(),
                "rnr_form".into(),
                Some("store_b".into()),
                None,
            ),
            // R&R form line: inherits transfer_store_id from parent rnr_form
            (
                "rnr_line1".into(),
                "rnr_form_line".into(),
                Some("store_b".into()),
                None,
            ),
            // name_store_join: transfer_store_id = store_b (nsj2.name_link_id is store_b_name, backed by store_b)
            (
                "nsj2".into(),
                "name_store_join".into(),
                Some("store_b".into()),
                None,
            ),
            // Name (patient): patient_id = the name's own id
            (
                "patient_name".into(),
                "name".into(),
                None,
                Some("patient_name".into()),
            ),
            // Document: patient_id = owner's resolved name_id (patient_name)
            (
                "doc_patient".into(),
                "document".into(),
                None,
                Some("patient_name".into()),
            ),
        ];

        assert_eq!(rows, expected);
    }
}

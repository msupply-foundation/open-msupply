use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_changelog_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
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

                -- For requisitions: lookup via name_link -> name_store_join -> store_id
                UPDATE changelog
                SET transfer_store_id = nsj.store_id
                FROM requisition r
                JOIN name_link nl ON nl.id = r.name_link_id
                JOIN name_store_join nsj ON nsj.name_link_id = nl.id
                WHERE changelog.table_name = 'requisition'
                  AND changelog.record_id = r.id
                  AND changelog.transfer_store_id IS NULL;

                -- For requisition lines: lookup via parent requisition
                UPDATE changelog
                SET transfer_store_id = nsj.store_id
                FROM requisition_line rl
                JOIN requisition r ON r.id = rl.requisition_id
                JOIN name_link nl ON nl.id = r.name_link_id
                JOIN name_store_join nsj ON nsj.name_link_id = nl.id
                WHERE changelog.table_name = 'requisition_line'
                  AND changelog.record_id = rl.id
                  AND changelog.transfer_store_id IS NULL;

                -- patient_id: the patient's name_id for patient-related records
                -- For prescription invoices: patient is the invoice's name
                UPDATE changelog
                SET patient_id = nl.name_id
                FROM invoice i
                JOIN name_link nl ON nl.id = i.name_link_id
                WHERE changelog.table_name = 'invoice'
                  AND changelog.record_id = i.id
                  AND i.type = 'PRESCRIPTION'
                  AND changelog.patient_id IS NULL;

                -- For prescription invoice lines: patient from parent invoice
                UPDATE changelog
                SET patient_id = nl.name_id
                FROM invoice_line il
                JOIN invoice i ON i.id = il.invoice_id
                JOIN name_link nl ON nl.id = i.name_link_id
                WHERE changelog.table_name = 'invoice_line'
                  AND changelog.record_id = il.id
                  AND i.type = 'PRESCRIPTION'
                  AND changelog.patient_id IS NULL;

                -- For vaccinations: patient from the encounter
                UPDATE changelog
                SET patient_id = e.patient_link_id
                FROM vaccination v
                JOIN encounter e ON e.id = v.encounter_id
                WHERE changelog.table_name = 'vaccination'
                  AND changelog.record_id = v.id
                  AND changelog.patient_id IS NULL;

                -- For encounters: patient is directly on the record
                UPDATE changelog
                SET patient_id = e.patient_link_id
                FROM encounter e
                WHERE changelog.table_name = 'encounter'
                  AND changelog.record_id = e.id
                  AND changelog.patient_id IS NULL;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v2_19_00::V2_19_00, *},
        test_db::*,
    };
    use diesel::{prelude::*, sql_query, RunQueryDsl};

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

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    /// Set up base entities: two stores, two names linked to those stores,
    /// a patient name, and the name_store_join mappings.
    fn setup_test_data(connection: &StorageConnection) {
        // Names
        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('supplier_name', 'FACILITY', false, true, 'SUP', 'Supplier');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('supplier_name', 'supplier_name');");

        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('patient_name', 'PATIENT', true, false, 'PAT', 'Patient');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('patient_name', 'patient_name');");

        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_a_name', 'FACILITY', true, false, 'STA', 'Store A');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('store_a_name', 'store_a_name');");

        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_b_name', 'FACILITY', true, false, 'STB', 'Store B');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('store_b_name', 'store_b_name');");

        // Stores
        run(connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_a', 'store_a_name', 'STORE_A', 1);");
        run(connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_b', 'store_b_name', 'STORE_B', 2);");

        // name_store_join: supplier_name is linked to store_b (the transfer destination)
        run(connection, "INSERT INTO name_store_join (id, name_link_id, store_id, name_is_customer, name_is_supplier) VALUES ('nsj1', 'supplier_name', 'store_b', false, true);");

        // Item (needed for invoice_line)
        run(connection, "INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item1', 'Test Item', 'ITEM1', 1.0, 'STOCK', '');");
        run(connection, "INSERT INTO item_link (id, item_id) VALUES ('item1', 'item1');");

        // Outbound invoice from store_a to supplier_name (transfer to store_b)
        run(connection, "INSERT INTO invoice (id, name_link_id, name_store_id, store_id, invoice_number, type, status, created_datetime, currency_rate, on_hold, is_cancellation, charges_local_currency, charges_foreign_currency) \
            VALUES ('inv1', 'supplier_name', 'store_b', 'store_a', 1, 'OUTBOUND_SHIPMENT', 'NEW', '2024-01-01 00:00:00', 1.0, false, false, 0, 0);");

        // Invoice line for that invoice
        run(connection, "INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, pack_size, number_of_packs, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax) \
            VALUES ('inv_line1', 'inv1', 'item1', 'Test Item', 'ITEM1', 'STOCK_OUT', 1.0, 10.0, 5.0, 10.0, 50.0, 50.0);");

        // Prescription invoice (patient-related)
        run(connection, "INSERT INTO invoice (id, name_link_id, name_store_id, store_id, invoice_number, type, status, created_datetime, currency_rate, on_hold, is_cancellation, charges_local_currency, charges_foreign_currency) \
            VALUES ('prescription1', 'patient_name', NULL, 'store_a', 2, 'PRESCRIPTION', 'NEW', '2024-01-01 00:00:00', 1.0, false, false, 0, 0);");

        // Prescription invoice line
        run(connection, "INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, pack_size, number_of_packs, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax) \
            VALUES ('presc_line1', 'prescription1', 'item1', 'Test Item', 'ITEM1', 'STOCK_OUT', 1.0, 5.0, 5.0, 10.0, 25.0, 25.0);");

        // Requisition from store_a, counterparty is supplier_name (linked to store_b)
        run(connection, "INSERT INTO requisition (id, name_link_id, store_id, requisition_number, type, status, created_datetime, max_months_of_stock, min_months_of_stock) \
            VALUES ('req1', 'supplier_name', 'store_a', 1, 'REQUEST', 'DRAFT', '2024-01-01 00:00:00', 3.0, 1.0);");

        // Requisition line
        run(connection, "INSERT INTO requisition_line (id, requisition_id, item_link_id, requested_quantity, suggested_quantity, supply_quantity, available_stock_on_hand, average_monthly_consumption) \
            VALUES ('req_line1', 'req1', 'item1', 0, 0, 0, 0, 0);");

        // Context and program (needed for encounter, vaccine_course FKs)
        run(connection, "INSERT INTO context (id, name) VALUES ('test_context', 'Test Context');");
        run(connection, "INSERT INTO program (id, name, context_id, is_immunisation) VALUES ('prog1', 'Test Program', 'test_context', true);");

        // Encounter with patient
        run(connection, "INSERT INTO encounter (id, patient_link_id, document_type, document_name, store_id, created_datetime, start_datetime, status, program_id) \
            VALUES ('enc1', 'patient_name', 'encounter', 'enc_doc', 'store_a', '2024-01-01 00:00:00', '2024-01-01 00:00:00', 'VISITED', 'prog1');");

        // Vaccine course dose (needed for vaccination FK)
        run(connection, "INSERT INTO vaccine_course (id, name, program_id) VALUES ('vc1', 'Test Course', 'prog1');");
        run(connection, "INSERT INTO vaccine_course_dose (id, vaccine_course_id, label, min_age, max_age, min_interval_days, custom_age_label) VALUES ('dose1', 'vc1', 'Dose 1', 0, 100, 0, '');");

        // Program enrolment (needed for vaccination FK)
        run(connection, "INSERT INTO document (id, name, parent_ids, user_id, type, data, datetime, status, context_id) VALUES ('doc1', 'enrollment', '', 'user1', 'ProgramEnrolment', '{}', '2024-01-01 00:00:00', 'ACTIVE', 'test_context');");
        run(connection, "INSERT INTO program_enrolment (id, document_name, patient_link_id, program_enrolment_id, enrolment_datetime, document_type, status, program_id) VALUES ('pe1', 'enrollment', 'patient_name', NULL, '2024-01-01 00:00:00', 'ProgramEnrolment', 'ACTIVE', 'prog1');");

        // Vaccination linked to encounter
        run(connection, "INSERT INTO vaccination (id, store_id, program_enrolment_id, patient_link_id, encounter_id, user_id, vaccine_course_dose_id, created_datetime, vaccination_date, given) \
            VALUES ('vacc1', 'store_a', 'pe1', 'patient_name', 'enc1', 'user1', 'dose1', '2024-01-01 00:00:00', '2024-01-01', true);");

        // Changelog rows for all the above (at v2_17_00 these won't have transfer_store_id/patient_id yet)
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('invoice', 'inv1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('invoice_line', 'inv_line1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('invoice', 'prescription1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('invoice_line', 'presc_line1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('requisition', 'req1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('requisition_line', 'req_line1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('encounter', 'enc1', 'UPSERT', 'store_a');");
        run(connection, "INSERT INTO changelog (table_name, record_id, row_action, store_id) VALUES ('vaccination', 'vacc1', 'UPSERT', 'store_a');");
    }

    #[actix_rt::test]
    async fn test_changelog_backfill_transfer_store_id_and_patient_id() {
        let previous_version = V2_18_00.version();
        let version = V2_19_00.version();

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
        ];
        let rows: Vec<_> = rows
            .into_iter()
            .filter(|(id, _, _, _)| test_ids.contains(&id.as_str()))
            .collect();

        // (record_id, table_name, transfer_store_id, patient_id)
        let expected = vec![
            // Outbound invoice: transfer_store_id = store_b (from invoice.name_store_id), no patient
            ("inv1".into(), "invoice".into(), Some("store_b".into()), None),
            // Invoice line: inherits transfer_store_id from parent invoice
            ("inv_line1".into(), "invoice_line".into(), Some("store_b".into()), None),
            // Prescription invoice: no transfer_store_id (name_store_id is NULL), patient_id = patient_name
            ("prescription1".into(), "invoice".into(), None, Some("patient_name".into())),
            // Prescription line: no transfer_store_id, patient_id from parent
            ("presc_line1".into(), "invoice_line".into(), None, Some("patient_name".into())),
            // Requisition: transfer_store_id = store_b (via name_store_join), no patient
            ("req1".into(), "requisition".into(), Some("store_b".into()), None),
            // Requisition line: inherits transfer_store_id from parent
            ("req_line1".into(), "requisition_line".into(), Some("store_b".into()), None),
            // Encounter: no transfer_store_id, patient_id = patient_name
            ("enc1".into(), "encounter".into(), None, Some("patient_name".into())),
            // Vaccination: no transfer_store_id, patient_id = patient_name (from encounter)
            ("vacc1".into(), "vaccination".into(), None, Some("patient_name".into())),
        ];

        assert_eq!(rows, expected);
    }
}

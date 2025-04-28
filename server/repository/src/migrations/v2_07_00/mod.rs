use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_central_patient_visibility_processor_pg_enum_type;
mod add_expected_delivery_date_to_invoice;
mod add_given_store_id_to_vaccination;
mod add_item_warning_join_table;
mod add_linked_invoice_id_to_invoice_line;
mod add_patient_link_id_to_vaccination;
mod add_preference_table;
mod add_warning_table;
mod asset_data_matrix_locked_fields;
mod asset_data_matrix_permission;
mod change_vaccination_date_to_not_nullable;
mod drop_encounters_report;
mod new_stocktake_fields;
mod remove_encounter_clinician_constraint;
mod trigger_patient_visibility_sync;
pub(crate) struct V2_07_00;

impl Migration for V2_07_00 {
    fn version(&self) -> Version {
        Version::from_str("2.7.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_preference_table::Migrate),
            Box::new(add_linked_invoice_id_to_invoice_line::Migrate),
            Box::new(add_expected_delivery_date_to_invoice::Migrate),
            Box::new(new_stocktake_fields::Migrate),
            Box::new(asset_data_matrix_permission::Migrate),
            Box::new(asset_data_matrix_locked_fields::Migrate),
            Box::new(add_patient_link_id_to_vaccination::Migrate),
            Box::new(change_vaccination_date_to_not_nullable::Migrate),
            Box::new(remove_encounter_clinician_constraint::Migrate),
            Box::new(add_warning_table::Migrate),
            Box::new(add_item_warning_join_table::Migrate),
            Box::new(add_given_store_id_to_vaccination::Migrate),
            Box::new(trigger_patient_visibility_sync::Migrate),
            Box::new(add_central_patient_visibility_processor_pg_enum_type::Migrate),
            Box::new(drop_encounters_report::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    use crate::{migrations::sql, StorageConnection};

    #[actix_rt::test]
    async fn migration_2_07_00() {
        use v2_06_02::V2_06_02;
        use v2_07_00::V2_07_00;

        use crate::migrations::*;
        use crate::test_db::*;

        let previous_version = V2_06_02.version();
        let version = V2_07_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        insert_2_6_2_vaccinations(&connection, "some_store_id").unwrap();

        // Run this migration
        migrate(&connection, Some(version.clone())).unwrap();

        assert_eq!(get_database_version(&connection), version);
    }

    // Insert given (with vaccination date) and not given (without vaccination date) vaccinations
    // Ensure migration to add not-null constraint on vaccination_date works
    fn insert_2_6_2_vaccinations(
        connection: &StorageConnection,
        store_id: &str,
    ) -> anyhow::Result<()> {
        let context_id = "context_1".to_string();
        let program_id = "program_id".to_string();
        let course_id = "course_id".to_string();
        let dose_id = "dose_id".to_string();

        sql!(
            connection,
            r#"
            INSERT INTO context (
                id,
                name
            ) VALUES (
                '{context_id}',
                'context 1'
            );

            INSERT INTO program (
                id,
                name,
                context_id,
                is_immunisation
            ) VALUES (
                '{program_id}',
                'program 1',
                '{context_id}',
                TRUE
            );

            INSERT INTO vaccine_course (
                id,
                name,
                program_id
            ) VALUES (
                '{course_id}',
                'course 1',
                '{program_id}'
            );

            INSERT INTO vaccine_course_dose (
                id,
                vaccine_course_id,
                label
            ) VALUES (
                '{dose_id}',
                '{course_id}',
                'dose 1'
            );

            INSERT INTO vaccination (
                id,
                store_id,
                program_enrolment_id,
                encounter_id,
                user_id,
                vaccine_course_dose_id,
                created_datetime,
                vaccination_date,
                given
            ) VALUES (
                '2.6.2-given',
                '{store_id}',
                'program_enrolment_1',
                'encounter_1',
                'user_1',
                '{dose_id}',
                '2025-01-01 00:00:00',
                '2025-01-01',
                TRUE
            ), (
                '2.6.2-not-given',
                '{store_id}',
                'program_enrolment_1',
                'encounter_1',
                'user_1',
                '{dose_id}',
                '2025-01-01 00:00:00',
                NULL,
                FALSE
    );
        "#,
        )?;
        Ok(())
    }
}

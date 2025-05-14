use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_doses_columns_to_item_variant;
mod add_initial_stocktake_field;
mod add_vvm_status_log_change_log_table_name;
mod add_vvm_status_log_table;
mod add_vvm_status_id_to_stock_line;
mod add_vvm_status_table;

pub(crate) struct V2_08_00;

impl Migration for V2_08_00 {
    fn version(&self) -> Version {
        Version::from_str("2.8.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_vvm_status_table::Migrate),
            Box::new(add_vvm_status_log_table::Migrate),
            Box::new(add_doses_columns_to_item_variant::Migrate),
            Box::new(add_vvm_status_log_change_log_table_name::Migrate),
            Box::new(add_initial_stocktake_field::Migrate),
            Box::new(add_vvm_status_id_to_stock_line::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    // use crate::{migrations::sql, StorageConnection};

    #[actix_rt::test]
    async fn migration_2_08_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_07_00::V2_07_00;
        use v2_08_00::V2_08_00;

        let previous_version = V2_07_00.version();
        let version = V2_08_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // insert_2_7_0_stock_lines(&connection, "some_store_id").unwrap();

        // Run this migration
        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);
    }

    // TODO: write test
    // // Insert stock lines to ensure migration to add vvm_status_id to stock_line works
    // fn insert_2_7_0_stock_lines(
    //     connection: &StorageConnection,
    //     store_id: &str,
    // ) -> anyhow::Result<()> {
    //     let vvm_status_id = "status_1".to_string();
    //     let stock_line_id = "stock_line_id".to_string();
    //     let course_id = "course_id".to_string();
    //     let dose_id = "dose_id".to_string();

    //     sql!(
    //         connection,
    //         r#"
    //         INSERT INTO vvm_status (
    //             	id,
    //                 description,
    //                 code,
    //                 level,
    //                 is_active,
    //                 unusable
    //         ) VALUES (
    //             '{vvm_status_id}',
    //             'status 1',
    //             'status 1',
    //             '1',
    //             true,
    //             false
    //         );

    //         INSERT INTO stock_line (
    //             id TEXT NOT NULL,
    //             store_id TEXT NOT NULL,
    //             cost_price_per_pack REAL NOT NULL,
    //             sell_price_per_pack REAL NOT NULL,
    //             available_number_of_packs REAL NOT NULL,
    //             total_number_of_packs REAL NOT NULL,
    //             on_hold BOOLEAN NOT NULL,
    //             pack_size REAL DEFAULT (0) NOT NULL,
    //         ) VALUES (
    //             '{stock_line_id}',
    //             'program 1',
    //             '{context_id}',
    //             TRUE
    //         );

    //         INSERT INTO vaccine_course (
    //             id,
    //             name,
    //             program_id
    //         ) VALUES (
    //             '{course_id}',
    //             'course 1',
    //             '{program_id}'
    //         );

    //         INSERT INTO vaccine_course_dose (
    //             id,
    //             vaccine_course_id,
    //             label
    //         ) VALUES (
    //             '{dose_id}',
    //             '{course_id}',
    //             'dose 1'
    //         );

    //         INSERT INTO vaccination (
    //             id,
    //             store_id,
    //             program_enrolment_id,
    //             encounter_id,
    //             user_id,
    //             vaccine_course_dose_id,
    //             created_datetime,
    //             vaccination_date,
    //             given
    //         ) VALUES (
    //             '2.6.2-given',
    //             '{store_id}',
    //             'program_enrolment_1',
    //             'encounter_1',
    //             'user_1',
    //             '{dose_id}',
    //             '2025-01-01 00:00:00',
    //             '2025-01-01',
    //             TRUE
    //         ), (
    //             '2.6.2-not-given',
    //             '{store_id}',
    //             'program_enrolment_1',
    //             'encounter_1',
    //             'user_1',
    //             '{dose_id}',
    //             '2025-01-01 00:00:00',
    //             NULL,
    //             FALSE
    // );
    //     "#,
    //     )?;
    //     Ok(())
    // }
}

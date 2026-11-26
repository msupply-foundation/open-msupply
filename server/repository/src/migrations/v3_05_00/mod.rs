use super::{Migration, MigrationFragment, version::Version};
use crate::StorageConnection;

mod add_consumption_estimate_table;
mod add_instant_to_calendar_date_function;
mod add_item_trim_code_index;
mod add_location_type_fk_indexes;
mod add_location_type_trim_code_index;
mod add_master_list_trim_indexes;
mod add_name_reference_indexes;
mod add_name_trim_code_index;
mod add_patient_search_indexes;
mod add_standalone_central_admin_key_pg_enum;
mod add_unit_lower_trim_name_index;
mod add_user_deleted_datetime;
mod add_user_lower_trim_username_index;
mod drop_unused_name_indexes;
mod move_standalone_central_sites_to_v7;
mod record_standalone_central_admin;
mod requeue_failed_v7_central_data_deletes;

pub(crate) struct V3_05_00;

impl Migration for V3_05_00 {
    fn version(&self) -> Version {
        Version::from_str("3.5.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_consumption_estimate_table::Migrate),
            Box::new(add_patient_search_indexes::Migrate),
            Box::new(drop_unused_name_indexes::Migrate),
            Box::new(add_location_type_fk_indexes::Migrate),
            Box::new(add_location_type_trim_code_index::Migrate),
            Box::new(add_unit_lower_trim_name_index::Migrate),
            Box::new(add_item_trim_code_index::Migrate),
            Box::new(add_standalone_central_admin_key_pg_enum::Migrate),
            Box::new(record_standalone_central_admin::Migrate),
            Box::new(add_user_deleted_datetime::Migrate),
            Box::new(add_user_lower_trim_username_index::Migrate),
            Box::new(add_master_list_trim_indexes::Migrate),
            Box::new(add_name_trim_code_index::Migrate),
            Box::new(add_name_reference_indexes::Migrate),
            Box::new(add_instant_to_calendar_date_function::Migrate),
            Box::new(move_standalone_central_sites_to_v7::Migrate),
            Box::new(requeue_failed_v7_central_data_deletes::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_3_05_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v3_04_01::V3_04_01;
        use v3_05_00::V3_05_00;

        let previous_version = V3_04_01.version();
        let version = V3_05_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Run this migration
        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}

use super::{version::Version, Migration, MigrationFragment};

mod abbreviation_create_table;
mod add_contact_form_table;
mod add_elmis_code_to_program;
mod add_email_queue_table;
mod add_emergency_orders;
mod diagnosis_add_to_invoice;
mod diagnosis_create_table;
mod item_direction_create_table;
mod new_store_preferences;
mod remove_contact_form_site_id;
mod remove_unique_description_on_tmp_breach;

use crate::StorageConnection;

pub(crate) struct V2_05_00;

impl Migration for V2_05_00 {
    fn version(&self) -> Version {
        Version::from_str("2.5.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_contact_form_table::Migrate),
            Box::new(new_store_preferences::Migrate),
            Box::new(remove_unique_description_on_tmp_breach::Migrate),
            Box::new(add_emergency_orders::Migrate),
            Box::new(abbreviation_create_table::Migrate),
            Box::new(remove_contact_form_site_id::Migrate),
            Box::new(item_direction_create_table::Migrate),
            Box::new(diagnosis_create_table::Migrate),
            Box::new(add_email_queue_table::Migrate),
            Box::new(add_elmis_code_to_program::Migrate),
            Box::new(diagnosis_add_to_invoice::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_05_00() {
    use v2_04_01::V2_04_01;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_04_01.version();
    let version = V2_05_00.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    // Run this migration
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);
}

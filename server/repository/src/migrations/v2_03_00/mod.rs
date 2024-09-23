use super::{version::Version, Migration, MigrationFragment};

use crate::StorageConnection;
mod add_vaccination_activity_log_types;
mod add_vaccinations_table;
mod add_vaccine_course_changelog_table_names;
mod add_vaccine_doses_to_item;
mod drop_program_deleted_datetime;
mod remove_num_doses_from_vaccine_course;
mod remove_vaccine_course_dose_dose_number;
mod rename_vaccine_course_schedule_to_dose;
mod return_types_rename;

pub(crate) struct V2_03_00;

impl Migration for V2_03_00 {
    fn version(&self) -> Version {
        Version::from_str("2.3.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        return_types_rename::migrate(_connection)?;
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(drop_program_deleted_datetime::Migrate),
            Box::new(rename_vaccine_course_schedule_to_dose::Migrate),
            Box::new(remove_num_doses_from_vaccine_course::Migrate),
            Box::new(remove_vaccine_course_dose_dose_number::Migrate),
            Box::new(add_vaccine_course_changelog_table_names::Migrate),
            Box::new(add_vaccinations_table::Migrate),
            Box::new(add_vaccination_activity_log_types::Migrate),
            Box::new(add_vaccine_doses_to_item::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_03_00() {
    use v2_02_02::V2_02_02;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_02_02.version();
    let version = V2_03_00.version();

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

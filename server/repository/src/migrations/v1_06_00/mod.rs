use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod changelog_deduped;
mod contact_trace;
mod encounter_status;
mod indexes;
mod is_sync_update;
mod master_list;
mod name_is_deceased;
mod patient_id_indices;
mod permission;
mod plugin_data;
mod program_enrolment_status;
mod temperature_breach;

pub(crate) struct V1_06_00;
impl Migration for V1_06_00 {
    fn version(&self) -> Version {
        Version::from_str("1.6.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(permission::Migrate),
            Box::new(contact_trace::Migrate),
            Box::new(plugin_data::Migrate),
            Box::new(master_list::Migrate),
            Box::new(temperature_breach::Migrate),
            Box::new(patient_id_indices::Migrate),
            Box::new(program_enrolment_status::Migrate),
            Box::new(indexes::Migrate),
            Box::new(encounter_status::Migrate),
            Box::new(changelog_deduped::Migrate),
            Box::new(is_sync_update::Migrate),
            Box::new(name_is_deceased::Migrate),
        ]
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_06_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_06_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}

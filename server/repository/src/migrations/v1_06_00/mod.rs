use super::{version::Version, Migration};

use crate::StorageConnection;

mod changelog_deduped;
mod contact_trace;
mod encounter_status;
mod indexes;
mod master_list;
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

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        permission::migrate(connection)?;
        contact_trace::migrate(connection)?;
        plugin_data::migrate(connection)?;
        master_list::migrate(connection)?;
        temperature_breach::migrate(connection)?;
        patient_id_indices::migrate(connection)?;
        program_enrolment_status::migrate(connection)?;
        indexes::migrate(connection)?;
        encounter_status::migrate(connection)?;
        changelog_deduped::migrate(connection)?;
        Ok(())
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

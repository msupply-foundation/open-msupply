use super::{version::Version, Migration};

use crate::StorageConnection;

mod activity_log_add_zero_line;
mod assets;
mod central_omsupply;
mod invoice_required_currency_id;
mod pack_variant;
mod store_add_created_date;

pub(crate) struct V1_08_00;

impl Migration for V1_08_00 {
    fn version(&self) -> Version {
        Version::from_str("1.8.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        assets::migrate_assets(connection)?;
        pack_variant::migrate(connection)?;
        central_omsupply::migrate(connection)?;
        store_add_created_date::migrate(connection)?;
        activity_log_add_zero_line::migrate(connection)?;
        invoice_required_currency_id::migrate(connection)?;
        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_08_00() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_08_00.version();

    // This test allows checking sql syntax
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}

use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod rename_authorised_datetime_to_request_approval_datetime;
mod update_purchase_order_activity_log_type_enum;
mod update_purchase_order_status_enum;

pub(crate) struct V2_12_00;

impl Migration for V2_12_00 {
    fn version(&self) -> Version {
        Version::from_str("2.12.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(update_purchase_order_status_enum::Migrate),
            Box::new(update_purchase_order_activity_log_type_enum::Migrate),
            Box::new(rename_authorised_datetime_to_request_approval_datetime::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_12_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_11_00::V2_11_00;
        use v2_12_00::V2_12_00;

        let previous_version = V2_11_00.version();
        let version = V2_12_00.version();

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
}

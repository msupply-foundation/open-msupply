use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_can_cancel_finalised_invoices_user_permission;
mod add_delete_rnr_form_activity_log_enum;
mod add_invoice_line_shipped_pack_size;
mod invoice_line_shipped_pack_size_sync_buffer;
mod remove_rnr_form_line_entered_losses_default;

pub(crate) struct V2_09_01;

impl Migration for V2_09_01 {
    fn version(&self) -> Version {
        Version::from_str("2.9.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_can_cancel_finalised_invoices_user_permission::Migrate),
            Box::new(add_delete_rnr_form_activity_log_enum::Migrate),
            Box::new(remove_rnr_form_line_entered_losses_default::Migrate),
            Box::new(add_invoice_line_shipped_pack_size::Migrate),
            Box::new(invoice_line_shipped_pack_size_sync_buffer::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {

    #[actix_rt::test]
    async fn migration_2_09_00() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_09_00::V2_09_00;
        use v2_09_01::V2_09_01;

        let previous_version = V2_09_00.version();
        let version = V2_09_01.version();

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

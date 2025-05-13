use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_view_and_edit_vvm_status_permission"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type ADD VALUE 'VIEW_AND_EDIT_VVM_STATUS';
                "#
            )?;
        }

        Ok(())
    }
}

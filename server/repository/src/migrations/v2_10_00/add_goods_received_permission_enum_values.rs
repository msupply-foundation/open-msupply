use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_goods_received_permission_enum_values"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type ADD VALUE 'GOODS_RECEIVED_QUERY';
                    ALTER TYPE permission_type ADD VALUE 'GOODS_RECEIVED_MUTATE';
                    ALTER TYPE permission_type ADD VALUE 'GOODS_RECEIVED_AUTHORISE';
                "#
            )?;
        }

        Ok(())
    }
}

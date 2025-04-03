use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_name_store_join_constraint"
    }

    // OMS central now has an endpoint where remote sites can add name_store_join records
    // when they want to add patient visibility.
    // It is possible the patient does not exist on OMS Central, so name_link_id reference
    // may not exist, thus we need to remove the FK constraint.

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            let result = sql!(
                connection,
                r#"
                    ALTER TABLE name_store_join DROP CONSTRAINT name_store_join_name_link_id_fkey;
                "#
            );
            if result.is_err() {
                log::warn!("Failed to drop FK constraint on name_link_id column of name_store_join table, please check name of constraint");
            }
        } else {
            sql!(
                connection,
                r#"
                PRAGMA foreign_keys = OFF;              
                ALTER TABLE name_store_join RENAME TO name_store_join_old;              

                CREATE TABLE name_store_join (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    name_is_customer BOOLEAN NOT NULL,
                    name_is_supplier BOOLEAN NOT NULL,
                    is_sync_update BOOLEAN NOT NULL DEFAULT FALSE,
                    name_link_id TEXT NOT NULL
                );
                
                INSERT INTO name_store_join (
                    id,
                    store_id,
                    name_is_customer,
                    name_is_supplier,
                    is_sync_update,
                    name_link_id
                )
                SELECT 
                    id,
                    store_id,
                    name_is_customer,
                    name_is_supplier,
                    is_sync_update,
                    name_link_id
                 FROM name_store_join_old;

                DROP TABLE name_store_join_old;
                PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        Ok(())
    }
}

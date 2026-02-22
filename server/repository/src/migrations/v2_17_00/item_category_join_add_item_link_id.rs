use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "item_category_join_add_item_link_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TABLE item_category_join
                ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
            
                UPDATE item_category_join
                SET item_link_id = item_id;
            
                ALTER TABLE item_category_join ADD CONSTRAINT item_category_join_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES item_link(id);
           "#,
        )?;

        #[cfg(not(feature = "postgres"))]
        sql!(
            connection,
            r#"
                PRAGMA foreign_keys = OFF;
                ALTER TABLE item_category_join
                ADD COLUMN item_link_id TEXT NOT NULL REFERENCES item_link (id) DEFAULT 'temp_for_migration'; 
                UPDATE item_category_join SET item_link_id = item_id;
                PRAGMA foreign_keys = ON;
         "#,
        )?;

        sql!(
            connection,
            r#"
            DROP INDEX IF EXISTS index_item_category_join_item_id_fkey;
            ALTER TABLE item_category_join DROP COLUMN item_id;
            CREATE INDEX "index_item_category_join_item_link_id_fkey" ON "item_category_join" ("item_link_id");
            "#
        )?;

        Ok(())
    }
}

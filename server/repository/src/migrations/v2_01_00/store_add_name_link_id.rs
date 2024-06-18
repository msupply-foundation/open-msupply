use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        -- Drop views early
        -- These views are re-created in the decimal_pack_size migration
        DROP VIEW stock_on_hand;
        DROP VIEW store_items;
        DROP VIEW IF EXISTS consumption;
        -- Recreated below
        DROP VIEW report_store;
    "#,
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding store.name_link_id
        DROP INDEX index_store_name_id_fkey;
        ALTER TABLE store ADD COLUMN name_link_id TEXT;
        
        UPDATE store SET name_link_id = name_id;

        ALTER TABLE store ADD CONSTRAINT store_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
        ALTER TABLE store DROP COLUMN name_id;
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        CREATE TABLE store_new (
          id TEXT NOT NULL PRIMARY KEY,
          name_link_id TEXT NOT NULL REFERENCES name_link(id),
          code TEXT NOT NULL,
          site_id INTEGER NOT NULL,
          disabled BOOLEAN DEFAULT FALSE NOT NULL,
          logo TEXT,
          store_mode TEXT DEFAULT 'STORE' NOT NULL,
          created_date TEXT
        );

        INSERT INTO store_new SELECT * FROM store;

        PRAGMA foreign_keys=off;
        DROP TABLE store;
        ALTER TABLE store_new RENAME TO store;
        PRAGMA foreign_keys=on;
     "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE VIEW report_store AS
        SELECT
            store.id,
            store.code,
            store.store_mode,
            store.logo,
            name.name
        FROM store
        JOIN name_link ON store.name_link_id = name_link.id
        JOIN name ON name_link.name_id = name.id;
        "#,
    )?;

    Ok(())
}

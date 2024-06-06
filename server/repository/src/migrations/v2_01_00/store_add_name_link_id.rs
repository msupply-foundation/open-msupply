use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        DROP VIEW report_store;
    "#,
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding store.name_link_id
        DROP INDEX index_store_name_id_fkey;
        ALTER TABLE store
        ADD COLUMN name_link_id TEXT;
        
        UPDATE store
        SET name_link_id = name_id;

        ALTER TABLE store ADD CONSTRAINT store_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
        ALTER TABLE store DROP COLUMN name_id;
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Drop views early
        DROP VIEW stock_on_hand;
        DROP VIEW store_items;
        -- consumption is recreated later in this migration
        DROP VIEW IF EXISTS consumption;

        PRAGMA foreign_keys=off;

        CREATE TABLE store_new (
          id TEXT NOT NULL PRIMARY KEY,
          name_link_id TEXT NOT NULL REFERENCES name_link(id),
          code TEXT NOT NULL,
          site_id INTEGER NOT NULL,
          logo TEXT,
          store_mode TEXT DEFAULT 'STORE' NOT NULL,
          created_date TEXT
        );

        INSERT INTO store_new SELECT * FROM store;

        DROP TABLE store;
        ALTER TABLE store_new RENAME TO store;

        PRAGMA foreign_keys=on;

        CREATE VIEW store_items AS
        SELECT i.id as item_id, sl.store_id, sl.pack_size, sl.available_number_of_packs
        FROM
          item i
          LEFT JOIN item_link il ON il.item_id = i.id
          LEFT JOIN stock_line sl ON sl.item_link_id = il.id
          LEFT JOIN store s ON s.id = sl.store_id;

        CREATE VIEW stock_on_hand AS
        SELECT
          'n/a' AS id,
          items_and_stores.item_id AS item_id,
          items_and_stores.item_name AS item_name,
          items_and_stores.store_id AS store_id,
          COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand
        FROM
          (
            SELECT
              item.id AS item_id,
              item.name AS item_name,
              store.id AS store_id
            FROM
              item,
              store
          ) AS items_and_stores
          LEFT OUTER JOIN (
            SELECT
              item_id,
              store_id,
              SUM(pack_size * available_number_of_packs) AS available_stock_on_hand
            FROM
              store_items
            WHERE
              store_items.available_number_of_packs > 0
            GROUP BY
              item_id,
              store_id
          ) AS stock ON stock.item_id = items_and_stores.item_id
          AND stock.store_id = items_and_stores.store_id
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

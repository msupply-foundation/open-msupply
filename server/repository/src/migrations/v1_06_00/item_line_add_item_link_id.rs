use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        -- Adding stock_take_line.item_link_id
        -- Disable foreign key checks to avoid firing constraints on adding new FK column (SQLite)
        PRAGMA foreign_keys = OFF;
        
        ALTER TABLE stock_line
        ADD COLUMN item_link_id TEXT NOT NULL REFERENCES item_link (id) DEFAULT 'temp_for_migration'; -- Can't have NOT NULL without a default... no PRAGMA for turning constraints off!
        
        UPDATE stock_line
        SET
        item_link_id = item_id;
        
        PRAGMA foreign_keys = ON;
        
        -- Dropping stock_line.item_id
        -- Drop index on stock_line.item_id first to avoid errors
        DROP INDEX IF EXISTS index_stock_line_item_id_fkey;
        -- Drop stock_on_hand early to avoid errors 
        DROP VIEW IF EXISTS stock_on_hand;
        ALTER TABLE stock_line
        DROP COLUMN item_id;
        
        -- Recreate stock_on_hand taking into account new model
        CREATE VIEW
          store_items AS
        SELECT
          *
        FROM
          item
          LEFT JOIN item_link ON item_link.item_id = item.id
          LEFT JOIN stock_line ON stock_line.item_link_id = item_link.id
          LEFT JOIN store ON store.id = stock_line.store_id;
        
        CREATE VIEW
          stock_on_hand AS
        SELECT
          'n/a' AS id,
          items_and_stores.item_id AS item_id,
          items_and_stores.store_id AS store_id,
          COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand
        FROM
          (
            SELECT
              item.id AS item_id,
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
          AND stock.store_id = items_and_stores.store_id;

          CREATE INDEX "index_stock_line_item_link_id_fkey" ON "stock_line" ("item_link_id");
        "#,
    )?;

    Ok(())
}

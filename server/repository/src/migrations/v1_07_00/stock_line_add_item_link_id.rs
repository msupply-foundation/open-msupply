use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding stock_line.item_link_id
        ALTER TABLE stock_line
        ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE stock_line
        SET item_link_id = item_id;
        
        ALTER TABLE stock_line ADD CONSTRAINT stock_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES item_link(id);
       "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding stock_line.item_link_id
        -- Disable foreign key checks to avoid firing constraints on adding new FK column
        PRAGMA foreign_keys = OFF;

        ALTER TABLE stock_line
        ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES item_link(id); -- Can't have NOT NULL without a default... no sqlite PRAGMA for turning constraints off!
        
        UPDATE stock_line
        SET item_link_id = item_id;

        PRAGMA foreign_keys = ON;
     "#,
    )?;

    let casting = if cfg!(feature = "postgres") {
        "::BIGINT"
    } else {
        ""
    };

    sql!(
        connection,
        r#"
        CREATE INDEX "index_stock_line_item_link_id_fkey" ON "stock_line" ("item_link_id");

        -- Dropping stock_line.item_id
        -- Drop index on stock_line.item_id first to avoid errors
        DROP INDEX index_stock_line_item_id_fkey;
        -- Drop stock_on_hand early to avoid errors 
        DROP VIEW stock_on_hand;
        ALTER TABLE stock_line
        DROP COLUMN item_id;
  
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
              SUM(pack_size * available_number_of_packs){} AS available_stock_on_hand
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
        casting
    )?;

    Ok(())
}

use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // re-create stock_on_hand and store_items
    sql!(
        connection,
        r#"
        DROP VIEW IF EXISTS stock_on_hand;
        DROP VIEW IF EXISTS store_items;
        "#,
    )?;
    sql!(
        connection,
        r#"
        CREATE VIEW store_items AS
        SELECT i.id as item_id, sl.store_id, sl.pack_size, sl.available_number_of_packs, sl.total_number_of_packs
        FROM
          item i
          LEFT JOIN item_link il ON il.item_id = i.id
          LEFT JOIN stock_line sl ON sl.item_link_id = il.id
          LEFT JOIN store s ON s.id = sl.store_id
        "#,
    )?;
    sql!(
        connection,
        r#"
        CREATE VIEW stock_on_hand AS
        SELECT
          'n/a' AS id,
          items_and_stores.item_id AS item_id,
          items_and_stores.item_name AS item_name,
          items_and_stores.store_id AS store_id,
          COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand,
          COALESCE(stock.total_stock_on_hand, 0) AS total_stock_on_hand
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
              SUM(pack_size * available_number_of_packs) AS available_stock_on_hand,
              SUM(pack_size * total_number_of_packs) AS total_stock_on_hand
            FROM
              store_items
            WHERE
              store_items.available_number_of_packs > 0 OR store_items.total_number_of_packs > 0
            GROUP BY
              item_id,
              store_id
          ) AS stock ON stock.item_id = items_and_stores.item_id
          AND stock.store_id = items_and_stores.store_id
     "#
    )?;

    Ok(())
}

use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    let casting = if cfg!(feature = "postgres") {
        "::BIGINT"
    } else {
        ""
    };

    sql!(
        connection,
        r#"
        DROP VIEW stock_on_hand;

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

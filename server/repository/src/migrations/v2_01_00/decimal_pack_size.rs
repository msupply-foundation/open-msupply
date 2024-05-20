use crate::migrations::*;

use super::ledger::{create_ledger_views, drop_ledger_views};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    drop_ledger_views(connection)?;
    // drop other views affected by the pack_size type update
    sql!(
        connection,
        r#"
            DROP VIEW stock_on_hand;
            DROP VIEW store_items;
            "#,
    )?;

    rename_pack_size_columns(connection)?;

    create_ledger_views(connection)?;
    // re-create stock_on_hand and store_items
    sql!(
        connection,
        r#"
        CREATE VIEW store_items AS
        SELECT i.id as item_id, sl.store_id, sl.pack_size, sl.available_number_of_packs
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

    Ok(())
}

#[cfg(not(feature = "postgres"))]
fn rename_pack_size_columns(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE stocktake_line RENAME COLUMN pack_size TO pack_size_old;
        ALTER TABLE stocktake_line ADD COLUMN pack_size REAL;
        UPDATE stocktake_line SET pack_size = pack_size_old;
        ALTER TABLE stocktake_line DROP COLUMN pack_size_old;
        "#,
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE barcode RENAME COLUMN pack_size TO pack_size_old;
        ALTER TABLE barcode ADD COLUMN pack_size REAL;
        UPDATE barcode SET pack_size = pack_size_old;
        ALTER TABLE barcode DROP COLUMN pack_size_old;
        "#,
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE stock_line RENAME COLUMN pack_size TO pack_size_old;
        ALTER TABLE stock_line ADD COLUMN pack_size REAL NOT NULL DEFAULT 0;
        UPDATE stock_line SET pack_size = pack_size_old;
        ALTER TABLE stock_line DROP COLUMN pack_size_old;
        "#,
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE pack_variant RENAME COLUMN pack_size TO pack_size_old;
        ALTER TABLE pack_variant ADD COLUMN pack_size REAL NOT NULL DEFAULT 0;
        UPDATE pack_variant SET pack_size = pack_size_old;
        ALTER TABLE pack_variant DROP COLUMN pack_size_old;
        "#,
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE invoice_line RENAME COLUMN pack_size TO pack_size_old;
        ALTER TABLE invoice_line ADD COLUMN pack_size REAL NOT NULL DEFAULT 0;
        UPDATE invoice_line SET pack_size = pack_size_old;
        ALTER TABLE invoice_line DROP COLUMN pack_size_old;
        "#,
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE item RENAME COLUMN default_pack_size TO default_pack_size_old;
        ALTER TABLE item ADD COLUMN default_pack_size REAL NOT NULL DEFAULT 0;
        UPDATE item SET default_pack_size = default_pack_size_old;
        ALTER TABLE item DROP COLUMN default_pack_size_old;
        "#,
    )?;

    Ok(())
}

#[cfg(feature = "postgres")]
fn rename_pack_size_columns(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE stocktake_line ALTER COLUMN pack_size TYPE DOUBLE PRECISION using pack_size;
        ALTER TABLE barcode ALTER COLUMN pack_size TYPE DOUBLE PRECISION using pack_size;
        ALTER TABLE stock_line ALTER COLUMN pack_size TYPE DOUBLE PRECISION using pack_size;
        ALTER TABLE pack_variant ALTER COLUMN pack_size TYPE DOUBLE PRECISION using pack_size;
        ALTER TABLE invoice_line ALTER COLUMN pack_size TYPE DOUBLE PRECISION using pack_size;
        ALTER TABLE item ALTER COLUMN default_pack_size TYPE DOUBLE PRECISION using default_pack_size;
        "#,
    )?;
    Ok(())
}

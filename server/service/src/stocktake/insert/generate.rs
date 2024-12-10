use chrono::{NaiveDate, Utc};
use repository::{
    DateFilter, EqualFilter, ItemRowRepository, ItemType, MasterListLineFilter,
    MasterListLineRepository, NumberRowType, RepositoryError, StockLineFilter, StockLineRepository,
    StockLineRow, StocktakeLineRow, StocktakeRow, StocktakeStatus, StorageConnection,
};
use util::uuid::uuid;

use crate::{number::next_number, NullableUpdate};

use super::InsertStocktake;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertStocktake {
        id,
        comment,
        description,
        stocktake_date,
        is_locked,
        location,
        master_list_id,
        items_have_stock,
        expires_before,
    }: InsertStocktake,
) -> Result<(StocktakeRow, Vec<StocktakeLineRow>), RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;

    let master_list_lines = match master_list_id {
        Some(master_list_id) => {
            generate_lines_from_master_list(connection, store_id, &id, &master_list_id)?
        }
        None => Vec::new(),
    };
    let location_lines = match location {
        Some(NullableUpdate {
            value: Some(location_id),
            ..
        }) => generate_lines_from_location(connection, store_id, &id, &location_id)?,
        _ => Vec::new(),
    };
    let items_have_stock_lines = match items_have_stock {
        Some(_) => generate_lines_with_stock(connection, store_id, &id)?,
        None => Vec::new(),
    };
    let expiring_items_lines = match expires_before {
        Some(expires_before) => {
            generate_lines_expiring_before(connection, store_id, &id, &expires_before)?
        }
        None => Vec::new(),
    };
    let lines = [
        master_list_lines,
        location_lines,
        items_have_stock_lines,
        expiring_items_lines,
    ]
    .concat();

    Ok((
        StocktakeRow {
            id,
            stocktake_number,
            comment,
            description,
            // TODO: Changing this to be same as created datetime for now since function is disabled in frontend
            // but will need to remove this later when functionality is
            stocktake_date: if stocktake_date.is_some() {
                stocktake_date
            } else {
                Some(Utc::now().naive_utc().date())
            },
            status: StocktakeStatus::New,
            created_datetime: Utc::now().naive_utc(),
            user_id: user_id.to_string(),
            store_id: store_id.to_string(),
            is_locked: is_locked.unwrap_or(false),
            // Default
            finalised_datetime: None,
            inventory_addition_id: None,
            inventory_reduction_id: None,
        },
        lines,
    ))
}

pub fn generate_lines_from_master_list(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    master_list_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let item_ids: Vec<String> = MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(master_list_id))
                .item_type(ItemType::Stock.equal_to()),
        )?
        .into_iter()
        .map(|r| r.item_id)
        .collect();

    let mut result = Vec::<StocktakeLineRow>::new();

    item_ids.iter().for_each(|item_id| {
        let stock_lines = StockLineRepository::new(connection)
            .query_by_filter(
                StockLineFilter::new()
                    .item_id(EqualFilter::equal_to(item_id))
                    .store_id(EqualFilter::equal_to(store_id))
                    .has_packs_in_store(true),
                Some(store_id.to_string()),
            )
            .unwrap();
        let item_name = ItemRowRepository::new(connection)
            .find_active_by_id(item_id)
            .unwrap()
            .unwrap()
            .name;

        if stock_lines.is_empty() {
            result.push(StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: 0.0,
                item_link_id: item_id.to_string(),
                item_name,
                location_id: None,
                batch: None,
                expiry_date: None,
                note: None,
                stock_line_id: None,
                pack_size: None,
                cost_price_per_pack: None,
                sell_price_per_pack: None,
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
                item_variant_id: None,
            });
        } else {
            stock_lines.into_iter().for_each(|line| {
                let StockLineRow {
                    id: stock_line_id,
                    item_link_id: _,
                    location_id,
                    batch,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    total_number_of_packs,
                    expiry_date,
                    note,
                    supplier_link_id: _,
                    store_id: _,
                    on_hold: _,
                    available_number_of_packs: _,
                    barcode_id: _,
                    item_variant_id,
                } = line.stock_line_row;

                result.push(StocktakeLineRow {
                    id: uuid(),
                    stocktake_id: stocktake_id.to_string(),
                    snapshot_number_of_packs: total_number_of_packs,
                    item_link_id: line.item_row.id,
                    item_name: line.item_row.name,
                    location_id,
                    batch,
                    expiry_date,
                    note,
                    stock_line_id: Some(stock_line_id),
                    pack_size: Some(pack_size),
                    cost_price_per_pack: Some(cost_price_per_pack),
                    sell_price_per_pack: Some(sell_price_per_pack),
                    comment: None,
                    counted_number_of_packs: None,
                    inventory_adjustment_reason_id: None,
                    item_variant_id,
                });
            });
        }
    });

    Ok(result)
}

pub fn generate_lines_from_location(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    location_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new()
            .location_id(EqualFilter::equal_to(location_id))
            .store_id(EqualFilter::equal_to(store_id))
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_link_id: _,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_link_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
                barcode_id: _,
                item_variant_id,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_link_id: line.item_row.id,
                item_name: line.item_row.name,
                location_id,
                batch,
                expiry_date,
                note,
                stock_line_id: Some(stock_line_id),
                pack_size: Some(pack_size),
                cost_price_per_pack: Some(cost_price_per_pack),
                sell_price_per_pack: Some(sell_price_per_pack),
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
                item_variant_id,
            }
        })
        .collect();
    Ok(result)
}

pub fn generate_lines_with_stock(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_link_id: _,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_link_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
                barcode_id: _,
                item_variant_id,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_link_id: line.item_row.id,
                item_name: line.item_row.name,
                location_id,
                batch,
                expiry_date,
                note,
                stock_line_id: Some(stock_line_id),
                pack_size: Some(pack_size),
                cost_price_per_pack: Some(cost_price_per_pack),
                sell_price_per_pack: Some(sell_price_per_pack),
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
                item_variant_id,
            }
        })
        .collect();
    Ok(result)
}

pub fn generate_lines_expiring_before(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    date: &NaiveDate,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .expiry_date(DateFilter::before_or_equal_to(*date)),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_link_id: _,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_link_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
                barcode_id: _,
                item_variant_id,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_link_id: line.item_row.id,
                location_id,
                batch,
                expiry_date,
                note,
                stock_line_id: Some(stock_line_id),
                pack_size: Some(pack_size),
                cost_price_per_pack: Some(cost_price_per_pack),
                sell_price_per_pack: Some(sell_price_per_pack),
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
                item_name: line.item_row.name,
                item_variant_id,
            }
        })
        .collect();
    Ok(result)
}

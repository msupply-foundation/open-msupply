use chrono::Utc;
use repository::{
    location::LocationFilter, DateFilter, EqualFilter, ItemFilter, ItemRepository, ItemRow,
    ItemType, MasterListFilter, NumberRowType, ProgramRowRepository, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository, StockLineRow, StocktakeLineRow, StocktakeRow,
    StocktakeStatus, StorageConnection,
};
use util::uuid::uuid;

use crate::number::next_number;

use super::InsertStocktake;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertStocktake,
) -> Result<(StocktakeRow, Vec<StocktakeLineRow>), RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;
    let id = input.id.clone();
    let lines = generate_stocktake_lines(connection, store_id, &id, input.clone())?;

    let program_id = match input.master_list_id {
        Some(master_list_id) => ProgramRowRepository::new(connection)
            .find_one_by_id(&master_list_id)?
            .map(|r| r.id),
        None => None,
    };

    Ok((
        StocktakeRow {
            id,
            stocktake_number,
            comment: input.comment,
            stocktake_date: Some(Utc::now().naive_utc().date()),
            status: StocktakeStatus::New,
            created_datetime: Utc::now().naive_utc(),
            user_id: user_id.to_string(),
            store_id: store_id.to_string(),
            is_initial_stocktake: input.is_initial_stocktake.unwrap_or(false),
            description: input.description,
            program_id,
            // Default
            is_locked: false,
            finalised_datetime: None,
            inventory_addition_id: None,
            inventory_reduction_id: None,
            counted_by: None,
            verified_by: None,
        },
        lines,
    ))
}

fn generate_stocktake_lines(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
    InsertStocktake {
        id: _,
        master_list_id,
        location_id,
        expires_before,
        is_initial_stocktake,
        comment: _,
        description: _,
        create_blank_stocktake,
    }: InsertStocktake,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    if let Some(true) = create_blank_stocktake {
        return Ok(Vec::new());
    }

    if let Some(true) = is_initial_stocktake {
        return generate_lines_initial_stocktake(connection, store_id, id);
    }

    let mut stock_line_filter: StockLineFilter = StockLineFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .has_packs_in_store(true);

    if let Some(master_list_id) = master_list_id {
        stock_line_filter = stock_line_filter
            .master_list(MasterListFilter::new().id(EqualFilter::equal_to(&master_list_id)))
    }

    if let Some(location_id) = location_id {
        stock_line_filter = stock_line_filter
            .location(LocationFilter::new().id(EqualFilter::equal_to(&location_id)))
    }

    if let Some(expires_before_date) = expires_before {
        stock_line_filter =
            stock_line_filter.expiry_date(DateFilter::before_or_equal_to(expires_before_date))
    }

    let stock_lines = StockLineRepository::new(connection)
        .query_by_filter(stock_line_filter, Some(store_id.to_string()))?;

    let lines = stock_lines
        .into_iter()
        .map(
            |StockLine {
                 stock_line_row:
                     StockLineRow {
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
                         donor_link_id,
                         vvm_status_id: _,
                         campaign_id: _,
                     },
                 item_row,
                 location_row: _,
                 supplier_name_row: _,
                 barcode_row: _,
                 item_variant_row: _,
                 vvm_status_row: _,
             }| {
                StocktakeLineRow {
                    id: uuid(),
                    stocktake_id: id.to_string(),
                    snapshot_number_of_packs: total_number_of_packs,
                    item_link_id: item_row.id,
                    item_name: item_row.name,
                    location_id: location_id,
                    batch,
                    expiry_date,
                    note,
                    stock_line_id: Some(stock_line_id),
                    pack_size: Some(pack_size),
                    cost_price_per_pack: Some(cost_price_per_pack),
                    sell_price_per_pack: Some(sell_price_per_pack),
                    comment: None,
                    counted_number_of_packs: None,
                    item_variant_id: item_variant_id,
                    donor_link_id: donor_link_id,
                    reason_option_id: None,
                }
            },
        )
        .collect();

    Ok(lines)
}

fn generate_lines_initial_stocktake(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let item_rows: Vec<ItemRow> = ItemRepository::new(connection)
        .query_by_filter(
            ItemFilter::new()
                .is_visible(true)
                .r#type(ItemType::Stock.equal_to()),
            Some(store_id.to_string()),
        )?
        .into_iter()
        .map(|r| r.item_row)
        .collect();

    let result = item_rows
        .into_iter()
        .map(|item| StocktakeLineRow {
            id: uuid(),
            stocktake_id: stocktake_id.to_string(),
            item_link_id: item.id,
            item_name: item.name,
            // Defaults
            snapshot_number_of_packs: 0.0,
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
            item_variant_id: None,
            donor_link_id: None,
            reason_option_id: None,
        })
        .collect();

    Ok(result)
}

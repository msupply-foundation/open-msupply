use chrono::Utc;
use repository::{
    location::LocationFilter, DateFilter, EqualFilter, ItemFilter, ItemRepository, ItemRow,
    ItemRowRepository, ItemType, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    NumberRowType, ProgramRowRepository, RepositoryError, StockLine, StockLineFilter,
    StockLineRepository, StockLineRow, StocktakeLineRow, StocktakeRow, StocktakeStatus,
    StorageConnection,
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
        is_all_items_stocktake,
        comment: _,
        description: _,
        create_blank_stocktake,
        include_all_master_list_items,
        vvm_status_id,
    }: InsertStocktake,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    if let Some(true) = create_blank_stocktake {
        return Ok(Vec::new());
    }

    if let Some(true) = is_initial_stocktake {
        return generate_lines_initial_stocktake(connection, store_id, id);
    }

    if let Some(true) = is_all_items_stocktake {
        return generate_lines_for_all_items(connection, store_id, id);
    }

    if let Some(true) = include_all_master_list_items {
        let master_list_id = match master_list_id {
            Some(id) => id,
            None => {
                return Err(RepositoryError::DBError {
                    msg: "Master list ID is required when including all master list items"
                        .to_string(),
                    extra: "include_all_master_list_items is true".to_string(),
                });
            }
        };
        return generate_lines_from_master_list(connection, store_id, id, &master_list_id);
    }

    let mut stock_line_filter: StockLineFilter = StockLineFilter::new()
        .store_id(EqualFilter::equal_to(store_id.to_string()))
        .has_packs_in_store(true);

    if let Some(master_list_id) = master_list_id {
        stock_line_filter = stock_line_filter
            .master_list(MasterListFilter::new().id(EqualFilter::equal_to(master_list_id.to_string())))
    }

    if let Some(location_id) = location_id {
        stock_line_filter = stock_line_filter
            .location(LocationFilter::new().id(EqualFilter::equal_to(location_id.to_string())))
    }

    if let Some(vvm_status_id) = vvm_status_id {
        stock_line_filter = stock_line_filter.vvm_status_id(EqualFilter::equal_to(vvm_status_id.to_string()));
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
                         location_id,
                         batch,
                         pack_size,
                         cost_price_per_pack,
                         sell_price_per_pack,
                         total_number_of_packs,
                         expiry_date,
                         note,
                         item_variant_id,
                         volume_per_pack,
                         donor_link_id,
                         campaign_id,
                         program_id,
                         vvm_status_id,
                         item_link_id: _,
                         supplier_link_id: _,
                         store_id: _,
                         on_hold: _,
                         available_number_of_packs: _,
                         barcode_id: _,
                         total_volume: _,
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
                    location_id,
                    batch,
                    expiry_date,
                    note,
                    stock_line_id: Some(stock_line_id),
                    pack_size: Some(pack_size),
                    cost_price_per_pack: Some(cost_price_per_pack),
                    sell_price_per_pack: Some(sell_price_per_pack),
                    item_variant_id,
                    donor_link_id,
                    vvm_status_id,
                    volume_per_pack,
                    campaign_id,
                    program_id,
                    counted_number_of_packs: None,
                    comment: None,
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
            vvm_status_id: None,
            volume_per_pack: 0.0,
            campaign_id: None,
            program_id: None,
        })
        .collect();

    Ok(result)
}

pub fn generate_lines_for_all_items(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let item_ids: Vec<String> = ItemRepository::new(connection)
        .query_by_filter(
            ItemFilter::new()
                .visible_or_on_hand(true)
                .r#type(ItemType::Stock.equal_to()),
            Some(store_id.to_string()),
        )?
        .into_iter()
        .map(|r| r.item_row.id)
        .collect();

    generate_lines_from_item_ids(connection, store_id, stocktake_id, item_ids)
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
                .master_list_id(EqualFilter::equal_to(master_list_id.to_string()))
                .item_type(ItemType::Stock.equal_to()),
            None,
        )?
        .into_iter()
        .map(|r| r.item_id)
        .collect();

    generate_lines_from_item_ids(connection, store_id, stocktake_id, item_ids)
}

fn generate_lines_from_item_ids(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    item_ids: Vec<String>,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let mut result = Vec::<StocktakeLineRow>::new();

    item_ids.iter().for_each(|item_id| {
        let stock_lines = StockLineRepository::new(connection)
            .query_by_filter(
                StockLineFilter::new()
                    .item_id(EqualFilter::equal_to(item_id.to_string()))
                    .store_id(EqualFilter::equal_to(store_id.to_string()))
                    .has_packs_in_store(true),
                Some(store_id.to_string()),
            )
            .unwrap();
        let item_name = ItemRowRepository::new(connection)
            .find_active_by_id(item_id)
            .unwrap_or_default()
            .unwrap_or_default()
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
                reason_option_id: None,
                item_variant_id: None,
                donor_link_id: None,
                vvm_status_id: None,
                volume_per_pack: 0.0,
                campaign_id: None,
                program_id: None,
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
                    volume_per_pack,
                    campaign_id,
                    program_id,
                    item_variant_id,
                    donor_link_id,
                    vvm_status_id,
                    supplier_link_id: _,
                    store_id: _,
                    on_hold: _,
                    available_number_of_packs: _,
                    barcode_id: _,
                    total_volume: _,
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
                    item_variant_id,
                    donor_link_id,
                    vvm_status_id,
                    volume_per_pack,
                    campaign_id,
                    program_id,
                    comment: None,
                    reason_option_id: None,
                    counted_number_of_packs: None,
                });
            });
        }
    });

    Ok(result)
}

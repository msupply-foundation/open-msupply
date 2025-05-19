use repository::{StocktakeLine, StocktakeLineRow};

use super::{UpdateStocktakeLine, UpdateStocktakeLineError};

pub fn generate(
    existing: StocktakeLine,
    UpdateStocktakeLine {
        id: _,
        location,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        item_variant_id,
        donor_id,
        reason_option_id,
    }: UpdateStocktakeLine,
) -> Result<StocktakeLineRow, UpdateStocktakeLineError> {
    let existing_line = existing.line;

    let item_variant_id: Option<String> = match item_variant_id {
        Some(update) => match update.value {
            Some(id) => Some(id),
            None => None,
        },
        None => existing_line.item_variant_id,
    };

    let donor_link_id: Option<String> = match donor_id {
        Some(update) => match update.value {
            Some(id) => Some(id),
            None => None,
        },
        None => existing_line.donor_link_id,
    };

    Ok(StocktakeLineRow {
        id: existing_line.id,
        stocktake_id: existing_line.stocktake_id,
        stock_line_id: existing_line.stock_line_id,
        location_id: location
            .map(|l| l.value)
            .unwrap_or(existing_line.location_id),
        comment: comment.or(existing_line.comment),

        snapshot_number_of_packs: snapshot_number_of_packs
            .unwrap_or(existing_line.snapshot_number_of_packs),
        counted_number_of_packs: counted_number_of_packs.or(existing_line.counted_number_of_packs),

        item_link_id: existing.item.id,
        item_name: existing_line.item_name,
        expiry_date: expiry_date.or(existing_line.expiry_date),
        batch: batch.or(existing_line.batch),
        pack_size: pack_size.or(existing_line.pack_size),
        cost_price_per_pack: cost_price_per_pack.or(existing_line.cost_price_per_pack),
        sell_price_per_pack: sell_price_per_pack.or(existing_line.sell_price_per_pack),
        note: note.or(existing_line.note),
        item_variant_id,
        donor_link_id,
        reason_option_id: reason_option_id.or(existing_line.reason_option_id),
    })
}

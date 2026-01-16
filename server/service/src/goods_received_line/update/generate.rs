use repository::{goods_received_line_row::GoodsReceivedLineRow, RepositoryError};

use super::UpdateGoodsReceivedLineInput;

pub fn generate(
    existing_line: GoodsReceivedLineRow,
    UpdateGoodsReceivedLineInput {
        id: _,
        batch,
        expiry_date,
        number_of_packs_received,
        received_pack_size,
        manufacturer_id,
        comment,
    }: UpdateGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, RepositoryError> {
    let mut updated_line = existing_line;

    if let Some(new_batch) = batch {
        updated_line.batch = Some(new_batch);
    }

    if let Some(new_expiry) = expiry_date {
        updated_line.expiry_date = Some(new_expiry);
    }

    if let Some(new_packs) = number_of_packs_received {
        updated_line.number_of_packs_received = new_packs;
    }

    if let Some(new_pack_size) = received_pack_size {
        updated_line.received_pack_size = new_pack_size;
    }

    if let Some(new_manufacturer_id) = manufacturer_id {
        updated_line.manufacturer_id = Some(new_manufacturer_id);
    }

    if let Some(new_comment) = comment {
        updated_line.comment = Some(new_comment);
    }

    Ok(updated_line)
}

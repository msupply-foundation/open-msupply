use repository::{
    EqualFilter, GoodsReceivedLineFilter, GoodsReceivedLineRepository, StorageConnection,
};

use crate::goods_received_line::{
    insert::InsertGoodsReceivedLineInput,
    save_goods_received_lines::{
        SaveGoodsReceivedLine, SaveGoodsReceivedLinesError, SaveGoodsReceivedLinesInput,
    },
    update::UpdateGoodsReceivedLineInput,
};

pub struct GenerateResult {
    pub lines_to_add: Vec<InsertGoodsReceivedLineInput>,
    pub lines_to_update: Vec<UpdateGoodsReceivedLineInput>,
    pub lines_to_delete: Vec<String>,
}

// TODO: Should we check if received_pack_size or/and number_of_packs_received are set?

pub fn generate(
    connection: &StorageConnection,
    SaveGoodsReceivedLinesInput {
        goods_received_id,
        purchase_order_line_id,
        lines,
    }: SaveGoodsReceivedLinesInput,
) -> Result<GenerateResult, SaveGoodsReceivedLinesError> {
    let existing_lines = GoodsReceivedLineRepository::new(connection).query_by_filter(
        GoodsReceivedLineFilter::new()
            .goods_received_id(EqualFilter::equal_to(goods_received_id.to_string())),
    )?;

    let check_already_exists = |id: &str| {
        existing_lines
            .iter()
            .any(|line| line.goods_received_line_row.id == id)
    };

    let check_in_input = |id: &str| lines.iter().any(|line| line.id == id);

    let lines_to_add = lines
        .clone()
        .into_iter()
        .filter(|line| !check_already_exists(&line.id))
        .map(
            |SaveGoodsReceivedLine {
                 id,
                 batch,
                 expiry_date,
                 number_of_packs_received,
                 received_pack_size,
                 manufacturer_id,
                 comment,
             }| InsertGoodsReceivedLineInput {
                id,
                goods_received_id: goods_received_id.clone(),
                purchase_order_line_id: purchase_order_line_id.clone(),
                batch,
                expiry_date,
                number_of_packs_received,
                received_pack_size,
                manufacturer_id,
                comment,
            },
        )
        .collect();

    let lines_to_update = lines
        .clone()
        .into_iter()
        .filter(|line| check_already_exists(&line.id))
        .map(
            |SaveGoodsReceivedLine {
                 id,
                 batch,
                 expiry_date,
                 number_of_packs_received,
                 received_pack_size,
                 manufacturer_id,
                 comment,
             }| UpdateGoodsReceivedLineInput {
                id,
                batch,
                expiry_date,
                number_of_packs_received,
                received_pack_size,
                manufacturer_id,
                comment,
            },
        )
        .collect();

    // Checks if the existing line is not in the input lines
    // If it is not, it means it should be deleted
    let lines_to_delete = existing_lines
        .into_iter()
        .filter(|existing_line| !check_in_input(&existing_line.goods_received_line_row.id))
        .map(|existing_line| existing_line.goods_received_line_row.id)
        .collect();

    Ok(GenerateResult {
        lines_to_add,
        lines_to_update,
        lines_to_delete,
    })
}

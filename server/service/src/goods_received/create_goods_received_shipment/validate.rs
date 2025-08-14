use crate::StorageConnection;
use repository::goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus};
use repository::{
    GoodsReceivedLineRow, PurchaseOrderLineRow, PurchaseOrderLineRowRepository,
    PurchaseOrderRowRepository, PurchaseOrderStatus,
};

use crate::goods_received::common::check_goods_received_exists;
use crate::goods_received::create_goods_received_shipment::{
    CreateGoodsReceivedShipment, OutError,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &CreateGoodsReceivedShipment,
) -> Result<
    (
        String,
        GoodsReceivedRow,
        Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)>,
    ),
    OutError,
> {
    let goods_received = check_goods_received_exists(connection, &input.goods_received_id)?
        .ok_or(OutError::GoodsReceivedDoesNotExist)?;

    if goods_received.store_id != store_id {
        return Err(OutError::NotThisStoreGoodsReceived);
    }

    if goods_received.status != GoodsReceivedStatus::Finalised {
        return Err(OutError::GoodsReceivedNotFinalised);
    }

    let purchase_order = match goods_received.purchase_order_id.clone() {
        Some(purchase_order_id) => {
            match PurchaseOrderRowRepository::new(connection).find_one_by_id(&purchase_order_id) {
                Ok(Some(order)) => order,
                _ => return Err(OutError::PurchaseOrderDoesNotExist),
            }
        }
        None => return Err(OutError::PurchaseOrderDoesNotExist),
    };

    if purchase_order.status != PurchaseOrderStatus::Finalised {
        return Err(OutError::PurchaseOrderNotFinalised);
    }

    if purchase_order.store_id != store_id {
        return Err(OutError::NotThisStorePurchaseOrder);
    }

    let supplier_name_link = purchase_order.supplier_name_link_id.clone();

    // TODO add goods received lines query once we have repository layer from 8183-print-goods-received-form
    // ALSO todo filter for is_authorised boolean
    let goods_received_lines: Vec<GoodsReceivedLineRow> = Vec::new();

    // TODO add this check once we actually have repository layer for goods received line
    // if goods_received_lines.is_empty() {
    //     return Err(OutError::GoodsReceivedEmpty);
    // }

    let purchase_order_lines = PurchaseOrderLineRowRepository::new(connection)
        .find_many_by_purchase_order_ids(&[purchase_order.id])?;

    let mut line_map: Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)> = Vec::new();
    let mut unfound_lines: Vec<String> = Vec::new();

    for line in goods_received_lines {
        match purchase_order_lines
            .iter()
            .find(|po_line| po_line.id == line.purchase_order_line_id)
        {
            Some(po_line) => {
                line_map.push((line.clone(), po_line.clone()));
            }
            None => {
                unfound_lines.push(line.purchase_order_line_id.clone());
            }
        };
    }

    if !unfound_lines.is_empty() {
        return Err(OutError::PurchaseOrderLinesNotFound(unfound_lines));
    }

    Ok((supplier_name_link, goods_received, line_map))
}

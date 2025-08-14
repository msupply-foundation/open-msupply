use repository::goods_received_row::GoodsReceivedStatus;
use repository::{
    goods_received_line_row::GoodsReceivedLineRow, goods_received_row::GoodsReceivedRow,
    StorageConnection,
};
use repository::{
    PurchaseOrderLineRow, PurchaseOrderLineRowRepository, PurchaseOrderRowRepository,
};

use crate::goods_received::common::check_goods_received_exists;
use crate::goods_received::create_goods_received_shipment::{
    CreateGoodsReceivedShipment, CreateGoodsReceivedShipmentError, OutError,
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
    CreateGoodsReceivedShipmentError,
> {
    let goods_received = check_goods_received_exists(connection, &input.goods_received_id)?
        .ok_or(CreateGoodsReceivedShipmentError::GoodsReceivedDoesNotExist)?;

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
                _ => return Err(CreateGoodsReceivedShipmentError::ProblemGettingOtherParty),
            }
        }
        None => return Err(CreateGoodsReceivedShipmentError::ProblemGettingOtherParty),
    };

    let supplier_name_link = purchase_order.supplier_name_link_id.clone();

    // TODO add goods received lines query once we have repository layer from 8183-print-goods-received-form
    // ALSO todo filter for is_authorised boolean
    let goods_received_lines: Vec<GoodsReceivedLineRow> = vec![];
    let purchase_order_lines = PurchaseOrderLineRowRepository::new(connection)
        .find_many_by_purchase_order_ids(&[purchase_order.id])?;

    let line_map: Vec<(GoodsReceivedLineRow, PurchaseOrderLineRow)> = goods_received_lines
        .iter()
        .filter_map(|line| {
            let po_line = purchase_order_lines
                .iter()
                .find(|po_line| po_line.id == line.purchase_order_line_id)?;
            Some((line.clone(), po_line.clone()))
        })
        .collect();

    Ok((supplier_name_link, goods_received, line_map))
}

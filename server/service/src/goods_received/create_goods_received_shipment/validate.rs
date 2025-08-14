use repository::goods_received_row::GoodsReceivedStatus;
use repository::PurchaseOrderRowRepository;
use repository::{
    goods_received_line_row::GoodsReceivedLineRow, goods_received_row::GoodsReceivedRow,
    StorageConnection,
};

use crate::goods_received::common::check_goods_received_exists;
use crate::goods_received::create_goods_received_shipment::{
    CreateGoodsReceivedShipment, CreateGoodsReceivedShipmentError, OutError,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &CreateGoodsReceivedShipment,
) -> Result<(String, GoodsReceivedRow, Vec<GoodsReceivedLineRow>), CreateGoodsReceivedShipmentError>
{
    let goods_received = check_goods_received_exists(connection, &input.goods_received_id)?
        .ok_or(CreateGoodsReceivedShipmentError::GoodsReceivedDoesNotExist)?;

    if goods_received.store_id != store_id {
        return Err(OutError::NotThisStoreGoodsReceived);
    }

    if goods_received.status != GoodsReceivedStatus::Finalised {
        return Err(OutError::GoodsReceivedNotFinalised);
    }

    // later can return all of PO if we need other values
    let supplier_name_link = match goods_received.purchase_order_id.clone() {
        Some(purchase_order_id) => {
            match PurchaseOrderRowRepository::new(connection).find_one_by_id(&purchase_order_id) {
                Ok(Some(order)) => order.supplier_name_link_id,
                _ => return Err(CreateGoodsReceivedShipmentError::ProblemGettingOtherParty),
            }
        }
        None => return Err(CreateGoodsReceivedShipmentError::ProblemGettingOtherParty),
    };

    // TODO add goods received lines query once we have repository layer from 8183-print-goods-received-form
    let goods_received_lines = vec![];

    Ok((supplier_name_link, goods_received, goods_received_lines))
}

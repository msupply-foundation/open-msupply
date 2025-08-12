use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository},
    InvoiceRowRepository, PurchaseOrderRowRepository, StorageConnection,
};

use crate::{
    goods_received::update::{UpdateGoodsReceivedError, UpdateGoodsReceivedInput},
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
    NullableUpdate,
};

pub fn validate(
    input: &UpdateGoodsReceivedInput,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<GoodsReceivedRow, UpdateGoodsReceivedError> {
    let goods_received = GoodsReceivedRowRepository::new(connection).find_one_by_id(&input.id)?;
    let goods_received =
        goods_received.ok_or(UpdateGoodsReceivedError::GoodsReceivedDoesNotExist)?;

    if let Some(purchase_order_id) = &input.purchase_order_id {
        let purchase_order =
            PurchaseOrderRowRepository::new(connection).find_one_by_id(purchase_order_id)?;
        if purchase_order.is_none() {
            return Err(UpdateGoodsReceivedError::PurchaseOrderDoesNotExist);
        }
    }

    if let Some(NullableUpdate {
        value: Some(inbound_shipment_id),
    }) = &input.inbound_shipment_id
    {
        let inbound_shipment =
            InvoiceRowRepository::new(connection).find_one_by_id(inbound_shipment_id)?;
        if inbound_shipment.is_none() {
            return Err(UpdateGoodsReceivedError::InboundShipmentDoesNotExist);
        }
    }

    if let Some(NullableUpdate {
        value: Some(donor_id),
    }) = &input.donor_link_id
    {
        check_other_party(connection, store_id, donor_id, CheckOtherPartyType::Donor).map_err(
            |error| match error {
                OtherPartyErrors::OtherPartyDoesNotExist
                | OtherPartyErrors::OtherPartyNotVisible => {
                    UpdateGoodsReceivedError::DonorDoesNotExist
                }
                OtherPartyErrors::DatabaseError(e) => UpdateGoodsReceivedError::DatabaseError(e),
                _ => UpdateGoodsReceivedError::DonorDoesNotExist,
            },
        )?;
    }

    Ok(goods_received)
}

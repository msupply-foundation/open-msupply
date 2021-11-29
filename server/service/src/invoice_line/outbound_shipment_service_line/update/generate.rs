use repository::schema::{InvoiceLineRow, ItemRow};

use super::{UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError};

pub fn generate(
    input: UpdateOutboundShipmentServiceLine,
    existing_line: InvoiceLineRow,
    item: ItemRow,
) -> Result<InvoiceLineRow, UpdateOutboundShipmentServiceLineError> {
    // 1) Use name from input (if specified)
    // 2) else: if item has been updated use name from the updated item name
    // 3) else: use existing line name
    let item_name = if let Some(input_name) = input.name {
        input_name
    } else if input.item_id.is_some() && input.item_id != Some(existing_line.item_id.to_owned()) {
        item.name
    } else {
        existing_line.item_name
    };

    let update_line = InvoiceLineRow {
        id: input.id,
        invoice_id: input.invoice_id,
        item_id: input.item_id.unwrap_or(existing_line.item_id),
        item_name,
        total_after_tax: input
            .total_after_tax
            .unwrap_or(existing_line.total_after_tax),
        note: input.note.or(existing_line.note),

        // keep stock related fields
        location_id: existing_line.location_id,
        pack_size: existing_line.pack_size,
        batch: existing_line.batch,
        expiry_date: existing_line.expiry_date,
        sell_price_per_pack: existing_line.sell_price_per_pack,
        cost_price_per_pack: existing_line.cost_price_per_pack,
        number_of_packs: existing_line.number_of_packs,
        item_code: existing_line.item_code,
        stock_line_id: existing_line.stock_line_id,
    };

    Ok(update_line)
}

#[cfg(test)]
mod outbound_shipment_service_line_update_test {
    use repository::mock::{mock_items, mock_outbound_shipment_invoice_lines};

    use super::*;

    #[test]
    fn test_name_update() {
        let mut line = mock_outbound_shipment_invoice_lines()
            .get(0)
            .unwrap()
            .clone();
        let items = mock_items();
        let item1 = items.get(0).unwrap().clone();
        let item2 = items.get(1).unwrap().clone();
        assert_ne!(item1.name, item2.name);
        line.item_id = item1.id.to_owned();

        // no name change
        let result = generate(
            UpdateOutboundShipmentServiceLine {
                id: "".to_string(),
                invoice_id: "".to_string(),
                item_id: None,
                name: None,
                total_after_tax: None,
                note: None,
            },
            line.clone(),
            item1.clone(),
        )
        .unwrap();
        assert_eq!(result.item_name, item1.name);

        // change name in input
        let result = generate(
            UpdateOutboundShipmentServiceLine {
                id: "".to_string(),
                invoice_id: "".to_string(),
                item_id: None,
                name: Some("input name".to_string()),
                total_after_tax: None,
                note: None,
            },
            line.clone(),
            item1,
        )
        .unwrap();
        assert_eq!(result.item_name, "input name");

        // change item id to item2 but still specify input name
        let result = generate(
            UpdateOutboundShipmentServiceLine {
                id: "".to_string(),
                invoice_id: "".to_string(),
                item_id: Some(item2.id.to_owned()),
                name: Some("input name 2".to_string()),
                total_after_tax: None,
                note: None,
            },
            line.clone(),
            item2.clone(),
        )
        .unwrap();
        assert_eq!(result.item_name, "input name 2");

        // change item id to item2 and no name in the input
        let result = generate(
            UpdateOutboundShipmentServiceLine {
                id: "".to_string(),
                invoice_id: "".to_string(),
                item_id: Some(item2.id.to_owned()),
                name: None,
                total_after_tax: None,
                note: None,
            },
            line.clone(),
            item2.clone(),
        )
        .unwrap();
        assert_eq!(result.item_name, item2.name);
    }
}

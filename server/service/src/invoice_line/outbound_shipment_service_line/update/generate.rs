use repository::schema::{InvoiceLineRow, ItemRow};

use super::{UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError};

pub fn generate(
    input: UpdateOutboundShipmentServiceLine,
    existing_line: InvoiceLineRow,
    item: ItemRow,
) -> Result<InvoiceLineRow, UpdateOutboundShipmentServiceLineError> {
    let mut update_line = existing_line;
    // 1) Use name from input (if specified)
    // 2) else: if item has been updated use name from the updated item name
    // 3) else: use existing line name
    if let Some(input_name) = input.name {
        update_line.item_name = input_name
    } else if let Some(input_item_id) = input.item_id {
        if input_item_id != update_line.item_id {
            update_line.item_name = item.name;
            update_line.item_id = input_item_id;
        }
    }

    if let Some(total_after_tax) = input.total_before_tax {
        update_line.total_before_tax = total_after_tax;
    }

    if let Some(total_after_tax) = input.total_after_tax {
        update_line.total_after_tax = total_after_tax;
    }

    if let Some(tax) = input.tax {
        update_line.tax = tax.percentage;
    }

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
                total_before_tax: None,
                total_after_tax: None,
                tax: None,
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
                total_before_tax: None,
                total_after_tax: None,
                tax: None,
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
                total_before_tax: None,
                total_after_tax: None,
                tax: None,
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
                total_before_tax: None,
                total_after_tax: None,
                tax: None,
                note: None,
            },
            line.clone(),
            item2.clone(),
        )
        .unwrap();
        assert_eq!(result.item_name, item2.name);
    }
}

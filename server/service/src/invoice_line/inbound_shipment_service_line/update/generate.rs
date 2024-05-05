use repository::{InvoiceLine, InvoiceLineRow, ItemRow, StorageConnection};

use crate::invoice::common::{calculate_foreign_currency_total, calculate_total_after_tax};

use super::{UpdateInboundShipmentServiceLine, UpdateInboundShipmentServiceLineError};

pub fn generate(
    connection: &StorageConnection,
    UpdateInboundShipmentServiceLine {
        id: _,
        item_id: input_item_id,
        name: input_name,
        total_before_tax: input_total_before_tax,
        tax_percentage: input_tax,
        note: input_note,
    }: UpdateInboundShipmentServiceLine,
    existing_line: InvoiceLine,
    ItemRow {
        id: item_id,
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    currency_id: Option<String>,
    currency_rate: &f64,
) -> Result<InvoiceLineRow, UpdateInboundShipmentServiceLineError> {
    // 1) Use name from input (if specified)
    // 2) else: if item has been updated use name from the updated item name
    // 3) else: use existing line name
    let updated_item_name = if let Some(input_name) = input_name {
        Some(input_name)
    } else if item_id != existing_line.item_row.id {
        Some(item_name)
    } else {
        None
    };

    let mut update_line = existing_line.invoice_line_row;

    if let Some(item_name) = updated_item_name {
        update_line.item_name = item_name;
        update_line.item_code = item_code;
    }

    if let Some(input_item_id) = input_item_id {
        update_line.item_link_id = input_item_id;
    }

    if let Some(total_before_tax) = input_total_before_tax {
        update_line.total_before_tax = total_before_tax;
    }

    if let Some(tax) = input_tax {
        update_line.tax_percentage = tax.percentage;
    }

    update_line.total_after_tax =
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax_percentage);

    if let Some(note) = input_note {
        update_line.note = Some(note);
    }

    update_line.foreign_currency_price_before_tax = calculate_foreign_currency_total(
        connection,
        update_line.total_before_tax,
        currency_id,
        currency_rate,
    )?;

    Ok(update_line)
}

#[cfg(test)]
mod inbound_shipment_service_line_update_test {
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_inbound_shipment_invoice_lines, mock_items,
            MockDataInserts,
        },
        test_db::setup_all,
    };

    use super::*;

    #[actix_rt::test]
    async fn test_name_update() {
        let (_, connection, _, _) = setup_all(
            "test_inbound_shipment_service_line_generation",
            MockDataInserts::none().currencies(),
        )
        .await;

        let items = mock_items();
        let item1 = items.first().unwrap().clone();
        let item2 = items.get(1).unwrap().clone();
        assert_ne!(item1.name, item2.name);
        let mut line = InvoiceLine {
            invoice_line_row: mock_inbound_shipment_invoice_lines()
                .first()
                .unwrap()
                .clone(),
            invoice_row: mock_inbound_shipment_a(),
            item_row: item1.clone(),
            location_row_option: None,
            stock_line_option: None,
        };
        line.invoice_line_row.item_link_id = item1.id.to_owned();

        // no name change
        let result = generate(
            &connection,
            UpdateInboundShipmentServiceLine {
                id: "".to_string(),
                item_id: None,
                name: None,
                total_before_tax: None,
                tax_percentage: None,
                note: None,
            },
            line.clone(),
            item1.clone(),
            Some("currency_a".to_string()),
            &1.0,
        )
        .unwrap();
        assert_eq!(result.item_name, item1.name);

        // change name in input
        let result = generate(
            &connection,
            UpdateInboundShipmentServiceLine {
                id: "".to_string(),
                item_id: None,
                name: Some("input name".to_string()),
                total_before_tax: None,
                tax_percentage: None,
                note: None,
            },
            line.clone(),
            item1,
            Some("currency_a".to_string()),
            &1.0,
        )
        .unwrap();
        assert_eq!(result.item_name, "input name");

        // change item id to item2 but still specify input name
        let result = generate(
            &connection,
            UpdateInboundShipmentServiceLine {
                id: "".to_string(),
                item_id: Some(item2.id.to_owned()),
                name: Some("input name 2".to_string()),
                total_before_tax: None,
                tax_percentage: None,
                note: None,
            },
            line.clone(),
            item2.clone(),
            Some("currency_a".to_string()),
            &1.0,
        )
        .unwrap();
        assert_eq!(result.item_name, "input name 2");

        // change item id to item2 and no name in the input
        let result = generate(
            &connection,
            UpdateInboundShipmentServiceLine {
                id: "".to_string(),
                item_id: Some(item2.id.to_owned()),
                name: None,
                total_before_tax: None,
                tax_percentage: None,
                note: None,
            },
            line.clone(),
            item2.clone(),
            Some("currency_a".to_string()),
            &1.0,
        )
        .unwrap();
        assert_eq!(result.item_name, item2.name);
    }
}

use crate::invoice::common::{active_items, generate_duplicate_comment};
use crate::number::next_number;
use chrono::Utc;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
    NumberRowType, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub struct GenerateResult {
    pub new_invoice: InvoiceRow,
    pub new_lines: Vec<InvoiceLineRow>,
    pub skipped_item_count: usize,
}

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    source_invoice: InvoiceRow,
) -> Result<GenerateResult, RepositoryError> {
    let new_invoice_id = uuid();
    let comment =
        generate_duplicate_comment(source_invoice.invoice_number, &source_invoice.comment);

    // Field-level rules follow the duplication spec for inbound shipments.
    let new_invoice = InvoiceRow {
        // --- New shipment identity ---
        id: new_invoice_id.clone(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, store_id)?,
        created_datetime: Utc::now().naive_utc(),
        user_id: Some(user_id.to_string()),
        status: InvoiceStatus::New,
        r#type: source_invoice.r#type.clone(),
        store_id: source_invoice.store_id.clone(),

        // --- Header fields (copied from source) ---
        name_id: source_invoice.name_id.clone(),
        name_store_id: source_invoice.name_store_id.clone(),
        their_reference: source_invoice.their_reference.clone(),
        colour: source_invoice.colour.clone(),
        comment: Some(comment),
        default_donor_id: source_invoice.default_donor_id.clone(),
        // Hold unchecked, linked requisition & purchase order not copied
        on_hold: false,
        requisition_id: None,
        purchase_order_id: None,

        // --- Transport details ---
        transport_reference: source_invoice.transport_reference.clone(),
        expected_delivery_date: None,
        shipping_method_id: source_invoice.shipping_method_id.clone(),

        // --- Charges, tax & currency (copied from source) ---
        charges_local_currency: source_invoice.charges_local_currency,
        charges_foreign_currency: source_invoice.charges_foreign_currency,
        tax_percentage: source_invoice.tax_percentage,
        currency_id: source_invoice.currency_id.clone(),
        currency_rate: source_invoice.currency_rate,

        // --- Prescription/dispensing fields: never set on an inbound shipment
        //     (the inbound insert leaves these None too) ---
        clinician_link_id: None,
        diagnosis_id: None,
        program_id: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,

        // --- Reset: a fresh New shipment has no workflow history or links ---
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        received_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        backdated_datetime: None,
        linked_invoice_id: None,
        original_shipment_id: None,
        is_cancellation: false,
    };

    let source_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(&source_invoice.id)?;

    let active_item_ids = active_items(
        connection,
        store_id,
        source_lines
            .iter()
            .filter(|line| line.r#type == InvoiceLineType::StockIn)
            .map(|line| line.item_id.clone())
            .collect(),
    )?;

    let mut new_lines = Vec::new();
    let mut skipped_item_count = 0;

    for line in source_lines {
        // Skip stock lines whose item is no longer in the catalogue; service lines are kept.
        if line.r#type == InvoiceLineType::StockIn && !active_item_ids.contains(&line.item_id) {
            skipped_item_count += 1;
            continue;
        }

        // Inbound rule: copy every line field (item, batch, expiry, pack size, packs, cost/sell
        // price, location, donor, campaign/program, comment, manufacturer) and only reset the
        // identity and the fields that tie a line to stock, receipt or another shipment.
        // Listed explicitly (rather than `..line`) so any new field — particularly a new link —
        // forces a deliberate copy-vs-reset decision here.
        new_lines.push(InvoiceLineRow {
            // --- New line identity ---
            id: uuid(),
            invoice_id: new_invoice_id.clone(),

            // --- Copied from source ---
            r#type: line.r#type,
            item_id: line.item_id,
            item_name: line.item_name,
            item_code: line.item_code,
            item_variant_id: line.item_variant_id,
            batch: line.batch,
            expiry_date: line.expiry_date,
            manufacture_date: line.manufacture_date,
            pack_size: line.pack_size,
            number_of_packs: line.number_of_packs,
            prescribed_quantity: line.prescribed_quantity,
            cost_price_per_pack: line.cost_price_per_pack,
            sell_price_per_pack: line.sell_price_per_pack,
            total_before_tax: line.total_before_tax,
            total_after_tax: line.total_after_tax,
            tax_percentage: line.tax_percentage,
            foreign_currency_price_before_tax: line.foreign_currency_price_before_tax,
            location_id: line.location_id,
            donor_id: line.donor_id,
            manufacturer_id: line.manufacturer_id,
            campaign_id: line.campaign_id,
            program_id: line.program_id,
            reason_option_id: line.reason_option_id,
            note: line.note,
            volume_per_pack: line.volume_per_pack,
            shipped_pack_size: line.shipped_pack_size,

            // --- Reset: a new New line is not tied to stock, receipt or another shipment ---
            stock_line_id: None,
            received_number_of_packs: None,
            status: None,
            purchase_order_line_id: None,
            linked_invoice_id: None,
            linked_invoice_line_id: None,
            vvm_status_id: None,
            shipped_number_of_packs: None,
        });
    }

    Ok(GenerateResult {
        new_invoice,
        new_lines,
        skipped_item_count,
    })
}

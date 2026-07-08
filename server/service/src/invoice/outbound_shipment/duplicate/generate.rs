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

    // Field-level rules follow the duplication spec for outbound shipments.
    let new_invoice = InvoiceRow {
        // --- New shipment identity ---
        id: new_invoice_id.clone(),
        invoice_number: next_number(connection, &NumberRowType::OutboundShipment, store_id)?,
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
        custom_fields: source_invoice.custom_fields.clone(),
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

        // --- Prescription/dispensing fields: never set on an outbound shipment
        //     (the outbound insert leaves these None too) ---
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
        legacy_goods_received_id: None,
    };

    let source_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(&source_invoice.id)?;

    let active_item_ids = active_items(
        connection,
        store_id,
        source_lines
            .iter()
            .filter(|line| line.r#type != InvoiceLineType::Service)
            .map(|line| line.item_id.clone())
            .collect(),
    )?;

    let mut new_lines = Vec::new();
    let mut skipped_item_count = 0;

    for line in source_lines {
        if line.r#type != InvoiceLineType::Service && !active_item_ids.contains(&line.item_id) {
            skipped_item_count += 1;
            continue;
        }

        new_lines.push(generate_line(&new_invoice_id, line));
    }

    Ok(GenerateResult {
        new_invoice,
        new_lines,
        skipped_item_count,
    })
}

// Listed explicitly (rather than `..line`) so any new field — particularly a new link —
// forces a deliberate copy-vs-reset decision here.
fn generate_line(new_invoice_id: &str, line: InvoiceLineRow) -> InvoiceLineRow {
    // Service lines carry no stock: copy every field, only resetting the line identity.
    if line.r#type == InvoiceLineType::Service {
        return InvoiceLineRow {
            // --- New line identity ---
            id: uuid(),
            invoice_id: new_invoice_id.to_string(),

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
            status: line.status,
            stock_line_id: line.stock_line_id,
            vvm_status_id: line.vvm_status_id,
            shipped_number_of_packs: line.shipped_number_of_packs,
            received_number_of_packs: line.received_number_of_packs,
            purchase_order_line_id: line.purchase_order_line_id,
            linked_invoice_id: line.linked_invoice_id,
            linked_invoice_line_id: line.linked_invoice_line_id,
            legacy_goods_received_line_id: None,
        };
    }

    // Stock lines are reset to an unallocated request: keep the item, requested quantity and
    // descriptive fields, but drop the specific stock, pricing, location and workflow details
    // so the copy must be re-allocated.
    InvoiceLineRow {
        // --- New line identity ---
        id: uuid(),
        invoice_id: new_invoice_id.to_string(),
        r#type: InvoiceLineType::UnallocatedStock,

        // --- Copied from source ---
        item_id: line.item_id,
        item_name: line.item_name,
        item_code: line.item_code,
        item_variant_id: line.item_variant_id,
        pack_size: line.pack_size,
        number_of_packs: line.number_of_packs,
        note: line.note,
        donor_id: line.donor_id,
        manufacturer_id: line.manufacturer_id,
        campaign_id: line.campaign_id,
        program_id: line.program_id,

        // --- Reset: not tied to specific stock, pricing, location or workflow ---
        stock_line_id: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        foreign_currency_price_before_tax: None,
        prescribed_quantity: None,
        manufacture_date: None,
        volume_per_pack: 0.0,
        shipped_pack_size: None,
        shipped_number_of_packs: None,
        received_number_of_packs: None,
        status: None,
        vvm_status_id: None,
        reason_option_id: None,
        purchase_order_line_id: None,
        linked_invoice_id: None,
        linked_invoice_line_id: None,
        legacy_goods_received_line_id: None,
    }
}

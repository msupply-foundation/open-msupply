use super::{BatchPair, UpdateStockOutLine, UpdateStockOutLineError};
use crate::{
    invoice::common::{
        calculate_total_after_tax, generate_vvm_status_log, GenerateVVMStatusLogInput,
    },
    invoice_line::{stock_in_line::get_existing_vvm_status_log_id, stock_out_line::StockOutType},
    service_provider::ServiceContext,
};
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRow, InvoiceLineRow, InvoiceRow, InvoiceStatus,
    ItemRow, StockLine, StockLineRow,
};

pub struct GenerateResult {
    pub update_line: InvoiceLineRow,
    pub batch_pair: BatchPair,
    pub vvm_status_log_option: Option<VVMStatusLogRow>,
}

pub fn generate(
    ctx: &ServiceContext,
    input: UpdateStockOutLine,
    existing_line: InvoiceLineRow,
    item_row: ItemRow,
    batch_pair: BatchPair,
    invoice: InvoiceRow,
) -> Result<GenerateResult, UpdateStockOutLineError> {
    let adjust_total_number_of_packs = invoice.status == InvoiceStatus::Picked;
    let vvm_status_changed = input.vvm_status_id.is_some()
        && batch_pair.main_batch.stock_line_row.vvm_status_id != input.vvm_status_id;

    let batch_pair = BatchPair {
        main_batch: generate_batch_update(
            &input,
            &existing_line,
            &batch_pair,
            adjust_total_number_of_packs,
        ),
        previous_batch_option: generate_previous_batch_update(
            &existing_line,
            batch_pair.previous_batch_option,
            adjust_total_number_of_packs,
        ),
    };

    let new_line = generate_line(
        input.clone(),
        existing_line,
        item_row,
        batch_pair.main_batch.stock_line_row.clone(),
    );

    let vvm_status_log_option = if let Some(vvm_status_id) = input.vvm_status_id {
        if vvm_status_changed {
            let stock_line_id = batch_pair.main_batch.stock_line_row.id.clone();
            let existing_log_id =
                get_existing_vvm_status_log_id(&ctx.connection, &stock_line_id, &new_line.id)?;

            Some(generate_vvm_status_log(GenerateVVMStatusLogInput {
                id: existing_log_id,
                store_id: invoice.store_id.clone(),
                created_by: ctx.user_id.to_string(),
                vvm_status_id,
                stock_line_id,
                invoice_line_id: new_line.id.clone(),
                comment: Some(format!(
                    "Updated from {} #{}",
                    invoice.r#type.to_string(),
                    invoice.invoice_number
                )),
            }))
        } else {
            None
        }
    } else {
        None
    };

    Ok(GenerateResult {
        update_line: new_line,
        batch_pair,
        vvm_status_log_option,
    })
}

fn generate_batch_update(
    input: &UpdateStockOutLine,
    existing_line: &InvoiceLineRow,
    batch_pair: &BatchPair,
    adjust_total_number_of_packs: bool,
) -> StockLine {
    let mut update_batch = batch_pair.main_batch.clone();

    let reduction = batch_pair.get_main_batch_reduction(input.number_of_packs, existing_line);

    update_batch.stock_line_row.available_number_of_packs -= reduction;
    if adjust_total_number_of_packs {
        update_batch.stock_line_row.total_number_of_packs -= reduction;
        update_batch.stock_line_row.total_volume -=
            update_batch.stock_line_row.volume_per_pack * reduction;
    }
    update_batch.stock_line_row.vvm_status_id = input.vvm_status_id.clone();

    update_batch
}
fn generate_previous_batch_update(
    existing_line: &InvoiceLineRow,
    previous_batch_option: Option<StockLine>,
    adjust_total_number_of_packs: bool,
) -> Option<StockLine> {
    // If previous batch is present, this means batch was changes thus:
    // - release stock of the batch
    previous_batch_option.map(|mut previous_batch| {
        let addition = existing_line.number_of_packs;
        previous_batch.stock_line_row.available_number_of_packs += addition;
        if adjust_total_number_of_packs {
            previous_batch.stock_line_row.total_number_of_packs += addition;
        }
        previous_batch
    })
}

fn generate_line(
    input: UpdateStockOutLine,
    InvoiceLineRow {
        id,
        invoice_id,
        number_of_packs,
        prescribed_quantity,
        total_before_tax,
        total_after_tax,
        tax_percentage,
        r#type,
        note,
        foreign_currency_price_before_tax,
        sell_price_per_pack: invoice_line_sell_price_per_pack,
        cost_price_per_pack: invoice_line_cost_price_per_pack,
        donor_link_id,
        campaign_id,
        program_id,
        shipped_number_of_packs,
        shipped_pack_size,
        ..
    }: InvoiceLineRow,
    ItemRow {
        id: item_id,
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    StockLineRow {
        id: stock_line_id,
        sell_price_per_pack: _,
        cost_price_per_pack: _,
        pack_size,
        batch,
        expiry_date,
        location_id,
        item_variant_id,
        vvm_status_id,
        volume_per_pack,
        ..
    }: StockLineRow,
) -> InvoiceLineRow {
    // Cost & sell prices shouldn't need adjusting when the invoice line is being updated
    let cost_price_per_pack = invoice_line_cost_price_per_pack;
    let sell_price_per_pack = invoice_line_sell_price_per_pack;

    let mut update_line: InvoiceLineRow = InvoiceLineRow {
        id,
        invoice_id,
        item_link_id: item_id,
        location_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        prescribed_quantity,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax,
        total_after_tax,
        tax_percentage,
        r#type,
        note,
        foreign_currency_price_before_tax,
        item_variant_id,
        vvm_status_id: input.vvm_status_id.or(vvm_status_id),
        donor_link_id,
        campaign_id,
        program_id,
        shipped_number_of_packs,
        volume_per_pack,
        shipped_pack_size,
        reason_option_id: None,
        linked_invoice_id: None,
        status: None,
    };

    if let Some(number_of_packs) = input.number_of_packs {
        update_line.number_of_packs = number_of_packs;
    }

    update_line.total_before_tax = if let Some(total_before_tax) = input.total_before_tax {
        total_before_tax
    } else if let Some(number_of_packs) = input.number_of_packs {
        update_line.sell_price_per_pack * number_of_packs
    } else if input.stock_line_id.is_some() {
        sell_price_per_pack * number_of_packs
    } else {
        update_line.total_before_tax
    };

    if let Some(tax) = input.tax {
        update_line.tax_percentage = tax.percentage;
    }

    // Update the note only if a new value is provided;
    // otherwise, retain the existing value.
    if let Some(note) = input.note {
        update_line.note = Some(note);
    }

    if let Some(prescribed_quantity) = input.prescribed_quantity {
        update_line.prescribed_quantity = Some(prescribed_quantity);
    }

    if matches!(input.r#type, Some(StockOutType::OutboundShipment)) {
        update_line.shipped_number_of_packs = Some(update_line.number_of_packs);
        update_line.shipped_pack_size = Some(update_line.pack_size);
    }

    update_line.total_after_tax =
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax_percentage);

    update_line
}

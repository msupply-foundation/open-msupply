use super::{InsertStockOutLine, InsertStockOutLineError};
use crate::{
    invoice::common::{
        calculate_foreign_currency_total, calculate_total_after_tax, generate_vvm_status_log,
        GenerateVVMStatusLogInput,
    },
    invoice_line::StockOutType,
    pricing::{
        calculate_sell_price::calculate_sell_price,
        item_price::{get_pricing_for_items, ItemPrice, ItemPriceLookup},
    },
    service_provider::ServiceContext,
};
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRow, InvoiceLineRow, InvoiceLineType, InvoiceRow,
    InvoiceStatus, ItemRow, RepositoryError, StockLine, StockLineRow, StorageConnection,
};
use util::uuid::uuid;

pub struct GenerateResult {
    pub new_line: InvoiceLineRow,
    pub update_batch: StockLineRow,
    pub vvm_status_log_option: Option<VVMStatusLogRow>,
}

pub fn generate(
    ctx: &ServiceContext,
    input: InsertStockOutLine,
    item_row: ItemRow,
    batch: StockLine,
    invoice: InvoiceRow,
) -> Result<GenerateResult, InsertStockOutLineError> {
    let adjust_total_number_of_packs =
        should_adjust_total_number_of_packs(invoice.status.clone(), &input.r#type);

    let update_batch = generate_batch_update(
        input.clone(),
        batch.stock_line_row.clone(),
        adjust_total_number_of_packs,
    );

    // Check if we need to override the pricing with a default
    let pricing = get_pricing_for_items(
        &ctx.connection,
        ItemPriceLookup {
            item_ids: vec![item_row.id.clone()],
            customer_name_id: Some(invoice.name_id.clone()),
        },
    )?
    .remove(&item_row.id)
    .unwrap_or_default();
    let new_line = generate_line(
        &ctx.connection,
        input.clone(),
        item_row,
        update_batch.clone(),
        invoice.clone(),
        pricing,
    )?;

    let vvm_status_log_option = if let Some(vvm_status_id) = input.vvm_status_id {
        if batch.stock_line_row.vvm_status_id != Some(vvm_status_id.clone()) {
            Some(generate_vvm_status_log(GenerateVVMStatusLogInput {
                id: Some(uuid()),
                store_id: invoice.store_id.clone(),
                created_by: ctx.user_id.clone(),
                vvm_status_id,
                stock_line_id: update_batch.id.clone(),
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
        new_line,
        update_batch,
        vvm_status_log_option,
    })
}

fn generate_batch_update(
    InsertStockOutLine {
        location_id,
        batch: input_batch_name,
        pack_size,
        expiry_date,
        cost_price_per_pack,
        sell_price_per_pack,
        number_of_packs,
        vvm_status_id,
        volume_per_pack,
        campaign_id,
        program_id,
        item_variant_id,
        donor_id,
        prescribed_quantity: _,
        note: _,
        id: _,
        r#type: _,
        invoice_id: _,
        stock_line_id: _,
        total_before_tax: _,
        tax_percentage: _,
    }: InsertStockOutLine,
    batch: StockLineRow,
    adjust_total_number_of_packs: bool,
) -> StockLineRow {
    let available_reduction = number_of_packs;
    let volume_per_pack = volume_per_pack.unwrap_or(batch.volume_per_pack);

    let (total_reduction, total_volume) = if adjust_total_number_of_packs {
        (
            number_of_packs,
            batch.total_volume - (volume_per_pack * number_of_packs),
        )
    } else {
        (0.0, batch.total_volume)
    };

    StockLineRow {
        available_number_of_packs: batch.available_number_of_packs - available_reduction,
        total_number_of_packs: batch.total_number_of_packs - total_reduction,
        location_id: location_id.map(|l| l.value).unwrap_or(batch.location_id),
        batch: input_batch_name.or(batch.batch),
        expiry_date: expiry_date.map(|e| e.value).unwrap_or(batch.expiry_date),
        pack_size: pack_size.unwrap_or(batch.pack_size),
        cost_price_per_pack: cost_price_per_pack.unwrap_or(batch.cost_price_per_pack),
        sell_price_per_pack: sell_price_per_pack.unwrap_or(batch.sell_price_per_pack),
        vvm_status_id: vvm_status_id.or(batch.vvm_status_id),
        volume_per_pack,
        total_volume,

        program_id: program_id.map(|p| p.value).unwrap_or(batch.program_id),
        campaign_id: campaign_id.map(|c| c.value).unwrap_or(batch.campaign_id),
        item_variant_id: item_variant_id
            .map(|i| i.value)
            .unwrap_or(batch.item_variant_id),
        donor_id: donor_id.map(|d| d.value).unwrap_or(batch.donor_id),
        ..batch
    }
}

fn generate_line(
    connection: &StorageConnection,
    InsertStockOutLine {
        id,
        r#type,
        invoice_id,
        stock_line_id,
        number_of_packs,
        prescribed_quantity,
        total_before_tax,
        note,
        campaign_id: _,
        program_id: _,
        volume_per_pack: _,
        item_variant_id: _,
        donor_id: _,
        tax_percentage: _,
        location_id: _,
        batch: _,
        pack_size: _,
        expiry_date: _,
        cost_price_per_pack: _,
        sell_price_per_pack: _,
        vvm_status_id: _,
    }: InsertStockOutLine,
    ItemRow {
        id: item_id,
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    StockLineRow {
        sell_price_per_pack: stock_line_sell_price_per_pack,
        cost_price_per_pack: stock_line_cost_price_per_pack,
        pack_size,
        batch,
        expiry_date,
        location_id,
        item_variant_id,
        donor_id: donor_link_id,
        vvm_status_id,
        volume_per_pack,
        campaign_id,
        program_id,
        note: _,
        ..
    }: StockLineRow,
    InvoiceRow {
        tax_percentage,
        currency_id,
        currency_rate,
        ..
    }: InvoiceRow,
    default_pricing: ItemPrice,
) -> Result<InvoiceLineRow, RepositoryError> {
    let cost_price_per_pack = stock_line_cost_price_per_pack; // For now, we just get the cost price from the stock line

    let sell_price_per_pack =
        calculate_sell_price(stock_line_sell_price_per_pack, pack_size, default_pricing);

    let total_before_tax = total_before_tax.unwrap_or(sell_price_per_pack * number_of_packs);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax_percentage);
    let foreign_currency_price_before_tax = calculate_foreign_currency_total(
        connection,
        total_before_tax,
        currency_id,
        &currency_rate,
    )?;

    Ok(InvoiceLineRow {
        id,
        invoice_id,
        item_link_id: item_id,
        location_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineType::StockOut,
        number_of_packs,
        prescribed_quantity,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax,
        total_after_tax,
        tax_percentage,
        donor_id: donor_link_id,
        note,
        foreign_currency_price_before_tax,
        vvm_status_id,
        item_variant_id,
        campaign_id,
        program_id,
        volume_per_pack,
        shipped_number_of_packs: (r#type == StockOutType::OutboundShipment)
            .then_some(number_of_packs),
        shipped_pack_size: (r#type == StockOutType::OutboundShipment).then_some(pack_size),
        linked_invoice_id: None,
        reason_option_id: None,
    })
}

fn should_adjust_total_number_of_packs(status: InvoiceStatus, r#type: &StockOutType) -> bool {
    match r#type {
        StockOutType::InventoryReduction => true,
        _ => status == InvoiceStatus::Picked,
    }
}

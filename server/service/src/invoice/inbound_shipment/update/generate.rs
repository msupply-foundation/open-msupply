use chrono::Utc;

use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, LocationMovementRow,
    Name, RepositoryError,
};
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, StockLineRow,
    StorageConnection,
};
use util::uuid::uuid;

use crate::invoice::common::{calculate_foreign_currency_total, calculate_total_after_tax};
use crate::service_provider::ServiceContext;

use super::{
    ApplyDonorToInvoiceLines, UpdateInboundShipment, UpdateInboundShipmentError,
    UpdateInboundShipmentStatus,
};

pub struct LineAndStockLine {
    pub line: InvoiceLineRow,
    pub stock_line: Option<StockLineRow>,
}

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<LineAndStockLine>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) empty_lines_to_trim: Option<Vec<InvoiceLineRow>>,
    pub(crate) location_movements: Option<Vec<LocationMovementRow>>,
    pub(crate) update_tax_for_lines: Option<Vec<InvoiceLineRow>>,
    pub(crate) update_currency_for_lines: Option<Vec<InvoiceLineRow>>,
    pub(crate) update_donor: Option<Vec<LineAndStockLine>>,
}

pub(crate) fn generate(
    ctx: &ServiceContext,
    existing_invoice: InvoiceRow,
    other_party_option: Option<Name>,
    patch: UpdateInboundShipment,
) -> Result<GenerateResult, UpdateInboundShipmentError> {
    let connection = &ctx.connection;
    let should_create_batches = should_create_batches(&existing_invoice, &patch);
    let mut update_invoice = existing_invoice.clone();

    set_new_status_datetime(&mut update_invoice, &patch);

    let input_donor_id = match patch.default_donor.clone() {
        Some(update) => update.donor_id,
        None => update_invoice.default_donor_id.clone(),
    };

    update_invoice.user_id = Some(ctx.user_id.clone());
    update_invoice.comment = patch.comment.or(update_invoice.comment);
    update_invoice.their_reference = patch.their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = patch.on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.colour = patch.colour.or(update_invoice.colour);
    update_invoice.tax_percentage = patch
        .tax
        .map(|tax| tax.percentage)
        .unwrap_or(update_invoice.tax_percentage);
    update_invoice.default_donor_id = input_donor_id.clone();

    if let Some(status) = patch.status.clone() {
        update_invoice.status = status.full_status()
    }

    if let Some(other_party) = other_party_option {
        update_invoice.name_store_id = other_party.store_id().map(|id| id.to_string());
        // Assigning name_row id as name_link is ok, input name_row should always an active name
        // - only querying needs to go via link table
        update_invoice.name_link_id = other_party.name_row.id;
    }

    update_invoice.currency_id = patch.currency_id.or(update_invoice.currency_id);
    update_invoice.currency_rate = patch.currency_rate.unwrap_or(update_invoice.currency_rate);

    let batches_to_update = if should_create_batches {
        Some(generate_lines_and_stock_lines(
            connection,
            GenerateLinesInput {
                store_id: &update_invoice.store_id,
                id: &update_invoice.id,
                tax_percentage: update_invoice.tax_percentage,
                supplier_id: &update_invoice.name_link_id,
                currency_id: update_invoice.currency_id.clone(),
                currency_rate: &update_invoice.currency_rate,
            },
        )?)
    } else {
        None
    };

    let location_movements = if let Some(batches) = &batches_to_update {
        Some(generate_location_movements(
            update_invoice.store_id.clone(),
            batches,
        ))
    } else {
        None
    };

    let update_tax_for_lines = if update_invoice.tax_percentage.is_some() {
        Some(generate_tax_update_for_lines(
            connection,
            &update_invoice.id,
            update_invoice.tax_percentage,
        )?)
    } else {
        None
    };

    let update_currency_for_lines = if patch.currency_rate.is_some() {
        Some(generate_foreign_currency_before_tax_for_lines(
            connection,
            &update_invoice.id,
            update_invoice.currency_id.clone(),
            &update_invoice.currency_rate,
        )?)
    } else {
        None
    };

    let update_donor = match patch.default_donor {
        Some(update) => Some(update_donor_on_lines_and_stock(
            connection,
            &update_invoice.id,
            update.donor_id,
            update.apply_to_lines,
        )?),
        None => None,
    };

    Ok(GenerateResult {
        batches_to_update,
        empty_lines_to_trim: empty_lines_to_trim(connection, &existing_invoice, &patch.status)?,
        update_invoice,
        location_movements,
        update_tax_for_lines,
        update_currency_for_lines,
        update_donor,
    })
}

pub fn should_create_batches(invoice: &InvoiceRow, patch: &UpdateInboundShipment) -> bool {
    let existing_status = &invoice.status;
    let new_status = match changed_status(patch.status.to_owned(), existing_status) {
        Some(status) => status,
        None => return false, // Status has not been updated
    };

    match (existing_status, new_status) {
        (
            // From New/Picked/Shipped to Delivered/Verified
            InvoiceStatus::New | InvoiceStatus::Picked | InvoiceStatus::Shipped,
            UpdateInboundShipmentStatus::Delivered | UpdateInboundShipmentStatus::Verified,
        ) => true,
        _ => false,
    }
}

fn generate_tax_update_for_lines(
    connection: &StorageConnection,
    invoice_id: &str,
    tax_percentage: Option<f64>,
) -> Result<Vec<InvoiceLineRow>, UpdateInboundShipmentError> {
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineType::StockIn.equal_to()),
    )?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let mut invoice_line_row = invoice_line.invoice_line_row;
        invoice_line_row.tax_percentage = tax_percentage;
        invoice_line_row.total_after_tax =
            calculate_total_after_tax(invoice_line_row.total_before_tax, tax_percentage);
        result.push(invoice_line_row);
    }

    Ok(result)
}

fn generate_foreign_currency_before_tax_for_lines(
    connection: &StorageConnection,
    invoice_id: &str,
    currency_id: Option<String>,
    currency_rate: &f64,
) -> Result<Vec<InvoiceLineRow>, UpdateInboundShipmentError> {
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineType::StockIn.equal_to()),
    )?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let mut invoice_line_row = invoice_line.invoice_line_row;
        invoice_line_row.foreign_currency_price_before_tax = calculate_foreign_currency_total(
            connection,
            invoice_line_row.total_before_tax,
            currency_id.clone(),
            currency_rate,
        )?;
        result.push(invoice_line_row);
    }

    Ok(result)
}

// If status changed to Delivered and above, remove empty lines
fn empty_lines_to_trim(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
    status: &Option<UpdateInboundShipmentStatus>,
) -> Result<Option<Vec<InvoiceLineRow>>, RepositoryError> {
    // Status sequence for inbound shipment: New, Picked, Shipped, Delivered, Verified
    if invoice.status != InvoiceStatus::New {
        return Ok(None);
    }

    let new_invoice_status = match status {
        Some(new_status) => new_status.full_status(),
        None => return Ok(None),
    };

    if new_invoice_status == InvoiceStatus::New {
        return Ok(None);
    }

    // If new invoice status is not new and previous invoice status is new
    // add all empty lines to be deleted
    let lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .r#type(InvoiceLineType::StockIn.equal_to())
            .number_of_packs(EqualFilter::equal_to_f64(0.0)),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let invoice_line_rows = lines.into_iter().map(|l| l.invoice_line_row).collect();
    Ok(Some(invoice_line_rows))
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateInboundShipment) {
    let new_status = match changed_status(patch.status.to_owned(), &invoice.status) {
        Some(status) => status,
        None => return, // There's no status to update
    };

    let current_datetime = Utc::now().naive_utc();
    match (&invoice.status, new_status) {
        // From New/Picked/Shipped to Delivered
        (
            InvoiceStatus::New | InvoiceStatus::Picked | InvoiceStatus::Shipped,
            UpdateInboundShipmentStatus::Delivered,
        ) => {
            invoice.delivered_datetime = Some(current_datetime);
        }

        // From New/Picked/Shipped to Verified
        (
            InvoiceStatus::New | InvoiceStatus::Picked | InvoiceStatus::Shipped,
            UpdateInboundShipmentStatus::Verified,
        ) => {
            invoice.delivered_datetime = Some(current_datetime);
            invoice.verified_datetime = Some(current_datetime);
        }
        // From Delivered to Verified
        (InvoiceStatus::Delivered, UpdateInboundShipmentStatus::Verified) => {
            invoice.verified_datetime = Some(current_datetime);
        }
        _ => {}
    }
}

fn changed_status(
    status: Option<UpdateInboundShipmentStatus>,
    existing_status: &InvoiceStatus,
) -> Option<UpdateInboundShipmentStatus> {
    let new_status = match status {
        Some(status) => status,
        None => return None, // Status is not changing
    };

    if &new_status.full_status() == existing_status {
        // The invoice already has this status, there's nothing to do.
        return None;
    }

    Some(new_status)
}

pub struct GenerateLinesInput<'a> {
    store_id: &'a str,
    id: &'a str,
    tax_percentage: Option<f64>,
    supplier_id: &'a str,
    currency_id: Option<String>,
    currency_rate: &'a f64,
}

pub fn generate_lines_and_stock_lines(
    connection: &StorageConnection,
    GenerateLinesInput {
        store_id,
        id,
        tax_percentage,
        supplier_id,
        currency_id,
        currency_rate,
    }: GenerateLinesInput<'_>,
) -> Result<Vec<LineAndStockLine>, UpdateInboundShipmentError> {
    let lines = InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(id)?;
    let mut result = Vec::new();

    for invoice_line in lines.into_iter() {
        let mut line = invoice_line.clone();
        let stock_line_id = line.stock_line_id.unwrap_or(uuid());

        line.stock_line_id = Some(stock_line_id.clone());
        if tax_percentage.is_some() {
            line.tax_percentage = tax_percentage;
            line.total_after_tax = calculate_total_after_tax(line.total_before_tax, tax_percentage);
        }
        line.foreign_currency_price_before_tax = calculate_foreign_currency_total(
            connection,
            line.total_before_tax,
            currency_id.clone(),
            currency_rate,
        )?;

        let InvoiceLineRow {
            item_link_id,
            cost_price_per_pack,
            sell_price_per_pack,
            number_of_packs,
            item_variant_id,
            location_id,
            batch,
            expiry_date,
            pack_size,
            donor_id,
            note,
            reason_option_id: _,
            ..
        }: InvoiceLineRow = invoice_line;

        if number_of_packs > 0.0 {
            let stock_line = StockLineRow {
                id: stock_line_id,
                item_link_id,
                store_id: store_id.to_string(),
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                available_number_of_packs: number_of_packs,
                total_number_of_packs: number_of_packs,
                expiry_date,
                on_hold: false,
                note,
                supplier_link_id: Some(supplier_id.to_string()),
                barcode_id: None,
                item_variant_id,
                donor_id,
                vvm_status_id: None,
            };
            result.push(LineAndStockLine {
                line,
                stock_line: Some(stock_line),
            });
        }
    }
    Ok(result)
}

pub fn generate_location_movements(
    store_id: String,
    batch: &Vec<LineAndStockLine>,
) -> Vec<LocationMovementRow> {
    batch
        .iter()
        .filter_map(|batch| {
            batch
                .stock_line
                .as_ref()
                .map(|stock_line| LocationMovementRow {
                    id: uuid(),
                    store_id: store_id.clone(),
                    stock_line_id: stock_line.id.clone(),
                    location_id: batch.line.location_id.clone(),
                    enter_datetime: Some(Utc::now().naive_utc()),
                    exit_datetime: None,
                })
        })
        .collect()
}

fn update_donor_on_lines_and_stock(
    connection: &StorageConnection,
    invoice_id: &str,
    updated_default_donor_id: Option<String>,
    donor_update_method: ApplyDonorToInvoiceLines,
) -> Result<Vec<LineAndStockLine>, UpdateInboundShipmentError> {
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineType::StockIn.equal_to()),
    )?;
    let mut result = Vec::new();

    for invoice_line in invoice_lines {
        let mut line = invoice_line.invoice_line_row;
        let mut stock_line = invoice_line.stock_line_option;

        let new_donor_id = match donor_update_method.clone() {
            ApplyDonorToInvoiceLines::None => line.donor_id.clone(),
            ApplyDonorToInvoiceLines::UpdateExistingDonor => match line.donor_id {
                Some(_) => updated_default_donor_id.clone(),
                None => None,
            },
            ApplyDonorToInvoiceLines::AssignIfNone => {
                line.donor_id.clone().or(updated_default_donor_id.clone())
            }
            ApplyDonorToInvoiceLines::AssignToAll => updated_default_donor_id.clone(),
        };

        line.donor_id = new_donor_id.clone();
        if let Some(ref mut stock_line) = stock_line {
            stock_line.donor_id = new_donor_id;
        }

        result.push(LineAndStockLine { line, stock_line });
    }

    Ok(result)
}

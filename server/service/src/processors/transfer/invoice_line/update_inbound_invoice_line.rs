use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRepository, InvoiceRow,
    InvoiceRowRepository, InvoiceStatus, InvoiceType, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, RepositoryError, RowActionType, StorageConnection,
};

use super::{
    InvoiceLineTransferOutput, InvoiceLineTransferProcessor, InvoiceLineTransferProcessorRecord,
};
use crate::invoice::common::{calculate_foreign_currency_total, calculate_total_after_tax};
use util::uuid::uuid;

const DESCRIPTION: &str = "Update inbound invoice line from outbound invoice line (PICKED status)";

pub(crate) struct UpdateInboundInvoiceLineProcessor;

impl InvoiceLineTransferProcessor for UpdateInboundInvoiceLineProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Process individual invoice line changes when:
    /// 1. Source invoice is Outbound Shipment or Supplier Return  
    /// 2. Source invoice status is PICKED (editable state)
    /// 3. Linked inbound invoice exists and is also PICKED
    /// 4. Action is UPSERT or DELETE
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record: &InvoiceLineTransferProcessorRecord,
    ) -> Result<InvoiceLineTransferOutput, RepositoryError> {
        if !matches!(
            record.operation,
            RowActionType::Upsert | RowActionType::Delete
        ) {
            return Ok(InvoiceLineTransferOutput::WrongOperation);
        }

        // Get the outbound line (may not exist if deleted)
        let outbound_line = InvoiceLineRepository::new(connection).query_one(
            InvoiceLineFilter::new().id(EqualFilter::equal_to(&record.invoice_line_id)),
        )?;

        let outbound_invoice = match &outbound_line {
            Some(line) => line.invoice_row.clone(),
            None => {
                // If outbound line doesn't exist (must be DELETE operation), then try to get the outbound invoice by ID
                let invoice = InvoiceRowRepository::new(connection)
                    .find_one_by_id(&record.invoice_id)?
                    .ok_or(RepositoryError::NotFound)?;

                if invoice.store_id != record.invoice_store_id {
                    return Ok(InvoiceLineTransferOutput::WrongStoreInvoice(
                        "Outbound invoice store ID does not match record".to_string(),
                    ));
                }
                invoice
            }
        };

        // Check invoice type
        if !matches!(
            outbound_invoice.r#type,
            InvoiceType::OutboundShipment | InvoiceType::SupplierReturn
        ) {
            return Ok(InvoiceLineTransferOutput::WrongInvoiceType);
        }

        // Only process if outbound invoice is PICKED
        if outbound_invoice.status != InvoiceStatus::Picked {
            return Ok(InvoiceLineTransferOutput::WrongInvoiceStatus);
        }

        // Get linked inbound invoice
        let inbound_invoice = match &outbound_invoice.linked_invoice_id {
            Some(linked_id) => InvoiceRepository::new(connection)
                .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_to(linked_id)))?
                .pop(),
            None => None,
        };

        let inbound_invoice = match inbound_invoice {
            Some(inv) => inv,
            None => return Ok(InvoiceLineTransferOutput::NoLinkedInvoice),
        };

        if inbound_invoice.invoice_row.store_id != record.other_party_store_id {
            return Ok(InvoiceLineTransferOutput::WrongStoreInvoice(
                "Inbound invoice store ID does not match record".to_string(),
            ));
        }

        // Only process if inbound invoice is PICKED (editable)
        if inbound_invoice.invoice_row.status != InvoiceStatus::Picked {
            return Ok(InvoiceLineTransferOutput::InboundNotEditable);
        }

        let result = match &record.operation {
            RowActionType::Upsert => {
                let outbound_line = outbound_line.ok_or(RepositoryError::NotFound)?;
                self.upsert_line(connection, &outbound_line, &inbound_invoice)?
            }
            RowActionType::Delete => {
                self.delete_line(connection, &outbound_invoice, &inbound_invoice.invoice_row)?
            }
        };

        Ok(result)
    }
}

impl UpdateInboundInvoiceLineProcessor {
    fn upsert_line(
        &self,
        connection: &StorageConnection,
        outbound_line: &InvoiceLine,
        inbound_invoice: &Invoice,
    ) -> Result<InvoiceLineTransferOutput, RepositoryError> {
        // Find corresponding inbound line by linked_invoice_id
        let existing_inbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(&inbound_invoice.invoice_row.id))
                .linked_invoice_id(EqualFilter::equal_to(&outbound_line.invoice_row.id)),
        )?;

        // Find the specific matching line based on business key (item, batch, expiry)
        let existing_inbound_line = existing_inbound_lines.into_iter().find(|inbound_line| {
            self.lines_match(
                &outbound_line.invoice_line_row,
                &inbound_line.invoice_line_row,
            )
        });

        let mut inbound_line_row =
            self.generate_inbound_line(connection, outbound_line, inbound_invoice);

        if let Some(existing_inbound_line) = &existing_inbound_line {
            inbound_line_row.id = existing_inbound_line.invoice_line_row.id.clone();
        }

        InvoiceLineRowRepository::new(connection).upsert_one(&inbound_line_row)?;

        Ok(InvoiceLineTransferOutput::Processed(format!(
            "Upserted inbound line {} for invoice {}",
            inbound_line_row.id, inbound_line_row.invoice_id
        )))
    }

    fn generate_inbound_line(
        &self,
        connection: &StorageConnection,
        outbound_line: &InvoiceLine,
        inbound_invoice: &Invoice,
    ) -> InvoiceLineRow {
        let item_properties_repo = ItemStoreJoinRowRepository::new(connection);
        let item = &outbound_line.item_row;
        let mut new_line = outbound_line.invoice_line_row.clone();

        let item_properties = item_properties_repo
            .find_one_by_item_and_store_id(&item.id, &inbound_invoice.invoice_row.store_id)
            .unwrap_or(None);

        let default_sell_price_per_pack = match (
            item_properties,
            item.default_pack_size == new_line.pack_size,
        ) {
            (Some(p), true) => p.default_sell_price_per_pack,
            _ => 0.0,
        };

        let total_before_tax = match new_line.r#type {
            // Service lines don't work in packs
            InvoiceLineType::Service => new_line.total_before_tax,
            _ => new_line.cost_price_per_pack * new_line.number_of_packs,
        };

        new_line.id = uuid();
        new_line.invoice_id = inbound_invoice.invoice_row.id.clone();
        new_line.r#type = match new_line.r#type {
            InvoiceLineType::StockOut => InvoiceLineType::StockIn,
            _ => new_line.r#type,
        };
        new_line.stock_line_id = None; // Inbound creates its own stock lines
        new_line.location_id = None;
        new_line.reason_option_id = None;
        new_line.cost_price_per_pack = new_line.sell_price_per_pack; // Cost price on inbound is sell price from outbound
        new_line.linked_invoice_id = Some(outbound_line.invoice_row.id.clone());
        new_line.total_before_tax = total_before_tax;
        new_line.total_after_tax =
            calculate_total_after_tax(new_line.total_before_tax, new_line.tax_percentage);
        new_line.sell_price_per_pack = default_sell_price_per_pack;
        new_line.foreign_currency_price_before_tax = calculate_foreign_currency_total(
            connection,
            new_line.total_before_tax,
            inbound_invoice.invoice_row.currency_id.clone(),
            &inbound_invoice.invoice_row.currency_rate,
        )
        .unwrap_or_default();

        new_line
    }

    fn delete_line(
        &self,
        connection: &StorageConnection,
        outbound_invoice: &InvoiceRow,
        inbound_invoice: &InvoiceRow,
    ) -> Result<InvoiceLineTransferOutput, RepositoryError> {
        // Get current outbound lines
        let outbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&outbound_invoice.id)),
        )?;

        // Get inbound lines linked to this outbound invoice
        let inbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(&inbound_invoice.id))
                .linked_invoice_id(EqualFilter::equal_to(&outbound_invoice.id)),
        )?;

        let mut deleted_count = 0;

        // Find and delete orphaned inbound lines
        for inbound_line in &inbound_lines {
            let has_match = outbound_lines.iter().any(|outbound_line| {
                self.lines_match_for_delete(
                    &outbound_line.invoice_line_row,
                    &inbound_line.invoice_line_row,
                )
            });

            if !has_match {
                InvoiceLineRowRepository::new(connection)
                    .delete(&inbound_line.invoice_line_row.id)?;
                deleted_count += 1;
            }
        }

        Ok(InvoiceLineTransferOutput::Processed(format!(
            "Deleted {} orphaned inbound lines for outbound invoice {}",
            deleted_count, outbound_invoice.id
        )))
    }

    /// Check if two lines match based on business key (item, batch, expiry)
    fn lines_match(
        &self,
        outbound_line_row: &InvoiceLineRow,
        inbound_line_row: &InvoiceLineRow,
    ) -> bool {
        outbound_line_row.item_link_id == inbound_line_row.item_link_id
            && outbound_line_row.batch == inbound_line_row.batch
            && outbound_line_row.expiry_date == inbound_line_row.expiry_date
    }

    /// Check if two lines match for deletion purposes, considering (item, batch, expiry) with quantity tolerance
    fn lines_match_for_delete(
        &self,
        outbound_line_row: &InvoiceLineRow,
        inbound_line_row: &InvoiceLineRow,
    ) -> bool {
        let same_batch = self.lines_match(outbound_line_row, inbound_line_row);

        if !same_batch {
            return false;
        }

        // Compare total quantity (number_of_packs * pack_size),
        // since inbound invoice may convert pack-to-one based on store preferences
        let outbound_line_total = outbound_line_row.number_of_packs * outbound_line_row.pack_size;
        let inbound_line_total = inbound_line_row.number_of_packs * inbound_line_row.pack_size;
        let diff = (outbound_line_total - inbound_line_total).abs();

        diff < 0.001 // Tolerance for floating point comparison
    }
}

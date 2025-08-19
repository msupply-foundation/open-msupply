use repository::{InvoiceRow, InvoiceStatus, InvoiceType};

/// Business rules for invoice line operations
pub struct InvoiceBusinessRules;

impl InvoiceBusinessRules {
    /// Check if the current invoice status affects stock levels
    pub fn invoice_affects_stock(invoice: &InvoiceRow) -> bool {
        // Inbound operations only affect stock in received status
        if Self::is_inbound_operation(&invoice.r#type) {
            return matches!(invoice.status, InvoiceStatus::Received);
        }

        // Outbound operations should always affect at least available stock
        return true;
    }

    /// Check if the invoice type supports post-creation updates
    /// TODO: might not be needed - the update itself maybe should be earlier? Or just based on inv status?
    pub fn allows_updates(invoice: &InvoiceRow) -> bool {
        match &invoice.r#type {
            InvoiceType::Repack
            | InvoiceType::InventoryAddition
            | InvoiceType::InventoryReduction => {
                // These are immediately finalized - no updates allowed
                false
            }
            InvoiceType::CustomerReturn
            | InvoiceType::InboundShipment
            | InvoiceType::SupplierReturn
            | InvoiceType::OutboundShipment
            | InvoiceType::Prescription => {
                // Other types can be updated (subject to status checks)
                true
            }
        }
    }

    /// Check if the invoice type is an inbound operation
    pub fn is_inbound_operation(invoice_type: &InvoiceType) -> bool {
        matches!(
            invoice_type,
            InvoiceType::InboundShipment | InvoiceType::CustomerReturn
        )
    }

    /// Check if the invoice type is an outbound operation  
    pub fn is_outbound_operation(invoice_type: &InvoiceType) -> bool {
        matches!(
            invoice_type,
            InvoiceType::OutboundShipment | InvoiceType::Prescription | InvoiceType::SupplierReturn
        )
    }

    /// Check if the invoice type is an inventory adjustment
    pub fn is_inventory_adjustment(invoice_type: &InvoiceType) -> bool {
        matches!(
            invoice_type,
            InvoiceType::InventoryAddition | InvoiceType::InventoryReduction
        )
    }
}

use crate::events::DomainEvent;
use repository::{InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType};

/// Domain model for invoice lines that encapsulates business logic
#[derive(Debug, Clone)]
pub struct InvoiceLineDomain {
    pub line: InvoiceLineRow,
    pub invoice: InvoiceRow,
}

impl InvoiceLineDomain {
    pub fn new(line: InvoiceLineRow, invoice: InvoiceRow) -> Self {
        Self { line, invoice }
    }

    /// Update the number of packs and generate appropriate domain events
    pub fn update_number_of_packs(&mut self, new_packs: f64) -> Vec<DomainEvent> {
        let old_packs = self.line.number_of_packs;
        self.line.number_of_packs = new_packs;

        self.generate_stock_events(old_packs, new_packs)
    }

    /// Validate if updates are allowed for this invoice type/status
    fn validate_update_allowed(&self) -> Result<(), String> {
        match &self.invoice.r#type {
            InvoiceType::Repack
            | InvoiceType::InventoryAddition
            | InvoiceType::InventoryReduction => {
                // These are immediately finalized - no updates allowed
                Err("Cannot update inventory adjustment invoices after creation".to_string())
            }
            InvoiceType::InboundShipment | InvoiceType::CustomerReturn => {
                // Edits allowed during New, Delivered, and Received status
                match &self.invoice.status {
                    InvoiceStatus::New | InvoiceStatus::Delivered | InvoiceStatus::Received => {
                        Ok(())
                    }
                    _ => Err("Cannot update inbound shipment invoice in this status".to_string()),
                }
            }
            InvoiceType::SupplierReturn
            | InvoiceType::OutboundShipment
            | InvoiceType::Prescription => {
                // Edits allowed during New, Allocated, and Picked status
                match &self.invoice.status {
                    InvoiceStatus::New | InvoiceStatus::Allocated | InvoiceStatus::Picked => Ok(()),
                    _ => {
                        Err("Cannot update outbound/prescription invoice in this status"
                            .to_string())
                    }
                }
            }
        }
    }

    /// Generate stock-related events based on invoice type and status
    fn generate_stock_events(&self, old_packs: f64, new_packs: f64) -> Vec<DomainEvent> {
        let mut events = Vec::new();

        if !self.invoice_affects_stock() {
            return events;
        }

        let stock_line_id = match &self.line.stock_line_id {
            Some(id) => id.clone(),
            None => return events,
        };

        let packs_change = new_packs - old_packs;
        if packs_change == 0.0 {
            return events; // No change, no events
        }

        match &self.invoice.r#type {
            InvoiceType::InboundShipment => {
                // Inbound: more packs_change = more stock
                if packs_change > 0.0 {
                    events.push(DomainEvent::StockAdded {
                        stock_line_id,
                        addition: packs_change,
                    });
                } else {
                    events.push(DomainEvent::StockReduced {
                        stock_line_id,
                        reduction: -packs_change,
                    });
                }
            }
            InvoiceType::OutboundShipment | InvoiceType::Prescription => {
                // Outbound: more packs_change = less available stock
                if packs_change > 0.0 {
                    events.push(DomainEvent::StockReduced {
                        stock_line_id,
                        reduction: packs_change,
                    });
                } else {
                    events.push(DomainEvent::StockAdded {
                        stock_line_id,
                        addition: -packs_change,
                    });
                }

                // Picked date updates for outbound operations
                if self.should_update_picked_date() {
                    events.push(DomainEvent::PickedDateUpdateRequired {
                        invoice_id: self.invoice.id.clone(),
                    });
                }
            }
            InvoiceType::CustomerReturn => {
                // Returns: more packs_change = more stock returned
                if packs_change > 0.0 {
                    events.push(DomainEvent::StockAdded {
                        stock_line_id,
                        addition: packs_change,
                    });
                } else {
                    events.push(DomainEvent::StockReduced {
                        stock_line_id,
                        reduction: -packs_change,
                    });
                }
            }
            InvoiceType::InventoryAddition | InvoiceType::InventoryReduction => {
                // These shouldn't be updated after creation, but if somehow they are:
                // Don't generate events since they're immediately finalized
                // The initial creation would have already generated the appropriate events
            }
            _ => {
                // Unknown invoice types don't affect stock
            }
        }

        events
    }

    /// Calculate current total units (convenience method)
    pub fn total_units(&self) -> f64 {
        self.line.number_of_packs * self.line.pack_size
    }

    /// Check if the current invoice status affects stock levels
    fn invoice_affects_stock(&self) -> bool {
        match &self.invoice.status {
            InvoiceStatus::New | InvoiceStatus::Allocated => false,
            InvoiceStatus::Picked | InvoiceStatus::Shipped => true,
            InvoiceStatus::Delivered | InvoiceStatus::Received => true,
            InvoiceStatus::Verified | InvoiceStatus::Cancelled => false,
        }
    }

    /// Check if picked date should be updated based on invoice type and line changes
    fn should_update_picked_date(&self) -> bool {
        matches!(
            self.invoice.r#type,
            InvoiceType::OutboundShipment | InvoiceType::Prescription
        ) && matches!(self.invoice.status, InvoiceStatus::Picked)
    }

    /// Convert back to repository row for persistence
    pub fn into_row(self) -> InvoiceLineRow {
        self.line
    }
}

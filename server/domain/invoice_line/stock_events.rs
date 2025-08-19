use crate::events::DomainEvent;
use repository::{InvoiceRow, InvoiceStatus, InvoiceType};

/// Business logic for generating stock-related events based on invoice operations
pub struct StockEventGenerator;

impl StockEventGenerator {
    /// Generate stock events for outbound operations (outbound shipments, prescriptions, supplier returns)
    pub fn generate_outbound_events(
        invoice: &InvoiceRow,
        stock_line_id: &str,
        packs_change: f64,
    ) -> Vec<DomainEvent> {
        let mut events = Vec::new();

        if packs_change > 0.0 {
            // More packs out = less available stock
            if Self::should_reduce_total_stock(&invoice.status) {
                events.push(DomainEvent::StockReduced {
                    stock_line_id: stock_line_id.to_string(),
                    reduction: packs_change,
                });
            } else {
                events.push(DomainEvent::StockReducedAvailableOnly {
                    stock_line_id: stock_line_id.to_string(),
                    reduction: packs_change,
                });
            }
        } else {
            // Less packs out = adding stock back
            if Self::should_reduce_total_stock(&invoice.status) {
                // We reduced both, so add back to both
                events.push(DomainEvent::StockAdded {
                    stock_line_id: stock_line_id.to_string(),
                    addition: -packs_change,
                });
            } else {
                // We only reduced available, so only add back to available
                events.push(DomainEvent::StockAddedAvailableOnly {
                    stock_line_id: stock_line_id.to_string(),
                    addition: -packs_change,
                });
            }
        }

        // Picked date updates for outbound operations
        if Self::should_update_picked_date(invoice) {
            events.push(DomainEvent::PickedDateUpdateRequired {
                invoice_id: invoice.id.clone(),
            });
        }

        events
    }

    /// Generate stock events for inbound operations (inbound shipments, customer returns)
    pub fn generate_inbound_events(stock_line_id: &str, packs_change: f64) -> Vec<DomainEvent> {
        let mut events = Vec::new();

        if packs_change > 0.0 {
            // More packs in = more stock (both available and total)
            events.push(DomainEvent::StockAdded {
                stock_line_id: stock_line_id.to_string(),
                addition: packs_change,
            });
        } else {
            // Less packs in = less stock (both available and total)
            events.push(DomainEvent::StockReduced {
                stock_line_id: stock_line_id.to_string(),
                reduction: -packs_change,
            });
        }

        events
    }

    /// Check if the invoice status should reduce total stock (not just available)
    fn should_reduce_total_stock(status: &InvoiceStatus) -> bool {
        matches!(status, InvoiceStatus::Picked)
    }

    /// Check if picked date should be updated for this invoice
    fn should_update_picked_date(invoice: &InvoiceRow) -> bool {
        matches!(
            invoice.r#type,
            InvoiceType::OutboundShipment | InvoiceType::Prescription
        ) && matches!(invoice.status, InvoiceStatus::Picked)
    }
}

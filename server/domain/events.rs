#[derive(Debug, Clone, PartialEq)]
pub enum DomainEvent {
    /// Updates both available and total stock
    StockAdded {
        stock_line_id: String,
        addition: f64,
    },
    /// Stock addition to available stock only (for outbound reversals in New/Allocated status)
    StockAddedAvailableOnly {
        stock_line_id: String,
        addition: f64,
    },
    /// New stock line creation
    StockCreated { stock_line_id: String, amount: f64 },
    /// Stock reduction for outbound operations (available only)
    StockReducedAvailableOnly {
        stock_line_id: String,
        reduction: f64,
    },
    StockReduced {
        stock_line_id: String,
        reduction: f64,
    },
    /// Picked date update required
    PickedDateUpdateRequired { invoice_id: String },
    /// VVM status changed
    VVMStatusChanged {
        stock_line_id: String,
        vvm_status_id: String,
        invoice_line_id: String,
    },
    /// Barcode creation
    BarcodeCreated {
        gtin: String,
        item_id: String,
        pack_size: f64,
    },
}

impl DomainEvent {
    /// Check if this event affects stock levels
    pub fn affects_stock(&self) -> bool {
        matches!(
            self,
            DomainEvent::StockAdded { .. }
                | DomainEvent::StockAddedAvailableOnly { .. }
                | DomainEvent::StockCreated { .. }
                | DomainEvent::StockReducedAvailableOnly { .. }
                | DomainEvent::StockReduced { .. }
        )
    }

    /// Get the stock line ID if this event affects stock
    pub fn stock_line_id(&self) -> Option<&str> {
        match self {
            DomainEvent::StockAdded { stock_line_id, .. }
            | DomainEvent::StockAddedAvailableOnly { stock_line_id, .. }
            | DomainEvent::StockCreated { stock_line_id, .. }
            | DomainEvent::StockReducedAvailableOnly { stock_line_id, .. }
            | DomainEvent::StockReduced { stock_line_id, .. }
            | DomainEvent::VVMStatusChanged { stock_line_id, .. } => Some(stock_line_id),
            _ => None,
        }
    }
}

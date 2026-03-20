use repository::{InvoiceStatus, InvoiceType};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StockEffect {
    None,
    ReduceStock,
    CreateStock,
    ReverseStock,
}

/// Single source of truth: returns the effect a status change has on stock.
pub fn stock_effects(
    invoice_type: &InvoiceType,
    from_status: &InvoiceStatus,
    to_status: &InvoiceStatus,
) -> StockEffect {
    let reduce_stock = to_status.index() >= InvoiceStatus::Picked.index()
        && from_status.index() < InvoiceStatus::Picked.index();
    let increase_stock = to_status.index() >= InvoiceStatus::Received.index()
        && from_status.index() < InvoiceStatus::Received.index();

    match invoice_type {
        InvoiceType::OutboundShipment => {
            if reduce_stock {
                StockEffect::ReduceStock
            } else {
                StockEffect::None
            }
        }

        InvoiceType::Prescription => {
            if *to_status == InvoiceStatus::Cancelled && *from_status == InvoiceStatus::Verified {
                return StockEffect::ReverseStock;
            }

            if reduce_stock {
                StockEffect::ReduceStock
            } else {
                StockEffect::None
            }
        }

        InvoiceType::SupplierReturn => {
            if reduce_stock {
                StockEffect::ReduceStock
            } else {
                StockEffect::None
            }
        }

        InvoiceType::InboundShipment => {
            if increase_stock {
                StockEffect::CreateStock
            } else {
                StockEffect::None
            }
        }

        InvoiceType::CustomerReturn => {
            if increase_stock {
                StockEffect::CreateStock
            } else {
                StockEffect::None
            }
        }

        // Inventory adjustments and repacks don't change adjust stock based on status changes, so we can ignore them here
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction | InvoiceType::Repack => {
            StockEffect::None
        }
    }
}

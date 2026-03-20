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
    let create_stock = to_status.index() >= InvoiceStatus::Received.index()
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
            if create_stock {
                StockEffect::CreateStock
            } else {
                StockEffect::None
            }
        }

        InvoiceType::CustomerReturn => {
            if create_stock {
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

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn outbound_shipment_status_effects() {
        assert_eq!(
            stock_effects(
                &InvoiceType::OutboundShipment,
                &InvoiceStatus::New,
                &InvoiceStatus::Picked,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::OutboundShipment,
                &InvoiceStatus::New,
                &InvoiceStatus::Shipped,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::OutboundShipment,
                &InvoiceStatus::Allocated,
                &InvoiceStatus::Picked,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::OutboundShipment,
                &InvoiceStatus::New,
                &InvoiceStatus::Allocated,
            ),
            StockEffect::None,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::OutboundShipment,
                &InvoiceStatus::Picked,
                &InvoiceStatus::Shipped,
            ),
            StockEffect::None,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::OutboundShipment,
                &InvoiceStatus::New,
                &InvoiceStatus::New,
            ),
            StockEffect::None,
        );
    }

    #[test]
    fn prescription_status_effects() {
        assert_eq!(
            stock_effects(
                &InvoiceType::Prescription,
                &InvoiceStatus::New,
                &InvoiceStatus::Picked,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::Prescription,
                &InvoiceStatus::New,
                &InvoiceStatus::Verified,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::Prescription,
                &InvoiceStatus::Verified,
                &InvoiceStatus::Cancelled,
            ),
            StockEffect::ReverseStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::Prescription,
                &InvoiceStatus::Picked,
                &InvoiceStatus::Verified,
            ),
            StockEffect::None,
        );
    }

    #[test]
    fn supplier_return_status_effects() {
        assert_eq!(
            stock_effects(
                &InvoiceType::SupplierReturn,
                &InvoiceStatus::New,
                &InvoiceStatus::Picked,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::SupplierReturn,
                &InvoiceStatus::New,
                &InvoiceStatus::Shipped,
            ),
            StockEffect::ReduceStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::SupplierReturn,
                &InvoiceStatus::Picked,
                &InvoiceStatus::Shipped,
            ),
            StockEffect::None,
        );
    }

    #[test]
    fn inbound_status_effects() {
        assert_eq!(
            stock_effects(
                &InvoiceType::InboundShipment,
                &InvoiceStatus::New,
                &InvoiceStatus::Received,
            ),
            StockEffect::CreateStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::InboundShipment,
                &InvoiceStatus::Shipped,
                &InvoiceStatus::Verified,
            ),
            StockEffect::CreateStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::InboundShipment,
                &InvoiceStatus::Delivered,
                &InvoiceStatus::Received,
            ),
            StockEffect::CreateStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::InboundShipment,
                &InvoiceStatus::New,
                &InvoiceStatus::Shipped,
            ),
            StockEffect::None,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::InboundShipment,
                &InvoiceStatus::Received,
                &InvoiceStatus::Verified,
            ),
            StockEffect::None,
        );
    }

    #[test]
    fn customer_return_status_effects() {
        assert_eq!(
            stock_effects(
                &InvoiceType::CustomerReturn,
                &InvoiceStatus::New,
                &InvoiceStatus::Received,
            ),
            StockEffect::CreateStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::CustomerReturn,
                &InvoiceStatus::Shipped,
                &InvoiceStatus::Verified,
            ),
            StockEffect::CreateStock,
        );

        assert_eq!(
            stock_effects(
                &InvoiceType::CustomerReturn,
                &InvoiceStatus::Received,
                &InvoiceStatus::Verified,
            ),
            StockEffect::None,
        );
    }

    #[test]
    fn inventory_addition_no_effect() {
        assert_eq!(
            stock_effects(
                &InvoiceType::InventoryAddition,
                &InvoiceStatus::New,
                &InvoiceStatus::Verified,
            ),
            StockEffect::None,
        );
    }
}

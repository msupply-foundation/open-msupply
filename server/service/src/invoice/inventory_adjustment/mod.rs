pub mod adjust_existing_stock;
pub use self::adjust_existing_stock::*;

pub mod add_new_stock_line;

pub struct UpdateInventoryAdjustmentReason {
    pub reason_id: Option<String>,
    pub invoice_line_id: String,
}

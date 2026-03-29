mod generate;
pub use self::generate::*;

/// Whether the inbound shipment is internal (no purchase order) or external (linked to a purchase order).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum InboundShipmentType {
    InboundShipment,
    InboundShipmentExternal,
}

impl InboundShipmentType {
    /// Returns true if the input matches this type based on purchase_order_id.
    pub fn matches_input(&self, has_purchase_order: bool) -> bool {
        match self {
            InboundShipmentType::InboundShipment => !has_purchase_order,
            InboundShipmentType::InboundShipmentExternal => has_purchase_order,
        }
    }
}

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod delete;
pub use self::delete::*;

pub mod batch;
pub use self::batch::*;

mod add_from_master_list;
pub use self::add_from_master_list::*;

mod add_from_purchase_order;
pub use self::add_from_purchase_order::*;

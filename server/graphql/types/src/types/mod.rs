pub mod name;
pub use self::name::*;

pub mod item;
pub use self::item::*;

pub mod item_variant;
pub use self::item_variant::*;

pub mod bundled_item;
pub use self::bundled_item::*;

pub mod item_stats;
pub use self::item_stats::*;

pub mod requisition;
pub use self::requisition::*;

pub mod requisition_line;
pub use self::requisition_line::*;

pub mod stock_line;
pub use self::stock_line::*;

pub mod location;
pub use self::location::*;

pub mod master_list;
pub use self::master_list::*;

pub mod invoice_query;
pub use self::invoice_query::*;

pub mod invoice_line;
pub use self::invoice_line::*;

pub mod item_direction;
pub use self::item_direction::*;

pub mod store;
pub use self::store::*;

pub mod stocktake;
pub use self::stocktake::*;

pub mod stocktake_line;
pub use self::stocktake_line::*;

pub mod user;
pub use self::user::*;

pub mod activity_log;
pub use self::activity_log::*;

pub mod period;
pub use self::period::*;

pub mod permissions;
pub use self::permissions::*;

pub mod preferences;
pub use self::preferences::*;

pub mod response_requisition_stats;
pub use self::response_requisition_stats::*;

pub mod inventory_adjustment_reason;
pub use self::inventory_adjustment_reason::*;

pub mod form_schema;
pub use self::form_schema::*;

pub mod clinician;
pub use self::clinician::*;

pub mod barcode;
pub use self::barcode::*;

pub mod diagnosis;
pub use self::diagnosis::*;

pub mod store_preference;
pub use self::store_preference::*;

pub mod repack;
pub use self::repack::*;

pub mod property;
pub use self::property::*;

pub mod program;
pub use self::program::*;

pub mod supplier_return_line;
pub use self::supplier_return_line::*;

pub mod customer_return_line;
pub use self::customer_return_line::*;

pub mod return_reason;
pub use self::return_reason::*;

pub mod currency;
pub use self::currency::*;

pub mod sync_file_reference;
pub use self::sync_file_reference::*;

pub mod vaccine_course;
pub use self::vaccine_course::*;
pub mod vaccine_course_item;
pub use self::vaccine_course_item::*;
pub mod vaccine_course_dose;
pub use self::vaccine_course_dose::*;

pub mod demographic_indicator;
pub use self::demographic_indicator::*;
pub mod demographic;
pub use self::demographic::*;

pub mod reason_option;
pub use self::reason_option::*;

pub mod cold_storage_type;
pub use self::cold_storage_type::*;

pub mod abbreviation;
pub use self::abbreviation::*;

pub mod printer;
pub use self::printer::*;

pub mod insurance_policy;
pub use self::insurance_policy::*;

pub mod insurance_provider;
pub use self::insurance_provider::*;

pub mod warning;
pub use self::warning::*;

pub mod vvm_status;
pub use self::vvm_status::*;

mod campaign;
pub mod draft_stock_out_line;
pub use self::draft_stock_out_line::*;

pub mod vvm_status_log;
pub use self::vvm_status_log::*;

pub mod purchase_order;
pub use self::purchase_order::*;

pub mod purchase_order_line;
pub use self::purchase_order_line::*;

use async_graphql::*;
pub struct DeleteResponse(pub String);
#[Object]
impl DeleteResponse {
    pub async fn id(&self) -> &str {
        &self.0
    }
}

pub struct IdResponse(pub String);
#[Object]
impl IdResponse {
    pub async fn id(&self) -> &str {
        &self.0
    }
}

pub struct OkResponse;
#[Object]
impl OkResponse {
    pub async fn ok(&self) -> bool {
        true
    }
}

pub use campaign::*;

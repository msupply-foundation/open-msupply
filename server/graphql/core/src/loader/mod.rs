mod asset;
mod asset_catalogue_item;
mod asset_category;
mod asset_class;
mod asset_location;
mod asset_log_reason;
mod asset_status_log;
mod asset_type;
mod available_volume_on_requisition;
mod bundled_item;
mod campaign;
mod clinician;
mod currency;
mod demographic;
mod diagnosis;
mod document;
mod document_registry;
mod insurance_provider;
mod invoice;
mod invoice_line;
mod item;
mod item_category;
mod item_direction;
mod item_stats;
mod item_stock_on_hand;
mod item_store_join;
mod item_variant;
mod json_schema;
mod loader_registry;
mod location;
mod location_type;
mod master_list;
mod name;
mod name_insurance_join;
mod name_row;
mod packaging_variant;
mod patient;
mod previous_encounter;
mod program;
mod program_enrolment;
mod program_indicator_value;
mod program_order_types;
mod purchase_order;
mod purchase_order_line;
mod reason_option;
mod requisition;
mod requisition_indicator_information;
mod requisition_line;
mod requisition_supply_status;
mod rnr_form_line;
mod sensor;
mod shipping_method;
mod stock_line;
mod stocktake_lines;
mod store;
mod sync_file_reference;
mod temperature_breach;
mod temperature_log;
mod units_in_other_purchase_orders;
mod user;
mod vaccine_course;
mod vaccine_course_by_program;
mod vaccine_course_dose_by_vaccine_course;
mod vaccine_course_item_by_vaccine_course;
mod vvm_status;
mod vvm_status_log;
mod warning;

pub use asset::*;
pub use asset_catalogue_item::*;
pub use asset_category::*;
pub use asset_class::*;
pub use asset_location::*;
pub use asset_log_reason::*;
pub use asset_status_log::*;
pub use asset_type::*;
pub use available_volume_on_requisition::*;
pub use bundled_item::*;
pub use campaign::*;
pub use clinician::*;
pub use currency::*;
pub use demographic::*;
pub use diagnosis::*;
pub use document::*;
pub use document_registry::*;
pub use insurance_provider::*;
pub use invoice::*;
pub use invoice_line::*;
pub use item::ItemLoader;
pub use item_category::*;
pub use item_direction::*;
pub use item_stats::*;
pub use item_stock_on_hand::*;
pub use item_store_join::*;
pub use item_variant::*;
pub use json_schema::*;
pub use loader_registry::{get_loaders, LoaderMap, LoaderRegistry};
pub use location::*;
pub use location_type::*;
pub use master_list::*;
pub use name::*;
pub use name_insurance_join::*;
pub use name_row::*;
pub use packaging_variant::*;
pub use patient::*;
pub use previous_encounter::*;
pub use program::*;
pub use program_enrolment::*;
pub use program_indicator_value::*;
pub use program_order_types::*;
pub use purchase_order::*;
pub use purchase_order_line::*;
pub use reason_option::ReasonOptionLoader;
pub use requisition::*;
pub use requisition_indicator_information::*;
pub use requisition_line::*;
pub use requisition_supply_status::*;
pub use rnr_form_line::*;
pub use sensor::*;
pub use shipping_method::*;
pub use stock_line::*;
pub use stocktake_lines::*;
pub use store::*;
pub use sync_file_reference::*;
pub use temperature_breach::*;
pub use temperature_log::*;
pub use units_in_other_purchase_orders::*;
pub use user::*;
pub use vaccine_course::*;
pub use vaccine_course_by_program::*;
pub use vaccine_course_dose_by_vaccine_course::*;
pub use vaccine_course_item_by_vaccine_course::*;
pub use vvm_status::*;
pub use vvm_status_log::*;
pub use warning::*;

#[derive(Clone)]
// Using struct instead of () to avoid conflicting new implementations
pub struct EmptyPayload;

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct RequisitionAndItemId {
    pub requisition_id: String,
    pub item_id: String,
}
impl RequisitionAndItemId {
    pub fn new(requisition_id: &str, item_id: &str) -> Self {
        RequisitionAndItemId {
            requisition_id: requisition_id.to_string(),
            item_id: item_id.to_string(),
        }
    }
}

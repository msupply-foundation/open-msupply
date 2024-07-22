use crate::repository_error::RepositoryError;

pub mod activity_log;
mod activity_log_row;
pub mod assets;
pub mod barcode;
mod barcode_row;
pub mod changelog;
pub mod clinician;
mod clinician_link_row;
mod clinician_row;
mod clinician_store_join_row;
pub mod consumption;
pub mod contact_trace;
pub mod contact_trace_row;
mod context_row;
pub mod currency;
mod currency_row;
pub mod demographic_indicator;
pub mod demographic_indicator_row;
pub mod demographic_projection;
pub mod demographic_projection_row;
pub mod diesel_schema;
pub mod document;
pub mod document_registry;
mod document_registry_config;
mod document_registry_row;
pub mod encounter;
pub mod encounter_row;
mod filter_restriction;
mod filter_sort_pagination;
pub mod form_schema;
mod form_schema_row;
pub mod inventory_adjustment_reason;
mod inventory_adjustment_reason_row;
pub mod invoice;
pub mod invoice_line;
mod invoice_line_row;
mod invoice_row;
pub mod item;
mod item_link_row;
mod item_row;
pub mod key_value_store;
pub mod ledger;
pub mod location;
pub mod location_movement;
mod location_movement_row;
mod location_row;
pub mod master_list;
pub mod master_list_line;
mod master_list_line_row;
pub mod master_list_name_join;
mod master_list_row;
pub mod name;
mod name_link_row;
pub mod name_property;
pub mod name_property_row;
mod name_row;
pub mod name_store_join;
pub mod name_tag;
pub mod name_tag_join;
mod name_tag_row;
mod number_row;
pub mod pack_variant;
mod pack_variant_row;
mod patient;
pub mod period;
pub mod plugin_data;
mod plugin_data_row;
pub mod program_enrolment;
mod program_enrolment_row;
pub mod program_event;
mod program_event_row;
mod program_requisition;
pub mod property;
pub mod property_row;
pub mod report;
mod report_query;
mod report_row;
pub mod requisition;
pub mod requisition_line;
pub mod return_reason;
mod return_reason_row;
pub mod rnr_form;
pub mod rnr_form_row;
pub mod sensor;
mod sensor_row;
pub mod stock_line;
mod stock_line_row;
pub mod stock_movement;
pub mod stock_on_hand;
pub mod stocktake;
pub mod stocktake_line;
mod stocktake_line_row;
mod stocktake_row;
mod storage_connection;
pub mod store;
mod store_preference_row;
mod store_row;
pub mod sync_buffer;
pub mod sync_file_reference;
pub mod sync_file_reference_row;
pub mod sync_log;
mod sync_log_row;
pub mod temperature_breach;
pub mod temperature_breach_config;
mod temperature_breach_config_row;
mod temperature_breach_row;
mod temperature_excursion;
pub mod temperature_log;
mod temperature_log_row;
mod unit_row;
mod user;
pub mod user_permission;
mod user_permission_row;
mod user_row;
mod user_store_join_row;
pub mod vaccine_course;

pub use activity_log_row::*;
pub use assets::*;
pub use barcode_row::*;
pub use changelog::*;
pub use clinician::*;
pub use clinician_link_row::*;
pub use clinician_row::*;
pub use clinician_store_join_row::*;
pub use consumption::*;
pub use context_row::*;
pub use currency::*;
pub use currency_row::*;
pub use demographic_indicator::*;
pub use demographic_indicator_row::*;
pub use demographic_projection_row::*;
pub use document::*;
pub use document_registry::*;
pub use document_registry_config::*;
pub use document_registry_row::*;
pub use encounter::*;
pub use encounter_row::*;
pub use filter_sort_pagination::*;
pub use form_schema::*;
pub use form_schema_row::*;
pub use inventory_adjustment_reason_row::*;
pub use invoice::*;
pub use invoice_line::*;
pub use invoice_line_row::*;
pub use invoice_row::*;
pub use item::*;
pub use item_link_row::*;
pub use item_row::*;
pub use key_value_store::*;
pub use location_movement_row::*;
pub use location_row::*;
pub use master_list::*;
pub use master_list_line::*;
pub use master_list_line_row::*;
pub use master_list_name_join::*;
pub use master_list_row::*;
pub use name::*;
pub use name_link_row::*;
pub use name_property::*;
pub use name_property_row::*;
pub use name_row::*;
pub use name_store_join::*;
pub use name_tag::*;
pub use name_tag_join::*;
pub use name_tag_row::*;
pub use number_row::*;
pub use pack_variant::*;
pub use pack_variant_row::*;
pub use patient::*;
pub use period::*;
pub use plugin_data::*;
pub use plugin_data_row::*;
pub use program_enrolment::*;
pub use program_enrolment_row::*;
pub use program_event::*;
pub use program_event_row::*;
pub use program_requisition::*;
pub use property_row::*;
pub use report::*;
pub use report_query::*;
pub use report_row::*;
pub use requisition::*;
pub use requisition_line::*;
pub use return_reason_row::*;
pub use rnr_form::*;
pub use rnr_form_row::*;
pub use sensor::*;
pub use sensor_row::*;
pub use stock_line::*;
pub use stock_line_row::*;
pub use stock_movement::*;
pub use stock_on_hand::*;
pub use stocktake::*;
pub use stocktake_line::*;
pub use stocktake_line_row::*;
pub use stocktake_row::*;
pub use storage_connection::*;
pub use store::*;
pub use store_preference_row::*;
pub use store_row::*;
pub use sync_buffer::*;
pub use sync_file_reference::*;
pub use sync_file_reference_row::*;
pub use sync_log::*;
pub use sync_log_row::*;
pub use temperature_breach::*;
pub use temperature_breach_config::*;
pub use temperature_breach_config_row::*;
pub use temperature_breach_row::*;
pub use temperature_excursion::*;
pub use temperature_log::*;
pub use temperature_log_row::*;
pub use unit_row::*;
pub use user::*;
pub use user_permission::*;
pub use user_permission_row::*;
pub use user_row::*;
pub use user_store_join_row::*;

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool, PooledConnection},
    result::{DatabaseErrorKind as DieselDatabaseErrorKind, Error as DieselError},
};

#[cfg(not(feature = "postgres"))]
pub type DBBackendConnection = SqliteConnection;

#[cfg(feature = "postgres")]
pub type DBBackendConnection = PgConnection;

#[cfg(not(feature = "postgres"))]
pub type DBType = diesel::sqlite::Sqlite;

#[cfg(feature = "postgres")]
pub type DBType = diesel::pg::Pg;

pub type DBConnection = PooledConnection<ConnectionManager<DBBackendConnection>>;

impl From<DieselError> for RepositoryError {
    fn from(err: DieselError) -> Self {
        use RepositoryError as Error;
        match err {
            DieselError::InvalidCString(extra) => {
                Error::as_db_error("DIESEL_INVALID_C_STRING", extra)
            }
            DieselError::DatabaseError(err, extra) => {
                let extra = format!("{:?}", extra);
                match err {
                    DieselDatabaseErrorKind::UniqueViolation => Error::UniqueViolation(extra),
                    DieselDatabaseErrorKind::ForeignKeyViolation => {
                        Error::ForeignKeyViolation(extra)
                    }
                    DieselDatabaseErrorKind::UnableToSendCommand => {
                        Error::as_db_error("UNABLE_TO_SEND_COMMAND", extra)
                    }
                    DieselDatabaseErrorKind::SerializationFailure => {
                        Error::as_db_error("SERIALIZATION_FAILURE", extra)
                    }
                    _ => Error::as_db_error("UNKNOWN", extra),
                }
            }
            DieselError::NotFound => RepositoryError::NotFound,
            DieselError::QueryBuilderError(extra) => {
                Error::as_db_error("DIESEL_QUERY_BUILDER_ERROR", extra)
            }
            DieselError::DeserializationError(extra) => {
                Error::as_db_error("DIESEL_DESERIALIZATION_ERROR", extra)
            }
            DieselError::SerializationError(extra) => {
                Error::as_db_error("DIESEL_SERIALIZATION_ERROR", extra)
            }
            DieselError::RollbackTransaction => {
                Error::as_db_error("DIESEL_ROLLBACK_TRANSACTION", "")
            }
            DieselError::AlreadyInTransaction => {
                Error::as_db_error("DIESEL_ALREADY_IN_TRANSACTION", "")
            }
            _ => {
                // try to get a more detailed diesel msg:
                let diesel_msg = format!("{}", err);
                Error::as_db_error("DIESEL_UNKNOWN", diesel_msg)
            }
        }
    }
}

fn get_connection(
    pool: &Pool<ConnectionManager<DBBackendConnection>>,
) -> Result<DBConnection, RepositoryError> {
    pool.get().map_err(|error| RepositoryError::DBError {
        msg: "Failed to open Connection".to_string(),
        extra: format!("{:?}", error),
    })
}

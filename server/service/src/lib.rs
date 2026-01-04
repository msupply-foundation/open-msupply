// json! hits recursion limit in integration test (central_server_configurations), recursion_limit attribute must be top level
#![cfg_attr(feature = "integration_test", recursion_limit = "256")]
use backend_plugin::plugin_provider::PluginError;
use repository::item_variant::item_variant_row::{ItemVariantRow, ItemVariantRowRepository};
use repository::location::{LocationFilter, LocationRepository};
use repository::vvm_status::vvm_status_row::{VVMStatusRow, VVMStatusRowRepository};
use repository::{
    EqualFilter, Pagination, PaginationOption, DEFAULT_PAGINATION_MAX_LIMIT,
    DEFAULT_PAGINATION_MIN_LIMIT,
};
use repository::{RepositoryError, StorageConnection};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use service_provider::ServiceContext;
use settings::Settings;
use static_files::{StaticFile, StaticFileCategory, StaticFileService};
use std::convert::TryInto;
use std::fs::File;
use std::io::BufReader;
use thiserror::Error;

pub mod abbreviation;
pub mod activity_log;
pub mod apis;
pub mod app_data;
pub mod boajs;
pub mod campaign;
pub mod ledger_fix;

pub mod asset;
pub mod auth;
pub mod auth_data;
pub mod backend_plugin;
pub mod barcode;
pub mod catalogue;
pub mod clinician;
pub mod cold_chain;
mod common;
pub mod contact;
pub mod contact_form;
pub mod currency;
pub mod cursor_controller;
pub mod dashboard;
pub mod demographic;
pub mod diagnosis;
pub mod display_settings_service;
pub mod document;
pub mod email;
pub mod goods_received;
pub mod goods_received_line;
pub mod insurance;
pub mod insurance_provider;
pub mod invoice;
pub mod invoice_line;
pub mod item;
pub mod item_stats;
pub mod item_warning_join;
pub mod json_translate;
pub mod label_printer_settings_service;
pub mod ledger;
pub mod localisations;
pub mod location;
pub mod location_type;
pub mod log_service;
pub mod login;
pub mod master_list;
pub mod name;
pub mod name_property;
pub mod number;
pub mod permission;
pub mod plugin;
pub mod plugin_data;
pub mod preference;
pub mod pricing;
pub mod print;
pub mod printer;
pub mod processors;
pub mod program;
pub mod programs;
pub mod purchase_order;
pub mod purchase_order_line;
pub mod reason_option;
pub mod repack;
pub mod report;
pub mod requisition;
pub mod requisition_line;
pub mod rnr_form;
pub mod sensor;
pub mod service_provider;
pub mod settings;
pub mod settings_service;
pub mod shipping_method;
pub mod standard_reports;
pub mod static_files;
pub mod stock_line;
pub mod stocktake;
pub mod stocktake_line;
pub mod store;
pub mod store_preference;
pub mod sync;
pub mod sync_message;
pub mod temperature_excursion;
pub mod token;
pub mod token_bucket;
pub mod user_account;
pub mod vaccination;
pub mod vaccine_course;
pub mod validate;
pub mod vvm;
pub mod warning;

#[cfg(test)]
mod login_mock_data;
#[cfg(test)]
mod test_helpers;

#[derive(PartialEq, Debug)]
pub struct ListResult<T> {
    pub rows: Vec<T>,
    pub count: u32,
}

impl<T> ListResult<T> {
    pub fn empty() -> ListResult<T> {
        ListResult {
            rows: vec![],
            count: 0,
        }
    }
}

#[derive(Clone, PartialEq, Debug)]
pub enum ListError {
    DatabaseError(RepositoryError),
    LimitBelowMin(u32),
    LimitAboveMax(u32),
    PluginError(String),
}

#[derive(PartialEq, Debug)]
pub enum SingleRecordError {
    DatabaseError(RepositoryError),
    NotFound(String),
}

#[derive(Debug)]

pub enum WithDBError<T> {
    DatabaseError(RepositoryError),
    Error(T),
}

impl<T> WithDBError<T> {
    pub fn db(error: RepositoryError) -> Self {
        WithDBError::DatabaseError(error)
    }

    pub fn err(error: T) -> Self {
        WithDBError::Error(error)
    }
}

impl<T> From<RepositoryError> for WithDBError<T> {
    fn from(error: RepositoryError) -> Self {
        WithDBError::DatabaseError(error)
    }
}

impl From<RepositoryError> for ListError {
    fn from(error: RepositoryError) -> Self {
        ListError::DatabaseError(error)
    }
}

impl From<RepositoryError> for SingleRecordError {
    fn from(error: RepositoryError) -> Self {
        SingleRecordError::DatabaseError(error)
    }
}

#[derive(Debug, Error, PartialEq)]
pub enum PluginOrRepositoryError {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
    #[error(transparent)]
    PluginError(#[from] PluginError),
}

// Batch mutation helpers
pub struct DoMutationResult<T> {
    pub has_errors: bool,
    pub results: Vec<T>,
}

pub struct BatchMutationsProcessor<'a> {
    ctx: &'a ServiceContext,
}

#[allow(clippy::type_complexity)]
impl<'a> BatchMutationsProcessor<'a> {
    pub fn new(ctx: &'a ServiceContext) -> BatchMutationsProcessor<'a> {
        BatchMutationsProcessor { ctx }
    }

    pub fn do_mutations<I, R, E, M>(
        &self,
        inputs: Option<Vec<I>>,
        mutation: M,
    ) -> (bool, Vec<InputWithResult<I, Result<R, E>>>)
    where
        I: Clone,
        M: Fn(&ServiceContext, I) -> Result<R, E>,
    {
        let mut has_errors = false;
        let mut result = vec![];

        for input in inputs.unwrap_or_default() {
            let mutation_result = mutation(self.ctx, input.clone());
            has_errors = has_errors || mutation_result.is_err();
            result.push(InputWithResult {
                input,
                result: mutation_result,
            });
        }

        (has_errors, result)
    }
}

// Pagination helpers

pub fn get_default_pagination_unlimited(pagination_option: Option<PaginationOption>) -> Pagination {
    match pagination_option {
        Some(pagination) => Pagination {
            offset: pagination.offset.unwrap_or(0),
            limit: pagination.limit.unwrap_or(DEFAULT_PAGINATION_MAX_LIMIT),
        },
        None => Pagination {
            offset: 0,
            limit: u32::MAX,
        },
    }
}

pub fn get_pagination_or_default(
    pagination_option: Option<PaginationOption>,
) -> Result<Pagination, ListError> {
    let check_limit = |limit: u32| -> Result<u32, ListError> {
        if limit < DEFAULT_PAGINATION_MIN_LIMIT {
            return Err(ListError::LimitBelowMin(DEFAULT_PAGINATION_MIN_LIMIT));
        }

        Ok(limit)
    };

    let result = if let Some(pagination) = pagination_option {
        Pagination {
            offset: pagination.offset.unwrap_or(0),
            limit: match pagination.limit {
                Some(limit) => check_limit(limit)?,
                None => DEFAULT_PAGINATION_MAX_LIMIT,
            },
        }
    } else {
        Pagination::all()
    };

    Ok(result)
}

// TODO move the following methods to util

pub fn i32_to_u32(num: i32) -> u32 {
    num.try_into().unwrap_or(0)
}

pub fn i64_to_u64(num: i64) -> u64 {
    num.try_into().unwrap_or(0)
}

pub fn i64_to_u32(num: i64) -> u32 {
    num.try_into().unwrap_or(0)
}

pub fn usize_to_u32(num: usize) -> u32 {
    num.try_into().unwrap_or(0)
}

pub fn usize_to_i32(num: usize) -> i32 {
    num.try_into().unwrap_or(0)
}

pub fn usize_to_u64(num: usize) -> u64 {
    num.try_into().unwrap_or(0)
}

#[derive(Debug, PartialEq)]
pub struct InputWithResult<I, R> {
    pub input: I,
    pub result: R,
}

#[derive(Debug, Clone, PartialEq)]
pub struct NullableUpdate<T> {
    pub value: Option<T>,
}

pub fn nullable_update<T: Clone>(
    input: &Option<NullableUpdate<T>>,
    current: Option<T>,
) -> Option<T> {
    match input {
        Some(NullableUpdate { value }) => value.clone(),
        None => current,
    }
}

fn check_location_exists(
    connection: &StorageConnection,
    store_id: &str,
    location_id: &str,
) -> Result<bool, RepositoryError> {
    let count = LocationRepository::new(connection).count(Some(
        LocationFilter::new()
            .id(EqualFilter::equal_to(location_id.to_string()))
            .store_id(EqualFilter::equal_to(store_id.to_string())),
    ))?;
    Ok(count > 0)
}

// Checks if the input location is of the correct type for the item
fn check_location_type_is_valid(
    connection: &StorageConnection,
    store_id: &str,
    location_id: &str,
    restricted_location_type_id: &str,
) -> Result<bool, RepositoryError> {
    let location = LocationRepository::new(connection)
        .query_by_filter(
            LocationFilter::new()
                .id(EqualFilter::equal_to(location_id.to_string()))
                .store_id(EqualFilter::equal_to(store_id.to_string())),
        )?
        .pop();

    match location {
        Some(location) => {
            Ok(location.location_row.location_type_id
                == Some(restricted_location_type_id.to_string()))
        }
        None => Ok(false),
    }
}

fn check_item_variant_exists(
    connection: &StorageConnection,
    item_variant_id: &str,
) -> Result<Option<ItemVariantRow>, RepositoryError> {
    let variant = ItemVariantRowRepository::new(connection).find_one_by_id(item_variant_id)?;

    Ok(variant)
}

fn check_vvm_status_exists(
    connection: &StorageConnection,
    vvm_status_id: &str,
) -> Result<Option<VVMStatusRow>, RepositoryError> {
    let vvm_status = VVMStatusRowRepository::new(connection).find_one_by_id(vvm_status_id)?;

    Ok(vvm_status)
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub struct UploadedFile {
    pub file_id: String,
}

#[derive(Error, Debug)]
pub enum UploadedFileConversionError {
    #[error("Problem while getting file")]
    StaticFileError(#[source] anyhow::Error),
    #[error("File not found")]
    FileNotFound,
}

#[derive(Error, Debug)]
pub enum UploadedFileJsonError {
    #[error(transparent)]
    UploadedFileConversionError(#[from] UploadedFileConversionError),
    #[error("Error while reading file")]
    ErrorWhileReadingFile(#[from] std::io::Error),
    #[error("Cannot parse plugin manifest file")]
    CannotParseFile(#[from] serde_json::Error),
}

impl UploadedFile {
    pub fn as_static_file(
        self,
        settings: &Settings,
    ) -> Result<StaticFile, UploadedFileConversionError> {
        use UploadedFileConversionError as Error;

        let base_dir = &settings.server.base_dir;

        let file_service = StaticFileService::new(base_dir).map_err(Error::StaticFileError)?;

        file_service
            .find_file(&self.file_id, StaticFileCategory::Temporary)
            .map_err(Error::StaticFileError)?
            .ok_or(Error::FileNotFound)
    }

    pub fn as_json_file<T: DeserializeOwned>(
        self,
        settings: &Settings,
    ) -> Result<T, UploadedFileJsonError> {
        let static_file = self.as_static_file(settings)?;
        let file = File::open(static_file.to_path_buf())?;
        let reader = BufReader::new(file);

        let json = serde_json::from_reader(reader)?;

        Ok(json)
    }
}

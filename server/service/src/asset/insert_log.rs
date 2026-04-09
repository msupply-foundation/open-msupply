use std::ops::Not;

use super::{
    query_log::get_asset_log,
    validate::{
        check_asset_exists, check_asset_log_exists, check_comment_required_for_reason,
        check_reason_matches_status,
    },
};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};
use chrono::Utc;
use repository::{
    asset_log_row::AssetLogStatus,
    assets::{
        asset_log::AssetLogFilter,
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::AssetRowRepository,
    },
    ActivityLogType, EqualFilter, RepositoryError, StorageConnection, StringFilter,
};

#[derive(PartialEq, Debug)]
pub enum InsertAssetLogError {
    AssetLogAlreadyExists,
    AssetDoesNotExist,
    StatusNotProvided,
    CreatedRecordNotFound,
    ReasonDoesNotExist,
    DatabaseError(RepositoryError),
    InsufficientPermission,
    ReasonInvalidForStatus,
    CommentRequiredForReason,
    LogDatetimeInFuture,
}

pub struct InsertAssetLog {
    pub id: String,
    pub asset_id: String,
    pub status: Option<AssetLogStatus>,
    pub comment: Option<String>,
    pub r#type: Option<String>,
    pub reason_id: Option<String>,
    pub log_datetime: Option<chrono::DateTime<chrono::Utc>>,
}

pub fn insert_asset_log(
    ctx: &ServiceContext,
    input: InsertAssetLog,
) -> Result<AssetLogRow, InsertAssetLogError> {
    let asset_log = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_asset_log = generate(ctx, input);
            AssetLogRowRepository::new(connection).upsert_one(&new_asset_log)?;

            if new_asset_log.r#type.as_deref() == Some("Temperature Mapping") {
                recalculate_mapping_dates(connection, &new_asset_log.asset_id)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::AssetLogCreated,
                Some(new_asset_log.id.clone()),
                None,
                None,
            )?;

            get_asset_log(ctx, new_asset_log.id).map_err(InsertAssetLogError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(asset_log)
}

/// Validates the input for inserting an asset log.
///
/// ### Arguments
///
/// * `input` - The asset log data to validate
/// * `connection` - Database connection for checking constraints
///
/// ### Returns
///
/// * `Ok(())` if validation passes
/// * `Err(InsertAssetLogError)` with specific error type if validation fails
///
/// ### Validation Rules
///
/// * Asset log ID must not already exist
/// * Status must be provided
/// * If reason is provided, it must match the status
/// * Asset must exist
/// * If reason has `comments_required` flag, comment must be non-empty
pub fn validate(
    input: &InsertAssetLog,
    connection: &StorageConnection,
) -> Result<(), InsertAssetLogError> {
    if check_asset_log_exists(&input.id, connection)?.is_some() {
        return Err(InsertAssetLogError::AssetLogAlreadyExists);
    }

    // Status is required unless a type is provided (e.g., "Temperature Mapping" events)
    if input.status.is_none() && input.r#type.is_none() {
        return Err(InsertAssetLogError::StatusNotProvided);
    }

    if !check_reason_matches_status(&input.status, &input.reason_id, connection) {
        return Err(InsertAssetLogError::ReasonInvalidForStatus);
    }

    if check_asset_exists(&input.asset_id, connection)?
        .is_some()
        .not()
    {
        return Err(InsertAssetLogError::AssetDoesNotExist);
    }

    if !check_comment_required_for_reason(&input.reason_id, &input.comment, connection) {
        return Err(InsertAssetLogError::CommentRequiredForReason);
    }

    if let Some(log_datetime) = &input.log_datetime {
        if *log_datetime >= Utc::now() {
            return Err(InsertAssetLogError::LogDatetimeInFuture);
        }
    }

    Ok(())
}

pub fn generate(
    ctx: &ServiceContext,
    InsertAssetLog {
        id,
        asset_id,
        status,
        comment,
        r#type,
        reason_id,
        log_datetime,
    }: InsertAssetLog,
) -> AssetLogRow {
    let now = Utc::now().naive_utc();
    AssetLogRow {
        id,
        asset_id,
        user_id: ctx.user_id.clone(),
        status,
        comment,
        r#type,
        reason_id,
        log_datetime: log_datetime.map(|d| d.naive_utc()).unwrap_or(now),
        created_datetime: now,
    }
}

pub fn recalculate_mapping_dates(
    connection: &StorageConnection,
    asset_id: &str,
) -> Result<(), InsertAssetLogError> {
    use repository::assets::asset_log::AssetLogRepository;

    let logs = AssetLogRepository::new(connection).query_by_filter(
        AssetLogFilter::new()
            .asset_id(EqualFilter::equal_to(asset_id.to_string()))
            .r#type(StringFilter::equal_to("Temperature Mapping")),
    )?;

    let min_date = logs.iter().map(|l| l.log_datetime).min();
    let max_date = logs.iter().map(|l| l.log_datetime).max();

    let asset_row = AssetRowRepository::new(connection)
        .find_one_by_id(asset_id)?
        .ok_or(InsertAssetLogError::AssetDoesNotExist)?;

    let mut properties: serde_json::Map<String, serde_json::Value> =
        match &asset_row.properties {
            Some(props) => serde_json::from_str(props).unwrap_or_default(),
            None => serde_json::Map::new(),
        };

    let format_date = |dt: chrono::NaiveDateTime| dt.format("%Y-%m-%d").to_string();

    match min_date {
        Some(d) => {
            properties.insert(
                "initial_mapping_date".to_string(),
                serde_json::Value::String(format_date(d)),
            );
        }
        None => {
            properties.remove("initial_mapping_date");
        }
    }
    match max_date {
        Some(d) => {
            properties.insert(
                "most_recent_mapping_date".to_string(),
                serde_json::Value::String(format_date(d)),
            );
        }
        None => {
            properties.remove("most_recent_mapping_date");
        }
    }

    let mut updated_row = asset_row;
    updated_row.properties = serde_json::to_string(&properties).ok();
    updated_row.modified_datetime = Utc::now().naive_utc();

    AssetRowRepository::new(connection).upsert_one(&updated_row, None)?;

    Ok(())
}

impl From<RepositoryError> for InsertAssetLogError {
    fn from(error: RepositoryError) -> Self {
        InsertAssetLogError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertAssetLogError {
    fn from(error: SingleRecordError) -> Self {
        use InsertAssetLogError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}

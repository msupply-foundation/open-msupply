use std::ops::Not;

use super::{
    insert::InsertAssetError,
    query_log::get_asset_log,
    validate::{
        check_asset_exists, check_asset_log_exists, check_comment_required_for_reason,
        check_reason_matches_status,
    },
};
use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};
use chrono::{NaiveDate, Utc};

use repository::{
    asset_log_row::{AssetLogStatus, AssetLogType},
    assets::{
        asset_log::AssetLogFilter,
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::AssetRowRepository,
    },
    ActivityLogType, EqualFilter, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub const IMPORTED_FROM_CSV_COMMENT: &str = "Imported from CSV";

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
    pub r#type: Option<AssetLogType>,
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

            if new_asset_log.r#type == Some(AssetLogType::TemperatureMapping) {
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

    // StatusUpdate logs require a status; event-type logs (e.g. TemperatureMapping) don't.
    // A missing type defaults to StatusUpdate.
    let effective_type = input.r#type.clone().unwrap_or_default();
    if effective_type == AssetLogType::StatusUpdate && input.status.is_none() {
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
        if *log_datetime > Utc::now() {
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
        r#type: Some(r#type.unwrap_or_default()),
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
            .r#type(AssetLogType::TemperatureMapping.equal_to()),
    )?;

    let min_date = logs.iter().map(|l| l.log_datetime).min();
    let max_date = logs.iter().map(|l| l.log_datetime).max();

    let asset_row = AssetRowRepository::new(connection)
        .find_one_by_id(asset_id)?
        .ok_or(InsertAssetLogError::AssetDoesNotExist)?;

    let mut properties: serde_json::Map<String, serde_json::Value> = match &asset_row.properties {
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

/// CSV imports persist `initial_mapping_date` / `most_recent_mapping_date` directly into
/// `asset.properties`. Without a corresponding `TemperatureMapping` log, the next call to
/// `recalculate_mapping_dates` (triggered by any UI-recorded mapping) would overwrite those
/// values from the log table and the imported dates would be lost. This creates synthetic
/// log entries so the recalc treats the imported dates as part of the history.
pub fn create_logs_for_imported_mapping_dates(
    connection: &StorageConnection,
    asset_id: &str,
    user_id: &str,
    properties_json: &str,
) -> Result<(), InsertAssetError> {
    let props: serde_json::Map<String, serde_json::Value> =
        match serde_json::from_str(properties_json) {
            Ok(p) => p,
            Err(_) => return Ok(()),
        };

    let mut dates: Vec<NaiveDate> = Vec::new();
    for key in ["initial_mapping_date", "most_recent_mapping_date"] {
        let Some(raw) = props.get(key).and_then(|v| v.as_str()) else {
            continue;
        };
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Canonical form is YYYY-MM-DD (what `recalculate_mapping_dates` writes
        // and what the fixed client now sends). Accept DD/MM/YYYY too as a
        // safety net for any caller that still sends the CSV display format.
        let parsed = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
            .or_else(|_| NaiveDate::parse_from_str(trimmed, "%d/%m/%Y"))
            .map_err(|_| InsertAssetError::InvalidMappingDate {
                key: key.to_string(),
                value: trimmed.to_string(),
            })?;
        dates.push(parsed);
    }
    dates.sort();
    dates.dedup();

    if dates.is_empty() {
        return Ok(());
    }

    let now = Utc::now().naive_utc();
    let repo = AssetLogRowRepository::new(connection);

    for date in dates {
        let log_datetime = date.and_hms_opt(0, 0, 0).unwrap_or(now);
        let log = AssetLogRow {
            id: uuid(),
            asset_id: asset_id.to_string(),
            user_id: user_id.to_string(),
            status: None,
            comment: Some(IMPORTED_FROM_CSV_COMMENT.to_string()),
            r#type: Some(AssetLogType::TemperatureMapping),
            reason_id: None,
            log_datetime,
            created_datetime: now,
        };
        repo.upsert_one(&log)?;
    }

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

use repository::{
    asset::{Asset, AssetFilter, AssetRepository},
    asset_internal_location::{AssetInternalLocationFilter, AssetInternalLocationRepository},
    asset_internal_location_row::AssetInternalLocationRow,
    asset_log_reason_row::{AssetLogReasonRow, AssetLogReasonRowRepository},
    asset_log_row::AssetLogStatus,
    asset_property_row::{AssetPropertyRow, AssetPropertyRowRepository},
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    location::{LocationFilter, LocationRepository},
    EqualFilter, RepositoryError, StorageConnection, StringFilter,
};

use super::update::UpdateAssetError;

pub fn check_asset_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetRow>, RepositoryError> {
    AssetRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_asset_property_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetPropertyRow>, RepositoryError> {
    AssetPropertyRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_asset_number_exists(
    connection: &StorageConnection,
    asset_number: &str,
    updated_asset_id: Option<String>,
) -> Result<Vec<Asset>, RepositoryError> {
    let mut filter = AssetFilter::new().asset_number(StringFilter::equal_to(asset_number));
    if let Some(updated_asset_id) = updated_asset_id {
        filter = filter.id(EqualFilter::not_equal_to(updated_asset_id.to_string()));
    }
    AssetRepository::new(connection).query_by_filter(filter)
}

pub fn check_asset_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetLogRow>, RepositoryError> {
    AssetLogRowRepository::new(connection).find_one_by_id(id)
}

/// Validates reason requirements for an asset log status.
///
/// This function performs two checks:
/// 1. If status is `NotFunctioning`, a reason must be provided
/// 2. If a reason is provided, it must match the status type
///
/// ### Arguments
///
/// * `status` - Optional `AssetLogStatus` of the log
/// * `reason_id` - Optional reason identifier
/// * `connection` - Database connection to look up the reason
///
/// ### Returns
///
/// * `true` if all validation passes
/// * `false` if validation fails:
///   - Status is `NotFunctioning` but no reason provided
///   - Reason is provided but doesn't match the status
///   - Reason lookup fails or reason doesn't exist
pub fn check_reason_matches_status(
    status: &Option<AssetLogStatus>,
    reason_id: &Option<String>,
    connection: &StorageConnection,
) -> bool {
    // Check if reason is required for this status
    if let Some(AssetLogStatus::NotFunctioning) = status {
        if reason_id.is_none() {
            return false;
        }
    }

    // If a reason is provided, validate it matches the status
    if let Some(reason_id) = reason_id {
        match status {
            Some(status) => {
                let reason = AssetLogReasonRowRepository::new(connection).find_one_by_id(reason_id);
                if let Ok(Some(reason)) = reason {
                    return reason.asset_log_status == *status;
                } else {
                    return false;
                }
            }
            None => return false,
        }
    }
    // return true as a default if no reason provided for asset log (and status doesn't require one)
    true
}

/// Checks if a comment is required for the given reason and whether the provided
/// comment satisfies the requirement.
///
/// ### Arguments
///
/// * `reason_id` - Optional reason identifier associated with the asset log
/// * `comment` - Optional user-provided comment for the asset log
/// * `connection` - Database connection used to retrieve the reason
///
/// ### Returns
///
/// * `true` if no comment is required or the provided comment satisfies the requirement
/// * `false` if a non-empty comment is required but not provided
pub fn check_comment_required_for_reason(
    reason_id: &Option<String>,
    comment: &Option<String>,
    connection: &StorageConnection,
) -> bool {
    if let Some(reason_id) = reason_id {
        let reason = AssetLogReasonRowRepository::new(connection).find_one_by_id(reason_id);
        if let Ok(Some(reason)) = reason {
            if reason.comments_required {
                return comment
                    .as_ref()
                    .map(|c| !c.trim().is_empty())
                    .unwrap_or(false);
            }
        }
        true
    } else {
        true
    }
}

pub fn check_locations_are_assigned(
    location_ids: Vec<String>,
    asset_id: &str,
    connection: &StorageConnection,
) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
    AssetInternalLocationRepository::new(connection).query_by_filter(
        AssetInternalLocationFilter::new()
            .location_id(EqualFilter::equal_any(location_ids))
            .asset_id(EqualFilter::not_equal_to(asset_id.to_string())),
    )
}

pub fn check_locations_belong_to_store(
    location_ids: Vec<String>,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<(), UpdateAssetError> {
    let locations = LocationRepository::new(connection).query_by_filter(
        LocationFilter::new()
            .id(EqualFilter::equal_any(location_ids))
            .store_id(EqualFilter::not_equal_to(store_id.to_string())),
    )?;
    if !locations.is_empty() {
        return Err(UpdateAssetError::LocationDoesNotBelongToStore);
    }
    Ok(())
}

pub fn check_asset_log_reason_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetLogReasonRow>, RepositoryError> {
    AssetLogReasonRowRepository::new(connection).find_one_by_id(id)
}

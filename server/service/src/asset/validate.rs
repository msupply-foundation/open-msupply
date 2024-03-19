use repository::{
    asset_internal_location::{AssetInternalLocationFilter, AssetInternalLocationRepository},
    asset_internal_location_row::AssetInternalLocationRow,
    asset_log_row::{AssetLogReason, AssetLogStatus},
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_asset_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetRow>, RepositoryError> {
    Ok(AssetRowRepository::new(connection).find_one_by_id(id)?)
}

pub fn check_asset_log_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<AssetLogRow>, RepositoryError> {
    Ok(AssetLogRowRepository::new(connection).find_one_by_id(id)?)
}

pub fn check_reason_matches_status(
    status: &Option<AssetLogStatus>,
    reason: &Option<AssetLogReason>,
) -> bool {
    let status = match status {
        Some(status) => status,
        None => return true,
    };

    let reason = match reason {
        Some(reason) => reason.to_owned(),
        None => return true,
    };

    match status {
        AssetLogStatus::NotInUse => {
            reason == AssetLogReason::AwaitingDecomissioning
                || reason == AssetLogReason::Stored
                || reason == AssetLogReason::OffsiteForRepairs
                || reason == AssetLogReason::AwaitingDecomissioning
        }
        AssetLogStatus::FunctioningButNeedsAttention => {
            reason == AssetLogReason::NeedsServicing
                || reason == AssetLogReason::MultipleTemperatureBreaches
        }
        AssetLogStatus::NotFunctioning => {
            reason == AssetLogReason::Unknown
                || reason == AssetLogReason::NeedsSpareParts
                || reason == AssetLogReason::LackOfPower
        }
        // If a reason exists, it won't match the reamining statuses which require a None reason.
        _ => false,
    }
}

pub fn check_locations_are_assigned(
    location_ids: Vec<String>,
    connection: &StorageConnection,
) -> Result<Vec<AssetInternalLocationRow>, RepositoryError> {
    Ok(
        AssetInternalLocationRepository::new(connection).query_by_filter(
            AssetInternalLocationFilter::new().id(EqualFilter::equal_any(location_ids)),
        )?,
    )
}

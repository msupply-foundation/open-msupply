use repository::{
    asset_log_row::{Reason, Status},
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    RepositoryError, StorageConnection,
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

pub fn check_reason_matches_status(status: &Option<Status>, reason: &Option<Reason>) -> bool {
    let status = match status {
        Some(status) => status,
        None => return true,
    };

    let reason = match reason {
        Some(reason) => reason.to_owned(),
        None => return true,
    };

    match status {
        Status::NotInUse => {
            reason == Reason::AwaitingDecomissioning
                || reason == Reason::Stored
                || reason == Reason::OffsiteForRepairs
                || reason == Reason::AwaitingDecomissioning
        }
        Status::FunctioningButNeedsAttention => {
            reason == Reason::NeedsServicing || reason == Reason::MultipleTemperatureBreaches
        }
        Status::NotFunctioning => {
            reason == Reason::Unknown
                || reason == Reason::NeedsSpareParts
                || reason == Reason::LackOfPower
        }
        // If a reason exists, it won't match the reamining statuses which require a None reason.
        _ => false,
    }
}

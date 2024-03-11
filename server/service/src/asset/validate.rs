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
    return match status {
        None => true,
        Some(status) => match status {
            Status::NotInUse => match reason {
                None => true,
                Some(Reason::AwaitingDecomissioning) => true,
                Some(Reason::Stored) => true,
                Some(Reason::OffsiteForRepairs) => true,
                Some(Reason::AwaitingInstallation) => true,
                _ => false,
            },
            Status::Functioning => match reason {
                None => true,
                _ => false,
            },
            Status::FunctioningButNeedsAttention => match reason {
                None => true,
                Some(Reason::NeedsServicing) => true,
                Some(Reason::MultipleTemperatureBreaches) => true,
                _ => false,
            },
            Status::NotFunctioning => match reason {
                None => true,
                Some(Reason::Unknown) => true,
                Some(Reason::NeedsSpareParts) => true,
                Some(Reason::LackOfPower) => true,
                _ => false,
            },
            Status::Decomissioned => match reason {
                None => true,
                _ => false,
            },
        },
    };
}

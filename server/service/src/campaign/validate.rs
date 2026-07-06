use repository::{
    campaign::{
        campaign::{CampaignFilter, CampaignRepository},
        campaign_row::CampaignRowRepository,
    },
    EqualFilter, RepositoryError, StorageConnection,
};

pub fn check_campaign_exists(
    connection: &StorageConnection,
    campaign_id: &str,
) -> Result<bool, RepositoryError> {
    let count = CampaignRepository::new(connection).count(Some(
        CampaignFilter::new().id(EqualFilter::equal_to(campaign_id.to_string())),
    ))?;
    Ok(count > 0)
}

/// Checks whether a campaign row exists, including soft-deleted campaigns.
///
/// Campaigns are soft-deleted (`deleted_datetime` is set), but their id stays
/// referenced on stock lines. When such a stock line is carried forward onto a
/// stocktake/invoice line, the (now soft-deleted) campaign id must still pass
/// validation - the user cannot newly assign a deleted campaign, so any
/// soft-deleted id reaching these mutations is a legitimate carry-forward.
pub fn check_campaign_exists_including_deleted(
    connection: &StorageConnection,
    campaign_id: &str,
) -> Result<bool, RepositoryError> {
    CampaignRowRepository::new(connection).check_exists_by_id(campaign_id)
}

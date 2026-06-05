use repository::{
    campaign::campaign::{CampaignFilter, CampaignRepository},
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

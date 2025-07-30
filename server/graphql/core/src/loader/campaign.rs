use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{
    campaign_row::{CampaignRow, CampaignRowRepository},
    RepositoryError, StorageConnectionManager,
};
use std::collections::HashMap;

pub struct CampaignByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for CampaignByIdLoader {
    type Value = CampaignRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = CampaignRowRepository::new(&connection);

        let result = repo.find_many_by_id(ids)?;

        Ok(result
            .into_iter()
            .map(|campaign| (campaign.id.clone(), campaign))
            .collect())
    }
}

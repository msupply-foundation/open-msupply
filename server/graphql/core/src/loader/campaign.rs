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
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, CampaignRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = CampaignRowRepository::new(&connection);

                let result = repo.find_many_by_id(&ids)?;

                Ok(result
                    .into_iter()
                    .map(|campaign| (campaign.id.clone(), campaign))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}

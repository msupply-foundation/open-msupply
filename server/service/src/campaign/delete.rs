use repository::{campaign::campaign_row::CampaignRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

use super::validate::check_campaign_exists;

#[derive(PartialEq, Debug)]
pub enum DeleteCampaignError {
    CampaignDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(Clone, Default)]
pub struct DeleteCampaign {
    pub id: String,
}

pub fn delete_campaign(
    ctx: &ServiceContext,
    input: DeleteCampaign,
) -> Result<String, DeleteCampaignError> {
    let campaign_id = ctx
        .connection
        .transaction_sync(|connection| {
            let campaign_exists = check_campaign_exists(connection, &input.id)?;
            if !campaign_exists {
                return Err(DeleteCampaignError::CampaignDoesNotExist);
            }

            CampaignRowRepository::new(connection).delete(&input.id)?;
            Ok(input.id.clone())
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(campaign_id)
}

impl From<RepositoryError> for DeleteCampaignError {
    fn from(error: RepositoryError) -> Self {
        DeleteCampaignError::DatabaseError(error)
    }
}

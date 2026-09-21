use repository::{
    campaign::campaign_row::CampaignRowRepository, RepositoryError, StorageConnection,
};

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
        .transaction_sync(|connection| delete_one(connection, &input.id))
        .map_err(|error| error.to_inner_error())?;

    Ok(campaign_id)
}

pub fn delete_campaigns(
    ctx: &ServiceContext,
    ids: Vec<String>,
) -> Result<Vec<String>, DeleteCampaignError> {
    let campaign_ids = ctx
        .connection
        .transaction_sync(|connection| {
            ids.iter()
                .map(|id| delete_one(connection, id))
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(campaign_ids)
}

fn delete_one(connection: &StorageConnection, id: &str) -> Result<String, DeleteCampaignError> {
    let campaign_exists = check_campaign_exists(connection, id)?;
    if !campaign_exists {
        return Err(DeleteCampaignError::CampaignDoesNotExist);
    }

    CampaignRowRepository::new(connection).mark_deleted(id)?;
    Ok(id.to_string())
}

impl From<RepositoryError> for DeleteCampaignError {
    fn from(error: RepositoryError) -> Self {
        DeleteCampaignError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::campaign::{check_campaign_exists, UpsertCampaign};
    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn delete_campaigns_is_atomic() {
        let (_, _, connection_manager, _) =
            setup_all("delete_campaigns_is_atomic", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.campaign_service;

        for id in ["campaign_a", "campaign_b"] {
            service
                .upsert_campaign(
                    &ctx,
                    UpsertCampaign {
                        id: id.to_string(),
                        name: id.to_string(),
                        start_date: None,
                        end_date: None,
                    },
                )
                .unwrap();
        }

        // A selection containing an unknown id deletes nothing at all.
        let result =
            service.delete_campaigns(&ctx, vec!["campaign_a".to_string(), "missing".to_string()]);
        assert_eq!(result, Err(DeleteCampaignError::CampaignDoesNotExist));
        assert!(check_campaign_exists(&ctx.connection, "campaign_a").unwrap());
        assert!(check_campaign_exists(&ctx.connection, "campaign_b").unwrap());

        // A selection of known ids deletes in full, reporting every id back.
        let deleted = service
            .delete_campaigns(
                &ctx,
                vec!["campaign_a".to_string(), "campaign_b".to_string()],
            )
            .unwrap();
        assert_eq!(
            deleted,
            vec!["campaign_a".to_string(), "campaign_b".to_string()]
        );
        assert!(!check_campaign_exists(&ctx.connection, "campaign_a").unwrap());
        assert!(!check_campaign_exists(&ctx.connection, "campaign_b").unwrap());

        // Already deleted is the same rejection as never existed.
        let result = service.delete_campaigns(&ctx, vec!["campaign_a".to_string()]);
        assert_eq!(result, Err(DeleteCampaignError::CampaignDoesNotExist));
    }
}

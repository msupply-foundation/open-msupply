use chrono::NaiveDate;
use repository::{
    campaign::campaign::{Campaign, CampaignFilter, CampaignRepository},
    campaign::campaign_row::{CampaignRow, CampaignRowRepository},
    EqualFilter, RepositoryError, StorageConnection, StringFilter,
};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum UpsertCampaignError {
    CampaignDoesNotExist,
    DuplicateName,
    InvalidDates,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertCampaign {
    pub id: String,
    pub name: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

pub fn upsert_campaign(
    ctx: &ServiceContext,
    input: UpsertCampaign,
) -> Result<Campaign, UpsertCampaignError> {
    let campaign = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_campaign = generate(input.clone());
            let repo = CampaignRowRepository::new(connection);

            repo.upsert_one(&new_campaign)?;

            CampaignRepository::new(connection)
                .query_one(CampaignFilter::new().id(EqualFilter::equal_to(new_campaign.id.to_string())))?
                .ok_or(UpsertCampaignError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(campaign)
}

impl From<RepositoryError> for UpsertCampaignError {
    fn from(error: RepositoryError) -> Self {
        UpsertCampaignError::DatabaseError(error)
    }
}

pub fn generate(
    UpsertCampaign {
        id,
        name,
        start_date,
        end_date,
    }: UpsertCampaign,
) -> CampaignRow {
    CampaignRow {
        id,
        name,
        start_date,
        end_date,
        deleted_datetime: None,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertCampaign,
) -> Result<(), UpsertCampaignError> {
    // Check for duplicate name
    let campaigns_with_duplicate_name = CampaignRepository::new(connection).query_by_filter(
        CampaignFilter::new()
            .name(StringFilter::equal_to(input.name.trim()))
            .id(EqualFilter::not_equal_to(input.id.to_string())),
    )?;

    if !campaigns_with_duplicate_name.is_empty() {
        return Err(UpsertCampaignError::DuplicateName);
    }

    // Validate dates
    if let (Some(start_date), Some(end_date)) = (input.start_date, input.end_date) {
        if start_date > end_date {
            return Err(UpsertCampaignError::InvalidDates);
        }
    }

    Ok(())
}

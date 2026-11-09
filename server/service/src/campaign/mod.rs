mod delete;
mod query;
mod upsert;
mod validate;

use crate::{ListError, ListResult, service_provider::ServiceContext};
pub use delete::{DeleteCampaign, DeleteCampaignError, delete_campaign, delete_campaigns};
pub use query::get_campaigns;
use repository::{
    PaginationOption,
    campaign::campaign::{Campaign, CampaignFilter, CampaignSort},
};
pub use upsert::{UpsertCampaign, UpsertCampaignError, upsert_campaign};
pub use validate::{check_campaign_exists, check_campaign_exists_including_deleted};

pub trait CampaignServiceTrait: Send + Sync {
    fn get_campaigns(
        &self,
        ctx: &ServiceContext,
        pagination_option: Option<PaginationOption>,
        campaign_filter: Option<CampaignFilter>,
        campaign_sort: Option<CampaignSort>,
    ) -> Result<ListResult<Campaign>, ListError> {
        get_campaigns(ctx, pagination_option, campaign_filter, campaign_sort)
    }

    fn upsert_campaign(
        &self,
        ctx: &ServiceContext,
        input: UpsertCampaign,
    ) -> Result<Campaign, UpsertCampaignError> {
        upsert_campaign(ctx, input)
    }

    fn delete_campaign(
        &self,
        ctx: &ServiceContext,
        input: DeleteCampaign,
    ) -> Result<String, DeleteCampaignError> {
        delete_campaign(ctx, input)
    }

    fn delete_campaigns(
        &self,
        ctx: &ServiceContext,
        ids: Vec<String>,
    ) -> Result<Vec<String>, DeleteCampaignError> {
        delete_campaigns(ctx, ids)
    }
}

pub struct CampaignService;
impl CampaignServiceTrait for CampaignService {}

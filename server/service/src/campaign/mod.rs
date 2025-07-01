mod delete;
mod query;
mod upsert;
mod validate;

pub use delete::{delete_campaign, DeleteCampaign, DeleteCampaignError};
pub use query::get_campaigns;
use repository::{
    campaign::campaign::{Campaign, CampaignFilter, CampaignSort},
    PaginationOption,
};
pub use upsert::{upsert_campaign, UpsertCampaign, UpsertCampaignError};

use crate::{service_provider::ServiceContext, ListError, ListResult};

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
}

pub struct CampaignService;
impl CampaignServiceTrait for CampaignService {}

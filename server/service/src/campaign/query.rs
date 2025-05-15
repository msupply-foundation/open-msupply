use repository::{
    campaign::campaign::{Campaign, CampaignFilter, CampaignRepository, CampaignSort},
    PaginationOption,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_campaigns(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<CampaignFilter>,
    sort: Option<CampaignSort>,
) -> Result<ListResult<Campaign>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = CampaignRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

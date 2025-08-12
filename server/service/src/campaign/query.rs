use repository::{
    campaign::campaign::{Campaign, CampaignFilter, CampaignRepository, CampaignSort},
    PaginationOption,
};

use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub fn get_campaigns(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<CampaignFilter>,
    sort: Option<CampaignSort>,
) -> Result<ListResult<Campaign>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = CampaignRepository::new(&ctx.connection);
    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

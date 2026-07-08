use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{loader::LocationByIdLoader, ContextExt};
use service::stock_relocation::query::DraftStockRelocationLine;

use super::LocationNode;

pub struct DraftStockRelocationLineNode {
    pub draft_line: DraftStockRelocationLine,
}

impl DraftStockRelocationLineNode {
    pub fn from_domain(draft_line: DraftStockRelocationLine) -> DraftStockRelocationLineNode {
        DraftStockRelocationLineNode { draft_line }
    }

    pub fn from_vec(
        draft_lines: Vec<DraftStockRelocationLine>,
    ) -> Vec<DraftStockRelocationLineNode> {
        draft_lines
            .into_iter()
            .map(DraftStockRelocationLineNode::from_domain)
            .collect()
    }
}

#[Object]
impl DraftStockRelocationLineNode {
    pub async fn id(&self) -> &str {
        &self.draft_line.id
    }

    pub async fn stock_line_id(&self) -> &str {
        &self.draft_line.stock_line_id
    }

    pub async fn item_id(&self) -> &str {
        &self.draft_line.item_id
    }

    pub async fn item_code(&self) -> &str {
        &self.draft_line.item_code
    }

    pub async fn item_name(&self) -> &str {
        &self.draft_line.item_name
    }

    pub async fn restricted_location_type_id(&self) -> &Option<String> {
        &self.draft_line.restricted_location_type_id
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.draft_line.batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.draft_line.expiry_date
    }

    pub async fn pack_size(&self) -> f64 {
        self.draft_line.pack_size
    }

    pub async fn available_number_of_packs(&self) -> f64 {
        self.draft_line.available_number_of_packs
    }

    pub async fn total_number_of_packs(&self) -> f64 {
        self.draft_line.total_number_of_packs
    }

    pub async fn on_hold(&self) -> bool {
        self.draft_line.on_hold
    }

    pub async fn number_of_packs(&self) -> Option<f64> {
        self.draft_line.number_of_packs
    }

    pub async fn source_location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        location_node(ctx, &self.draft_line.source_location_id).await
    }

    pub async fn destination_location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        location_node(ctx, &self.draft_line.destination_location_id).await
    }
}

async fn location_node(
    ctx: &Context<'_>,
    location_id: &Option<String>,
) -> Result<Option<LocationNode>> {
    let Some(location_id) = location_id else {
        return Ok(None);
    };
    let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();
    Ok(loader
        .load_one(location_id.clone())
        .await?
        .map(LocationNode::from_domain))
}

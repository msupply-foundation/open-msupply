use super::{
    CampaignNode, ItemNode, ItemVariantNode, LocationNode, NameNode, VVMStatusLogConnector,
    VVMStatusNode,
};
use crate::types::{
    program_node::ProgramNode, program_order_type::ProgramOrderTypeNode, LocationFilterInput,
    MasterListFilterInput,
};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    generic_filters::{DateFilterInput, EqualFilterStringInput, StringFilterInput},
    loader::{
        CampaignByIdLoader, ItemLoader, NameByNameLinkIdLoader, NameByNameLinkIdLoaderInput,
        OrderTypesByProgramIdInput, OrderTypesByProgramIdLoader, ProgramByIdLoader,
        VVMStatusLogByStockLineIdLoader,
    },
    simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    item_variant::item_variant::ItemVariant,
    location::{Location, LocationFilter},
    DateFilter, EqualFilter, ItemRow, StockLine, StockLineFilter, StockLineRow, StockLineSort,
    StockLineSortField, StringFilter,
};
use service::{
    service_provider::ServiceContext, stock_line::query::get_stock_line, usize_to_u32, ListResult,
};

pub struct StockLineNode {
    pub stock_line: StockLine,
}

#[derive(SimpleObject)]
pub struct StockLineConnector {
    total_count: u32,
    nodes: Vec<StockLineNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::stock_line::StockLineSortField")]
pub enum StockLineSortFieldInput {
    ExpiryDate,
    NumberOfPacks,
    ItemCode,
    ItemName,
    Batch,
    PackSize,
    SupplierName,
    LocationCode,
    CostPricePerPack,
    VvmStatusThenExpiry,
}
#[derive(InputObject)]
pub struct StockLineSortInput {
    /// Sort query result by `key`
    key: StockLineSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct StockLineFilterInput {
    pub expiry_date: Option<DateFilterInput>,
    pub id: Option<EqualFilterStringInput>,
    pub code: Option<StringFilterInput>,
    pub name: Option<StringFilterInput>,
    pub is_available: Option<bool>,
    pub item_code_or_name: Option<StringFilterInput>,
    pub search: Option<StringFilterInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub location_id: Option<EqualFilterStringInput>,
    pub vvm_status_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub has_packs_in_store: Option<bool>,
    pub location: Option<LocationFilterInput>,
    pub master_list: Option<MasterListFilterInput>,
    pub is_active: Option<bool>,
    pub is_program_stock_line: Option<bool>,
}

#[Object]
impl StockLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn item_id(&self) -> &str {
        &self.item_row().id
    }
    pub async fn item_name(&self) -> &str {
        &self.item_row().name
    }
    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.row().batch
    }
    pub async fn pack_size(&self) -> f64 {
        self.row().pack_size
    }
    #[graphql(deprecation = "Since 2.10.0. Use item_variant.id instead")]
    pub async fn item_variant_id(&self) -> &Option<String> {
        &self.row().item_variant_id
    }
    pub async fn vvm_status_id(&self) -> &Option<String> {
        &self.row().vvm_status_id
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.row().cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.row().sell_price_per_pack
    }
    pub async fn available_number_of_packs(&self) -> f64 {
        self.row().available_number_of_packs
    }
    pub async fn total_number_of_packs(&self) -> f64 {
        self.row().total_number_of_packs
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.row().expiry_date
    }
    pub async fn on_hold(&self) -> bool {
        self.row().on_hold
    }
    pub async fn note(&self) -> &Option<String> {
        &self.row().note
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.row().location_id
    }
    pub async fn location_name(&self) -> Option<&str> {
        self.stock_line.location_name()
    }

    pub async fn location(&self) -> Option<LocationNode> {
        self.stock_line.location_row.as_ref().map(|row| {
            LocationNode::from_domain(Location {
                location_row: row.clone(),
            })
        })
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.item_row().id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to stock_line ({})",
                &self.item_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn supplier_name(&self) -> Option<&str> {
        self.stock_line.supplier_name()
    }
    pub async fn barcode(&self) -> Option<&str> {
        self.stock_line.barcode()
    }

    pub async fn item_variant(&self) -> Option<ItemVariantNode> {
        self.stock_line
            .item_variant_row
            .as_ref()
            .map(|item_variant_row| {
                ItemVariantNode::from_domain(ItemVariant {
                    item_variant_row: item_variant_row.clone(),
                    item_row: self.stock_line.item_row.clone(),
                    // These two fields below are required by from_domain(), but are not returned in ItemVariantNode
                    // therefore it is simplest to pass them to from_domain() with a value of None.
                    manufacturer_row: None,
                    location_type_row: None,
                })
            })
    }

    pub async fn vvm_status(&self) -> Option<VVMStatusNode> {
        self.stock_line
            .vvm_status_row
            .as_ref()
            .map(|row| VVMStatusNode::from_domain(row.clone()))
    }
    pub async fn vvm_status_logs(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<VVMStatusLogConnector>> {
        let loader = ctx.get_loader::<DataLoader<VVMStatusLogByStockLineIdLoader>>();
        let result = loader.load_one(self.row().id.clone()).await?;

        Ok(result.map(VVMStatusLogConnector::from_domain))
    }

    pub async fn donor(&self, ctx: &Context<'_>, store_id: String) -> Result<Option<NameNode>> {
        let donor_link_id = match &self.row().donor_link_id {
            None => return Ok(None),
            Some(donor_link_id) => donor_link_id,
        };
        let loader = ctx.get_loader::<DataLoader<NameByNameLinkIdLoader>>();
        let result = loader
            .load_one(NameByNameLinkIdLoaderInput::new(&store_id, donor_link_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn campaign(&self, ctx: &Context<'_>) -> Result<Option<CampaignNode>> {
        let loader = ctx.get_loader::<DataLoader<CampaignByIdLoader>>();

        let campaign_id = match &self.row().campaign_id {
            Some(campaign_id) => campaign_id,
            None => return Ok(None),
        };

        let result = loader.load_one(campaign_id.clone()).await?;
        Ok(result.map(CampaignNode::from_domain))
    }

    pub async fn program(&self, ctx: &Context<'_>) -> Result<Option<ProgramNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();

        let program_id = match &self.row().program_id {
            Some(program_id) => program_id,
            None => return Ok(None),
        };

        let result = loader.load_one(program_id.clone()).await?;
        Ok(result.map(|program_row| ProgramNode { program_row }))
    }

    pub async fn program_order_type(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Vec<ProgramOrderTypeNode>> {
        let loader = ctx.get_loader::<DataLoader<OrderTypesByProgramIdLoader>>();

        let result = loader
            .load_one(OrderTypesByProgramIdInput::new(
                &store_id,
                &self.item_row().id,
            ))
            .await?;

        Ok(result
            .map(ProgramOrderTypeNode::from_vec)
            .unwrap_or_default())
    }

    pub async fn volume_per_pack(&self) -> f64 {
        self.row().volume_per_pack
    }

    pub async fn total_volume(&self) -> f64 {
        self.row().total_volume
    }
}

#[derive(Union)]
pub enum StockLinesResponse {
    Response(StockLineConnector),
}

#[derive(Union)]
pub enum StockLineResponse {
    Error(NodeError),
    Response(StockLineNode),
}

pub fn get_stock_line_response(ctx: &ServiceContext, id: String) -> StockLineResponse {
    match get_stock_line(ctx, id) {
        Ok(stock_line) => StockLineResponse::Response(StockLineNode::from_domain(stock_line)),
        Err(error) => StockLineResponse::Error(error.into()),
    }
}

impl From<StockLineFilterInput> for StockLineFilter {
    fn from(f: StockLineFilterInput) -> Self {
        StockLineFilter {
            expiry_date: f.expiry_date.map(DateFilter::from),
            id: f.id.map(EqualFilter::from),
            code: f.code.map(StringFilter::from),
            name: f.name.map(StringFilter::from),
            is_available: f.is_available,
            item_code_or_name: f.item_code_or_name.map(StringFilterInput::into),
            search: f.search.map(StringFilterInput::into),
            item_id: f.item_id.map(EqualFilter::from),
            location_id: f.location_id.map(EqualFilter::from),
            store_id: None,
            vvm_status_id: f.vvm_status_id.map(EqualFilter::from),
            has_packs_in_store: f.has_packs_in_store,
            location: f.location.map(LocationFilter::from),
            master_list: f.master_list.map(|f| f.to_domain()),
            is_active: f.is_active,
            is_program_stock_line: f.is_program_stock_line,
        }
    }
}

impl StockLineSortInput {
    pub fn to_domain(self) -> StockLineSort {
        StockLineSort {
            key: StockLineSortField::from(self.key),
            desc: self.desc,
        }
    }
}

impl StockLineNode {
    pub fn from_domain(stock_line: StockLine) -> StockLineNode {
        StockLineNode { stock_line }
    }

    pub fn row(&self) -> &StockLineRow {
        &self.stock_line.stock_line_row
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.stock_line.item_row
    }
}

impl StockLineConnector {
    pub fn from_domain(stock_lines: ListResult<StockLine>) -> StockLineConnector {
        StockLineConnector {
            total_count: stock_lines.count,
            nodes: stock_lines
                .rows
                .into_iter()
                .map(StockLineNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(stock_lines: Vec<StockLine>) -> StockLineConnector {
        StockLineConnector {
            total_count: usize_to_u32(stock_lines.len()),
            nodes: stock_lines
                .into_iter()
                .map(StockLineNode::from_domain)
                .collect(),
        }
    }
}

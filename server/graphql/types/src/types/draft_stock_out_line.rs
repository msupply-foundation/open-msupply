use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{
    loader::{
        CampaignByIdLoader, ItemVariantByItemVariantIdLoader, LocationByIdLoader,
        NameByNameLinkIdLoader, NameByNameLinkIdLoaderInput, ProgramByIdLoader,
        VVMStatusByIdLoader,
    },
    ContextExt,
};
use service::invoice_line::get_draft_outbound_lines::DraftStockOutLine;

use crate::types::program_node::ProgramNode;

use super::{CampaignNode, ItemVariantNode, LocationNode, NameNode, VVMStatusNode};

pub struct DraftStockOutItemData {
    pub lines: Vec<DraftStockOutLine>,
    pub placeholder_quantity: Option<f64>,
    pub prescribed_quantity: Option<f64>,
    pub note: Option<String>,
}

#[Object]
impl DraftStockOutItemData {
    pub async fn draft_lines(&self) -> Vec<DraftStockOutLineNode> {
        DraftStockOutLineNode::from_vec(self.lines.clone())
    }

    pub async fn placeholder_quantity(&self) -> Option<f64> {
        self.placeholder_quantity
    }

    pub async fn prescribed_quantity(&self) -> Option<f64> {
        self.prescribed_quantity
    }

    pub async fn note(&self) -> Option<String> {
        self.note.clone()
    }
}

pub struct DraftStockOutLineNode {
    pub shipment_line: DraftStockOutLine,
}

impl DraftStockOutLineNode {
    pub fn from_vec(shipment_lines: Vec<DraftStockOutLine>) -> Vec<DraftStockOutLineNode> {
        shipment_lines
            .into_iter()
            .map(|shipment_line| DraftStockOutLineNode { shipment_line })
            .collect()
    }
}

#[Object]
impl DraftStockOutLineNode {
    pub async fn id(&self) -> &str {
        &self.shipment_line.id
    }

    pub async fn number_of_packs(&self) -> &f64 {
        &self.shipment_line.number_of_packs
    }

    pub async fn stock_line_id(&self) -> &str {
        &self.shipment_line.stock_line_id
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.shipment_line.batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.shipment_line.expiry_date
    }

    pub async fn pack_size(&self) -> f64 {
        self.shipment_line.pack_size
    }

    pub async fn sell_price_per_pack(&self) -> f64 {
        self.shipment_line.sell_price_per_pack
    }

    pub async fn in_store_packs(&self) -> f64 {
        self.shipment_line.in_store_packs
    }

    pub async fn available_packs(&self) -> f64 {
        self.shipment_line.available_packs
    }

    pub async fn stock_line_on_hold(&self) -> &bool {
        &self.shipment_line.stock_line_on_hold
    }

    pub async fn doses_per_unit(&self) -> i32 {
        self.shipment_line.doses_per_unit
    }

    pub async fn item_variant_id(&self) -> &Option<String> {
        &self.shipment_line.item_variant_id
    }

    pub async fn vvm_status_id(&self) -> &Option<String> {
        &self.shipment_line.vvm_status_id
    }

    pub async fn donor(&self, ctx: &Context<'_>, store_id: String) -> Result<Option<NameNode>> {
        let donor_link_id = match &self.shipment_line.donor_id {
            None => return Ok(None),
            Some(donor_link_id) => donor_id: donor_link_id,
        };
        let loader = ctx.get_loader::<DataLoader<NameByNameLinkIdLoader>>();
        let result = loader
            .load_one(NameByNameLinkIdLoaderInput::new(&store_id, donor_link_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn campaign(&self, ctx: &Context<'_>) -> Result<Option<CampaignNode>> {
        let loader = ctx.get_loader::<DataLoader<CampaignByIdLoader>>();

        let campaign_id = match &self.shipment_line.campaign_id {
            Some(campaign_id) => campaign_id,
            None => return Ok(None),
        };

        let result = loader.load_one(campaign_id.clone()).await?;
        Ok(result.map(CampaignNode::from_domain))
    }
    pub async fn program(&self, ctx: &Context<'_>) -> Result<Option<ProgramNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();

        let program_id = match &self.shipment_line.program_id {
            Some(program_id) => program_id,
            None => return Ok(None),
        };

        let result = loader.load_one(program_id.clone()).await?;
        Ok(result.map(|program_row| ProgramNode { program_row }))
    }

    pub async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.shipment_line.location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
    }

    pub async fn vvm_status(&self, ctx: &Context<'_>) -> Result<Option<VVMStatusNode>> {
        if self.shipment_line.vvm_status_id.is_none() {
            return Ok(None);
        }

        let loader = ctx.get_loader::<DataLoader<VVMStatusByIdLoader>>();
        let status_id = match self.shipment_line.vvm_status_id.clone() {
            Some(status_id) => status_id,
            None => return Ok(None),
        };

        Ok(loader
            .load_one(status_id)
            .await?
            .map(VVMStatusNode::from_domain))
    }

    pub async fn item_variant(&self, ctx: &Context<'_>) -> Result<Option<ItemVariantNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemVariantByItemVariantIdLoader>>();

        let item_variant_id = match &self.shipment_line.item_variant_id {
            None => return Ok(None),
            Some(item_variant_id) => item_variant_id.clone(),
        };

        let result = loader.load_one(item_variant_id).await?;
        Ok(result.map(ItemVariantNode::from_domain))
    }

    pub async fn volume_per_pack(&self) -> Option<f64> {
        Some(self.shipment_line.volume_per_pack)
    }
}

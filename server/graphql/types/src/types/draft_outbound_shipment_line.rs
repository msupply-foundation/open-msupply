use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{
    loader::{ItemVariantByItemVariantIdLoader, LocationByIdLoader},
    ContextExt,
};
use service::invoice_line::get_draft_outbound_lines::DraftOutboundShipmentLine;

use super::{ItemVariantNode, LocationNode};

pub struct DraftOutboundShipmentItemData {
    pub lines: Vec<DraftOutboundShipmentLine>,
    pub placeholder_quantity: Option<f64>,
}

#[Object]
impl DraftOutboundShipmentItemData {
    pub async fn draft_lines(&self) -> Vec<DraftOutboundShipmentLineNode> {
        DraftOutboundShipmentLineNode::from_vec(self.lines.clone())
    }

    pub async fn placeholder_quantity(&self) -> Option<f64> {
        self.placeholder_quantity
    }
}

pub struct DraftOutboundShipmentLineNode {
    pub shipment_line: DraftOutboundShipmentLine,
}

impl DraftOutboundShipmentLineNode {
    pub fn from_vec(
        shipment_lines: Vec<DraftOutboundShipmentLine>,
    ) -> Vec<DraftOutboundShipmentLineNode> {
        shipment_lines
            .into_iter()
            .map(|shipment_line| DraftOutboundShipmentLineNode { shipment_line })
            .collect()
    }
}

#[Object]
impl DraftOutboundShipmentLineNode {
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

    pub async fn default_doses_per_unit(&self) -> i32 {
        self.shipment_line.default_doses_per_unit
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

    pub async fn item_variant(&self, ctx: &Context<'_>) -> Result<Option<ItemVariantNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemVariantByItemVariantIdLoader>>();

        let item_variant_id = match &self.shipment_line.item_variant_id {
            None => return Ok(None),
            Some(item_variant_id) => item_variant_id.clone(),
        };

        let result = loader.load_one(item_variant_id).await?;
        Ok(result.map(|item_variant| ItemVariantNode::from_domain(item_variant)))
    }
}

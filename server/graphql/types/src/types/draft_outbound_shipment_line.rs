use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{
    loader::{ItemLoader, LocationByIdLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use service::invoice_line::get_draft_outbound_lines::DraftOutboundShipmentLine;

use super::{ItemNode, LocationNode};

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

    pub async fn stock_line_id(&self) -> &Option<String> {
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

    pub async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.shipment_line.location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
    }

    // pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
    //     let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
    //     let item_option = loader.load_one(self.shipment_line.item_id.clone()).await?;

    //     let item = item_option.ok_or(
    //         StandardGraphqlError::InternalError(format!(
    //             "Cannot find item {} for invoice line {}",
    //             self.shipment_line.item_id, self.shipment_line.id
    //         ))
    //         .extend(),
    //     )?;

    //     Ok(ItemNode::from_domain(item))
    // }
}

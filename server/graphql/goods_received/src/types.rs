use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use graphql_core::loader::{
    GoodsReceivedLinesByGoodsReceivedIdLoader, NameByIdLoader, NameByIdLoaderInput,
    NameByNameLinkIdLoader, PurchaseOrderByIdLoader, UserLoader,
};
use graphql_core::loader::{NameByNameLinkIdLoaderInput, StoreByIdLoader};
use graphql_core::ContextExt;
use graphql_goods_received_line::types::GoodsReceivedLineConnector;
use graphql_types::types::{purchase_order, user, NameNode, StoreNode, UserNode};
use repository::goods_received_row::GoodsReceivedRow;
use service::ListResult;
#[derive(PartialEq, Debug)]
pub struct GoodsReceivedNode {
    pub goods_received: GoodsReceivedRow,
}

#[derive(SimpleObject)]
pub struct GoodsReceivedConnector {
    pub total_count: u32,
    pub nodes: Vec<GoodsReceivedNode>,
}

#[Object]
impl GoodsReceivedNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn number(&self) -> &i64 {
        &self.row().goods_received_number
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(self.row().store_id.clone())
            .await?
            .map(StoreNode::from_domain))
    }

    pub async fn status(&self) -> GoodsReceivedNodeStatus {
        GoodsReceivedNodeStatus::from(self.row().status.clone())
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn supplier(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let po_id = match self.row().purchase_order_id {
            Some(ref id) => id,
            None => return Ok(None),
        };

        let po_loader = ctx.get_loader::<DataLoader<PurchaseOrderByIdLoader>>();
        let purchase_order = po_loader
            .load_one(po_id.clone())
            .await?
            .map(purchase_order::PurchaseOrderNode::from_domain);

        if let Some(po) = purchase_order {
            let name_loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
            let name = name_loader
                .load_one(NameByIdLoaderInput::new(
                    &po.row().store_id,
                    &po.row().supplier_name_id,
                ))
                .await?
                .map(NameNode::from_domain);
            return Ok(name);
        }
        return Ok(None);
    }

    pub async fn purchase_order_id(&self) -> &Option<String> {
        &self.row().purchase_order_id
    }

    pub async fn purchase_order_number(&self, ctx: &Context<'_>) -> Result<Option<i64>> {
        let po_id = match self.row().purchase_order_id {
            Some(ref id) => id,
            None => return Ok(None),
        };

        let po_loader = ctx.get_loader::<DataLoader<PurchaseOrderByIdLoader>>();
        let purchase_order = po_loader
            .load_one(po_id.clone())
            .await?
            .map(purchase_order::PurchaseOrderNode::from_domain);

        match purchase_order {
            Some(po) => Ok(Some(po.row().purchase_order_number)),
            None => Ok(None),
        }
    }

    pub async fn supplier_reference(&self) -> &Option<String> {
        &self.row().supplier_reference
    }

    pub async fn donor(&self, ctx: &Context<'_>, store_id: String) -> Result<Option<NameNode>> {
        let donor_link_id = match &self.row().donor_id {
            None => return Ok(None),
            Some(donor_link_id) => donor_id: donor_link_id,
        };
        let loader = ctx.get_loader::<DataLoader<NameByNameLinkIdLoader>>();
        let result = loader
            .load_one(NameByNameLinkIdLoaderInput::new(&store_id, donor_link_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn received_datetime(&self) -> Option<NaiveDate> {
        self.row().received_date
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<GoodsReceivedLineConnector> {
        let loader = ctx.get_loader::<DataLoader<GoodsReceivedLinesByGoodsReceivedIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);
        Ok(GoodsReceivedLineConnector::from_vec(result))
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        let user_id = match self.row().created_by.clone() {
            Some(user_id) => user_id,
            None => return Ok(None),
        };

        let result = loader
            .load_one(user_id)
            .await?
            .map(user::UserNode::from_domain);
        Ok(result)
    }

    pub async fn finalised_datetime(&self) -> &Option<NaiveDateTime> {
        &self.row().finalised_datetime
    }
}

impl GoodsReceivedNode {
    pub fn from_domain(goods_received: GoodsReceivedRow) -> GoodsReceivedNode {
        GoodsReceivedNode { goods_received }
    }
}

impl GoodsReceivedNode {
    pub fn row(&self) -> &GoodsReceivedRow {
        &self.goods_received
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::goods_received_row
::GoodsReceivedStatus")]
pub enum GoodsReceivedNodeStatus {
    New,
    Finalised,
}

impl GoodsReceivedConnector {
    pub fn from_domain(goods_received: ListResult<GoodsReceivedRow>) -> GoodsReceivedConnector {
        GoodsReceivedConnector {
            total_count: goods_received.count,
            nodes: goods_received
                .rows
                .into_iter()
                .map(GoodsReceivedNode::from_domain)
                .collect(),
        }
    }
}

use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
pub mod purchase_order_queries;

use mutations::insert::{insert_purchase_order, InsertInput, InsertResponse};
use purchase_order_queries::*;

use crate::mutations::{
    add_from_master_list::{add_from_master_list, AddFromMasterListResponse},
    AddToPurchaseOrderFromMasterListInput,
};

#[derive(Default, Clone)]
pub struct PurchaseOrderQueries;

#[Object]
impl PurchaseOrderQueries {
    pub async fn purchase_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<PurchaseOrderResponse, async_graphql::Error> {
        get_purchase_order(ctx, &store_id, &id)
    }

    pub async fn purchase_orders(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PurchaseOrderFilterInput>,
        sort: Option<Vec<PurchaseOrderSortInput>>,
    ) -> Result<PurchaseOrdersResponse, async_graphql::Error> {
        get_purchase_orders(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct PurchaseOrderMutations;

#[Object]
impl PurchaseOrderMutations {
    pub async fn insert_purchase_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_purchase_order(ctx, &store_id, input)
    }

    // add to purchase order from master list
    pub async fn add_to_purchase_order_from_master_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: AddToPurchaseOrderFromMasterListInput,
    ) -> Result<AddFromMasterListResponse> {
        add_from_master_list(ctx, &store_id, input)
    }
}

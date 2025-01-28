use async_graphql::*;
use service::requisition_line::response_line_stats::{
    RequestStoreStats, ResponseRequisitionStats, ResponseStoreStats,
};

pub struct ResponseStoreStatsNode {
    pub response_store_stats: ResponseStoreStats,
}

pub struct RequestStoreStatsNode {
    pub request_store_stats: RequestStoreStats,
}

#[derive(SimpleObject)]
pub struct ResponseRequisitionStatsNode {
    pub response_store_stats: ResponseStoreStatsNode,
    pub request_store_stats: RequestStoreStatsNode,
}

#[Object]
impl ResponseStoreStatsNode {
    pub async fn stock_on_hand(&self) -> f64 {
        self.response_store_stats.stock_on_hand
    }

    pub async fn stock_on_order(&self) -> i32 {
        self.response_store_stats.stock_on_order
    }

    pub async fn incoming_stock(&self) -> i32 {
        self.response_store_stats.incoming_stock
    }

    pub async fn requested_quantity(&self) -> i32 {
        self.response_store_stats.requested_quantity
    }

    pub async fn other_requested_quantity(&self) -> i32 {
        self.response_store_stats.other_requested_quantity
    }
}

#[Object]
impl RequestStoreStatsNode {
    pub async fn stock_on_hand(&self) -> i32 {
        self.request_store_stats.stock_on_hand
    }

    pub async fn average_monthly_consumption(&self) -> i32 {
        self.request_store_stats.amc
    }

    pub async fn max_months_of_stock(&self) -> f64 {
        self.request_store_stats.max_months_of_stock
    }

    pub async fn suggested_quantity(&self) -> i32 {
        self.request_store_stats.suggested_quantity
    }
}

impl ResponseRequisitionStatsNode {
    pub fn from_domain(
        ResponseRequisitionStats {
            response_store_stats,
            request_store_stats,
        }: ResponseRequisitionStats,
    ) -> Self {
        ResponseRequisitionStatsNode {
            response_store_stats: ResponseStoreStatsNode {
                response_store_stats,
            },
            request_store_stats: RequestStoreStatsNode {
                request_store_stats,
            },
        }
    }
}

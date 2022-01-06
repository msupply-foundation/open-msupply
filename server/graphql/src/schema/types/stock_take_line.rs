use async_graphql::*;
use repository::{location_to_domain, stock_line_to_domain, StockTakeLine};

use crate::schema::types::{LocationNode, StockLineNode};

pub struct StockTakeLineNode {
    pub line: StockTakeLine,
}

#[Object]
impl StockTakeLineNode {
    pub async fn id(&self) -> &str {
        &self.line.line.id
    }

    pub async fn stock_take_id(&self) -> &str {
        &self.line.line.stock_take_id
    }

    pub async fn stock_line(&self) -> Option<StockLineNode> {
        self.line
            .stock_line
            .clone()
            .map(|stock_line| StockLineNode {
                stock_line: stock_line_to_domain((stock_line, self.line.location.clone())),
            })
    }

    pub async fn location_id(&self) -> Option<String> {
        self.line.line.location_id.clone()
    }

    pub async fn location(&self) -> Option<LocationNode> {
        self.line.location.clone().map(|location| LocationNode {
            location: location_to_domain(location),
        })
    }

    pub async fn comment(&self) -> Option<String> {
        self.line.line.comment.clone()
    }

    pub async fn snapshot_number_of_packs(&self) -> i32 {
        self.line.line.snapshot_number_of_packs
    }

    pub async fn counted_number_of_packs(&self) -> Option<i32> {
        self.line.line.counted_number_of_packs.clone()
    }
}

use crate::types::RelatedRecordNodeType;
use service::auth::Resource;

pub mod insert;
pub mod update;

pub fn map_resource_type(from: RelatedRecordNodeType) -> Resource {
    use RelatedRecordNodeType as from;
    use Resource as to;

    match from {
        from::StockLine => to::MutateStockLine,
    }
}

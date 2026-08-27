pub use async_graphql::*;
use repository::PaginationOption;

/// Pagination input.
///
/// Option to limit the number of returned items and/or queries large lists in "pages".
#[derive(InputObject)]
pub struct PaginationInput {
    /// Max number of returned items
    pub first: Option<u32>,
    /// First returned item is at the `offset` position in the full list
    pub offset: Option<u32>,
}

impl From<PaginationInput> for PaginationOption {
    fn from(
        PaginationInput {
            first: limit,
            offset,
        }: PaginationInput,
    ) -> Self {
        PaginationOption { limit, offset }
    }
}

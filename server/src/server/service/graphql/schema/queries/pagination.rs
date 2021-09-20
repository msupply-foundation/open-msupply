use async_graphql::InputObject;

#[derive(InputObject)]
pub struct Pagination {
    pub first: Option<u32>,
    pub offset: Option<u32>,
}

pub trait PaginationOption {
    fn first(&self) -> i64;
    fn offset(&self) -> i64;
}

pub const DEFAULT_PAGE_SIZE: u32 = 100;

impl PaginationOption for Option<Pagination> {
    fn first(&self) -> i64 {
        self.as_ref()
            .and_then(|pagination| pagination.first)
            .unwrap_or(DEFAULT_PAGE_SIZE)
            .into()
    }

    fn offset(&self) -> i64 {
        self.as_ref()
            .and_then(|pagination| pagination.offset)
            .unwrap_or(0)
            .into()
    }
}

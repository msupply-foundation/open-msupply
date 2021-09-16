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

pub const DEFAULT_PAGE_SIZE: i64 = 100;

impl PaginationOption for Option<Pagination> {
    fn first(&self) -> i64 {
        match match self {
            Some(pagination) => pagination.first,
            None => None,
        } {
            // This will potentially panic
            Some(first) => first.into(),
            None => DEFAULT_PAGE_SIZE,
        }
    }

    fn offset(&self) -> i64 {
        match match self {
            Some(pagination) => pagination.offset,
            None => None,
        } {
            // This will potentially panic
            Some(offset) => offset.into(),
            None => 0,
        }
    }
}

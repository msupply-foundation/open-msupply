use crate::{
    database::repository::RepositoryError,
    domain::{Pagination, PaginationOption, DEFAULT_LIMIT},
};
use std::convert::TryInto;

pub mod invoice;
pub mod item;
pub mod name;

pub struct ListResult<T> {
    pub rows: Vec<T>,
    pub count: u32,
}

pub enum ListError {
    DBError(RepositoryError),
    LimitBelowMin { limit: u32, min: u32 },
    LimitAboveMax { limit: u32, max: u32 },
}

pub enum SingleRecordError {
    DBError(RepositoryError),
    NotFound(String),
}

impl From<RepositoryError> for ListError {
    fn from(error: RepositoryError) -> Self {
        ListError::DBError(error)
    }
}

impl From<RepositoryError> for SingleRecordError {
    fn from(error: RepositoryError) -> Self {
        SingleRecordError::DBError(error)
    }
}

pub fn get_default_pagination(
    pagination_option: Option<PaginationOption>,
    max_limit: u32,
    min_limit: u32,
) -> Result<Pagination, ListError> {
    let check_limit = |limit: u32| -> Result<u32, ListError> {
        if limit < min_limit {
            return Err(ListError::LimitBelowMin {
                limit,
                min: min_limit,
            });
        }

        if limit > max_limit {
            return Err(ListError::LimitAboveMax {
                limit,
                max: max_limit,
            });
        }

        Ok(limit)
    };

    let result = if let Some(pagination) = pagination_option {
        Pagination {
            offset: pagination.offset.unwrap_or(0),
            limit: match pagination.limit {
                Some(limit) => check_limit(limit)?,
                None => DEFAULT_LIMIT,
            },
        }
    } else {
        Pagination {
            offset: 0,
            limit: DEFAULT_LIMIT,
        }
    };

    Ok(result)
}

pub fn i64_to_u32(num: i64) -> u32 {
    num.try_into().unwrap_or(0)
}

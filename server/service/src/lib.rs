use repository::RepositoryError;
use repository::{Pagination, PaginationOption, DEFAULT_PAGINATION_LIMIT};
use service_provider::ServiceContext;
use std::convert::TryInto;

pub mod apis;
pub mod auth;
pub mod auth_data;
pub mod dashboard;
pub mod invoice;
pub mod invoice_line;
pub mod item;
pub mod item_stats;
pub mod location;
pub mod login;
pub mod master_list;
pub mod name;
pub mod number;
pub mod report;
pub mod requisition;
pub mod requisition_line;
pub mod service_provider;
pub mod settings;
pub mod settings_service;
pub mod static_files;
pub mod stock_line;
pub mod stocktake;
pub mod stocktake_line;
pub mod store;
pub mod sync_processor;
pub mod sync_settings;
pub mod token;
pub mod token_bucket;
pub mod user_account;
pub mod validate;

#[cfg(test)]
mod login_mock_data;

#[derive(PartialEq, Debug)]
pub struct ListResult<T> {
    pub rows: Vec<T>,
    pub count: u32,
}

impl<T> ListResult<T> {
    pub fn empty() -> ListResult<T> {
        ListResult {
            rows: vec![],
            count: 0,
        }
    }
}

#[derive(Clone, PartialEq, Debug)]
pub enum ListError {
    DatabaseError(RepositoryError),
    LimitBelowMin(u32),
    LimitAboveMax(u32),
}
#[derive(PartialEq, Debug)]
pub enum SingleRecordError {
    DatabaseError(RepositoryError),
    NotFound(String),
}

pub enum WithDBError<T> {
    DatabaseError(RepositoryError),
    Error(T),
}

impl<T> WithDBError<T> {
    pub fn db(error: RepositoryError) -> Self {
        WithDBError::DatabaseError(error)
    }

    pub fn err(error: T) -> Self {
        WithDBError::Error(error)
    }
}

impl<T> From<RepositoryError> for WithDBError<T> {
    fn from(error: RepositoryError) -> Self {
        WithDBError::DatabaseError(error)
    }
}

impl From<RepositoryError> for ListError {
    fn from(error: RepositoryError) -> Self {
        ListError::DatabaseError(error)
    }
}

impl From<RepositoryError> for SingleRecordError {
    fn from(error: RepositoryError) -> Self {
        SingleRecordError::DatabaseError(error)
    }
}

// Batch mutation helpers
pub struct DoMutationResult<T> {
    pub has_errors: bool,
    pub results: Vec<T>,
}

pub struct BatchMutationsProcessor<'a> {
    ctx: &'a ServiceContext,
    store_id: &'a str,
    user_id: &'a str,
}

impl<'a> BatchMutationsProcessor<'a> {
    pub fn new(
        ctx: &'a ServiceContext,
        store_id: &'a str,
        user_id: &'a str,
    ) -> BatchMutationsProcessor<'a> {
        BatchMutationsProcessor {
            ctx,
            store_id,
            user_id,
        }
    }

    pub fn do_mutations<I, R, E, M>(
        &self,
        inputs: Option<Vec<I>>,
        mutation: M,
    ) -> (bool, Vec<InputWithResult<I, Result<R, E>>>)
    where
        I: Clone,
        M: Fn(&ServiceContext, &str, I) -> Result<R, E>,
    {
        let mut has_errors = false;
        let mut result = vec![];

        for input in inputs.unwrap_or(vec![]) {
            let mutation_result = mutation(self.ctx, self.store_id, input.clone());
            has_errors = has_errors || mutation_result.is_err();
            result.push(InputWithResult {
                input,
                result: mutation_result,
            });
        }

        (has_errors, result)
    }

    pub fn do_mutations_with_user_id<I, R, E, M>(
        &self,
        inputs: Option<Vec<I>>,
        mutation: M,
    ) -> (bool, Vec<InputWithResult<I, Result<R, E>>>)
    where
        I: Clone,
        M: Fn(&ServiceContext, &str, &str, I) -> Result<R, E>,
    {
        let mut has_errors = false;
        let mut result = vec![];

        for input in inputs.unwrap_or(vec![]) {
            let mutation_result = mutation(self.ctx, self.store_id, self.user_id, input.clone());
            has_errors = has_errors || mutation_result.is_err();
            result.push(InputWithResult {
                input,
                result: mutation_result,
            });
        }

        (has_errors, result)
    }
}

// Pagination helpers

pub fn get_default_pagination(
    pagination_option: Option<PaginationOption>,
    max_limit: u32,
    min_limit: u32,
) -> Result<Pagination, ListError> {
    let check_limit = |limit: u32| -> Result<u32, ListError> {
        if limit < min_limit {
            return Err(ListError::LimitBelowMin(min_limit));
        }
        if limit > max_limit {
            return Err(ListError::LimitAboveMax(max_limit));
        }

        Ok(limit)
    };

    let result = if let Some(pagination) = pagination_option {
        Pagination {
            offset: pagination.offset.unwrap_or(0),
            limit: match pagination.limit {
                Some(limit) => check_limit(limit)?,
                None => DEFAULT_PAGINATION_LIMIT,
            },
        }
    } else {
        Pagination {
            offset: 0,
            limit: DEFAULT_PAGINATION_LIMIT,
        }
    };

    Ok(result)
}

// TODO move the following methods to util

pub fn i32_to_u32(num: i32) -> u32 {
    num.try_into().unwrap_or(0)
}

pub fn i64_to_u32(num: i64) -> u32 {
    num.try_into().unwrap_or(0)
}

pub fn usize_to_u32(num: usize) -> u32 {
    num.try_into().unwrap_or(0)
}

pub fn u32_to_i32(num: u32) -> i32 {
    num.try_into().unwrap_or(0)
}

#[derive(Debug, PartialEq)]
pub struct InputWithResult<I, R> {
    pub input: I,
    pub result: R,
}

use repository::{
    KeyType, KeyValueStoreRepository, NameRowRepository, PaginationOption, RepositoryError,
    SiteRowRepository, StorageConnection, Store, StoreRow, StoreRowRepository,
};
use repository::{StoreFilter, StoreRepository, StoreSort};

use crate::{
    ListError, ListResult, get_pagination_or_default, i64_to_u32,
    record_key::{KeyCase, other_with_key},
    service_provider::ServiceContext,
};

pub fn get_stores(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<StoreFilter>,
    sort: Option<StoreSort>,
) -> Result<ListResult<Store>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = StoreRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_store(
    ctx: &ServiceContext,
    filter: StoreFilter,
) -> Result<Option<Store>, RepositoryError> {
    let mut result = StoreRepository::new(&ctx.connection).query_by_filter(filter)?;

    Ok(result.pop())
}

#[derive(Debug, PartialEq)]
pub enum UpsertStoreError {
    CodeRequired,
    DuplicateCode {
        other_id: String,
    },
    NameNotFound,
    NameDeleted,
    /// A name is at most one store's.
    NameHasStore {
        other_id: String,
    },
    SiteNotFound,
    /// See `is_own_site_store`.
    MovesOwnSiteStore,
    DisablesOwnSiteStore,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertStoreError {
    fn from(error: RepositoryError) -> Self {
        UpsertStoreError::DatabaseError(error)
    }
}

/// Joins the caller's transaction, so an import's earlier rows count. Leaves the logo as saved.
pub fn upsert_store(
    connection: &StorageConnection,
    row: &StoreRow,
) -> Result<(), UpsertStoreError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertStoreError> {
            let repo = StoreRowRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Only what the save changes is checked, so a saved store that no longer passes stays editable.
fn validate(
    connection: &StorageConnection,
    saved: Option<&StoreRow>,
    row: &StoreRow,
) -> Result<(), UpsertStoreError> {
    if row.code.trim().is_empty() {
        return Err(UpsertStoreError::CodeRequired);
    }
    let repo = StoreRowRepository::new(connection);
    if let Some(other_id) = other_with_key(
        saved.map(|saved| saved.code.as_str()),
        &row.id,
        &row.code,
        KeyCase::Exact,
        |code| repo.find_by_trimmed_code(code),
        |store| &store.id,
    )? {
        return Err(UpsertStoreError::DuplicateCode { other_id });
    }
    if saved.is_none_or(|saved| saved.name_id != row.name_id) {
        let name = NameRowRepository::new(connection)
            .find_one_by_id(&row.name_id)?
            .ok_or(UpsertStoreError::NameNotFound)?;
        if name.deleted_datetime.is_some() {
            return Err(UpsertStoreError::NameDeleted);
        }
        if let Some(other) = repo
            .find_one_by_name_id(&row.name_id)?
            .filter(|other| other.id != row.id)
        {
            return Err(UpsertStoreError::NameHasStore { other_id: other.id });
        }
    }
    if let Some(saved) = saved
        && is_own_site_store(connection, saved)?
    {
        if row.site_id != saved.site_id {
            return Err(UpsertStoreError::MovesOwnSiteStore);
        }
        if row.is_disabled && !saved.is_disabled {
            return Err(UpsertStoreError::DisablesOwnSiteStore);
        }
    }
    if saved.is_none_or(|saved| saved.site_id != row.site_id)
        && SiteRowRepository::new(connection)
            .find_one_by_id(row.site_id)?
            .is_none()
    {
        return Err(UpsertStoreError::SiteNotFound);
    }
    Ok(())
}

/// Whether `store` is on this server's own site. Login offers only those stores, so moving one
/// away or disabling it can leave its users, the admin a standalone central server made at setup
/// among them, with no store to log in to.
fn is_own_site_store(
    connection: &StorageConnection,
    store: &StoreRow,
) -> Result<bool, RepositoryError> {
    Ok(
        KeyValueStoreRepository::new(connection).get_i32(KeyType::SettingsSyncSiteId)?
            == Some(store.site_id),
    )
}

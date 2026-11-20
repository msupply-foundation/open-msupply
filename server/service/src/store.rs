use repository::{
    NameRowRepository, NameRowType, NameStoreJoinRepository, NameStoreJoinRow, PaginationOption,
    RepositoryError, SiteRowRepository, StorageConnection, Store, StoreRow, StoreRowRepository,
};
use repository::{StoreFilter, StoreRepository, StoreSort};
use util::uuid::uuid;

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
        other_code: String,
    },
    NameNotFound,
    /// A store's name must be a `STORE` name, so never a patient's or a system name.
    NameNotStore,
    NameDeleted,
    /// A name is at most one store's.
    NameHasStore {
        other_id: String,
        other_code: String,
    },
    SiteNotFound,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertStoreError {
    fn from(error: RepositoryError) -> Self {
        UpsertStoreError::DatabaseError(error)
    }
}

/// Joins the caller's transaction, so an import's earlier rows count. Leaves the logo as saved. A
/// new store sees its own name, as the store a standalone central server makes at setup does.
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
            if saved.is_none() {
                NameStoreJoinRepository::new(connection).upsert_one(&NameStoreJoinRow {
                    id: uuid(),
                    store_id: row.id.clone(),
                    name_id: row.name_id.clone(),
                    name_is_customer: false,
                    name_is_supplier: false,
                    visible: true,
                })?;
            }
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
    // Kept, so the other store's code needs no second query.
    let mut same_code = Vec::new();
    let other_id = other_with_key(
        saved.map(|saved| saved.code.as_str()),
        &row.id,
        &row.code,
        KeyCase::Exact,
        |code| {
            same_code = repo.find_by_trimmed_code(code)?;
            Ok(same_code.clone())
        },
        |store| &store.id,
    )?;
    if let Some(other) = other_id.and_then(|id| same_code.into_iter().find(|store| store.id == id))
    {
        return Err(UpsertStoreError::DuplicateCode {
            other_id: other.id,
            other_code: other.code,
        });
    }
    if saved.is_none_or(|saved| saved.name_id != row.name_id) {
        let name = NameRowRepository::new(connection)
            .find_one_by_id(&row.name_id)?
            .ok_or(UpsertStoreError::NameNotFound)?;
        if name.r#type != NameRowType::Store {
            return Err(UpsertStoreError::NameNotStore);
        }
        if name.deleted_datetime.is_some() {
            return Err(UpsertStoreError::NameDeleted);
        }
        if let Some(other) = repo
            .find_one_by_name_id(&row.name_id)?
            .filter(|other| other.id != row.id)
        {
            return Err(UpsertStoreError::NameHasStore {
                other_id: other.id,
                other_code: other.code,
            });
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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        EqualFilter, NameRow, NameStoreJoinFilter, SiteRow, mock::MockDataInserts,
        test_db::setup_all,
    };

    fn store(id: &str, code: &str, name_id: &str) -> StoreRow {
        StoreRow {
            id: id.to_string(),
            code: code.to_string(),
            site_id: 1,
            name_id: name_id.to_string(),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn a_new_store_sees_its_own_name_once() {
        let (_, connection, _, _) =
            setup_all("upsert_store_own_name", MockDataInserts::none()).await;
        SiteRowRepository::new(&connection)
            .upsert(&SiteRow {
                id: 1,
                ..Default::default()
            })
            .unwrap();
        NameRowRepository::new(&connection)
            .upsert_one(&NameRow {
                id: "main_name".to_string(),
                code: "MAIN".to_string(),
                name: "Main".to_string(),
                r#type: NameRowType::Store,
                ..Default::default()
            })
            .unwrap();
        let joins = || {
            NameStoreJoinRepository::new(&connection)
                .query_by_filter(NameStoreJoinFilter {
                    store_id: Some(EqualFilter::equal_to("main".to_string())),
                    ..Default::default()
                })
                .unwrap()
                .into_iter()
                .map(|join| {
                    let join = join.name_store_join;
                    (
                        join.name_id,
                        join.visible,
                        join.name_is_customer,
                        join.name_is_supplier,
                    )
                })
                .collect::<Vec<_>>()
        };

        upsert_store(&connection, &store("main", "MS", "main_name")).unwrap();
        let own = vec![("main_name".to_string(), true, false, false)];
        assert_eq!(joins(), own);

        // An update adds none.
        upsert_store(
            &connection,
            &StoreRow {
                is_disabled: true,
                ..store("main", "MS", "main_name")
            },
        )
        .unwrap();
        assert_eq!(joins(), own);
    }

    #[actix_rt::test]
    async fn a_clash_names_the_other_store_by_id_and_code() {
        let (_, connection, _, _) = setup_all("upsert_store_clash", MockDataInserts::none()).await;
        SiteRowRepository::new(&connection)
            .upsert(&SiteRow {
                id: 1,
                ..Default::default()
            })
            .unwrap();
        for (id, code) in [("main_name", "MAIN"), ("ward_name", "WARD")] {
            NameRowRepository::new(&connection)
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    code: code.to_string(),
                    name: code.to_string(),
                    r#type: NameRowType::Store,
                    ..Default::default()
                })
                .unwrap();
        }
        upsert_store(&connection, &store("main", "MS", "main_name")).unwrap();

        assert_eq!(
            upsert_store(&connection, &store("ward", " MS ", "ward_name")),
            Err(UpsertStoreError::DuplicateCode {
                other_id: "main".to_string(),
                other_code: "MS".to_string(),
            })
        );
        assert_eq!(
            upsert_store(&connection, &store("ward", "W1", "main_name")),
            Err(UpsertStoreError::NameHasStore {
                other_id: "main".to_string(),
                other_code: "MS".to_string(),
            })
        );
    }
}

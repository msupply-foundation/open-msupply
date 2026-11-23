use crate::user_account::upsert::protected_user_ids;
use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, PermissionType, RepositoryError,
    StorageConnection, StoreRowRepository, UserAccountRowRepository, UserFilter,
    UserPermissionFilter, UserPermissionRepository, UserPermissionRow, UserPermissionRowRepository,
    UserRepository, UserStoreJoinFilter, UserStoreJoinRepository, UserStoreJoinRow,
    UserStoreJoinRowRepository,
};

#[derive(Debug, PartialEq)]
pub enum UpsertUserStoreJoinError {
    UserNotFound,
    UserDeleted,
    /// See `protected_user_ids`.
    Protected,
    StoreNotFound,
    /// Another join already gives the user the store.
    DuplicateJoin {
        other_id: String,
    },
    /// A saved join's user or store. Delete it and add another.
    RecordChanged,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertUserStoreJoinError {
    fn from(error: RepositoryError) -> Self {
        UpsertUserStoreJoinError::DatabaseError(error)
    }
}

#[derive(Debug, PartialEq)]
pub enum DeleteUserStoreJoinError {
    /// See `protected_user_ids`.
    Protected,
    /// The deleting user's last store on this site.
    LocksOutSelf,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteUserStoreJoinError {
    fn from(error: RepositoryError) -> Self {
        DeleteUserStoreJoinError::DatabaseError(error)
    }
}

/// Gives a user a store, or changes whether it's their default. A new join also gives store access
/// there, so the user can log in to it. Never refuses a second default store: the caller checks
/// each user has at most one, with `default_stores`, once all its saves are made, so a batch such
/// as an import can move a default in either order. Joins the caller's transaction, so an
/// import's earlier rows count.
pub fn upsert_user_store_join_leaving_default(
    connection: &StorageConnection,
    row: &UserStoreJoinRow,
) -> Result<(), UpsertUserStoreJoinError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertUserStoreJoinError> {
            let repo = UserStoreJoinRowRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            if saved.is_none() {
                give_store_access(connection, &row.user_id, &row.store_id)?;
            }
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Takes the store away. The last join to it takes every store access the user has there too, so
/// they can no longer log in to it; a duplicate join, as legacy mSupply can send, keeps both.
/// Their other permissions there are kept. A default store leaves the user none, as in legacy
/// mSupply. `deleting_user_id` can't lock themselves out.
pub fn delete_user_store_join(
    connection: &StorageConnection,
    deleting_user_id: &str,
    id: &str,
) -> Result<(), DeleteUserStoreJoinError> {
    connection
        .transaction_sync(|connection| -> Result<(), DeleteUserStoreJoinError> {
            let repo = UserStoreJoinRowRepository::new(connection);
            let Some(saved) = repo.find_one_by_id(id)? else {
                return Ok(());
            };
            if protected_user_ids(connection)?.contains(&saved.user_id) {
                return Err(DeleteUserStoreJoinError::Protected);
            }
            let removes_store = find_user_store_join(connection, &saved.user_id, &saved.store_id)?
                .iter()
                .all(|join| join.id == saved.id);
            if removes_store
                && saved.user_id == deleting_user_id
                && is_last_store_on_site(connection, &saved.user_id, &saved.store_id)?
            {
                return Err(DeleteUserStoreJoinError::LocksOutSelf);
            }
            repo.delete(&saved.id)?;
            if removes_store {
                let permissions = UserPermissionRowRepository::new(connection);
                for access in store_access(connection, &saved.user_id, &saved.store_id)? {
                    permissions.delete(&access.id)?;
                }
            }
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// The user's joins to `store_id`, in id order.
pub fn find_user_store_join(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<Vec<UserStoreJoinRow>, RepositoryError> {
    UserStoreJoinRepository::new(connection).query_by_filter(UserStoreJoinFilter {
        user_id: Some(EqualFilter::equal_to(user_id.to_string())),
        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
        ..Default::default()
    })
}

/// The joins marked default of every one of `user_ids`, in one query, in id order.
pub fn default_stores(
    connection: &StorageConnection,
    user_ids: Vec<String>,
) -> Result<Vec<UserStoreJoinRow>, RepositoryError> {
    UserStoreJoinRepository::new(connection).query_by_filter(UserStoreJoinFilter {
        user_id: Some(EqualFilter::equal_any(user_ids)),
        is_default: Some(true),
        ..Default::default()
    })
}

/// Whether `store_id` is the user's only store on this site, as login offers only those. False on
/// a server with no site yet.
pub(crate) fn is_last_store_on_site(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    let Some(site_id) =
        KeyValueStoreRepository::new(connection).get_i32(KeyType::SettingsSyncSiteId)?
    else {
        return Ok(false);
    };
    let user = UserRepository::new(connection).query_one(
        UserFilter::new()
            .id(EqualFilter::equal_to(user_id.to_string()))
            .site_id(EqualFilter::equal_to(site_id)),
    )?;
    Ok(!user.is_some_and(|user| {
        user.stores
            .iter()
            .any(|store| store.store_row.id != store_id)
    }))
}

/// A saved join can change only its default flag: a new user or store would leave the store
/// access behind and skip the lock-out check `delete_user_store_join` makes. So it stays editable
/// even if it no longer passes as new, such as one whose user was deleted.
fn validate(
    connection: &StorageConnection,
    saved: Option<&UserStoreJoinRow>,
    row: &UserStoreJoinRow,
) -> Result<(), UpsertUserStoreJoinError> {
    let protected = protected_user_ids(connection)?;
    if protected.contains(&row.user_id)
        || saved.is_some_and(|saved| protected.contains(&saved.user_id))
    {
        return Err(UpsertUserStoreJoinError::Protected);
    }
    if let Some(saved) = saved {
        if saved.user_id != row.user_id || saved.store_id != row.store_id {
            return Err(UpsertUserStoreJoinError::RecordChanged);
        }
        return Ok(());
    }

    let user = UserAccountRowRepository::new(connection)
        .find_one_by_id(&row.user_id)?
        .ok_or(UpsertUserStoreJoinError::UserNotFound)?;
    if user.deleted_datetime.is_some() {
        return Err(UpsertUserStoreJoinError::UserDeleted);
    }
    if StoreRowRepository::new(connection)
        .find_one_by_id(&row.store_id)?
        .is_none()
    {
        return Err(UpsertUserStoreJoinError::StoreNotFound);
    }
    if let Some(other) = find_user_store_join(connection, &row.user_id, &row.store_id)?
        .into_iter()
        .find(|other| other.id != row.id)
    {
        return Err(UpsertUserStoreJoinError::DuplicateJoin { other_id: other.id });
    }
    Ok(())
}

/// Whether the user can get into the store once login offers it.
pub fn has_store_access(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(!store_access(connection, user_id, store_id)?.is_empty())
}

/// Every store access the user has on the store, in any context.
fn store_access(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<Vec<UserPermissionRow>, RepositoryError> {
    UserPermissionRepository::new(connection).query_by_filter(
        UserPermissionFilter::new()
            .user_id(EqualFilter::equal_to(user_id.to_string()))
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .permission(EqualFilter::equal_to(PermissionType::StoreAccess)),
    )
}

/// Unless the user has it, with the id sync and login give it.
fn give_store_access(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<(), RepositoryError> {
    if has_store_access(connection, user_id, store_id)? {
        return Ok(());
    }
    UserPermissionRowRepository::new(connection).upsert_one(&UserPermissionRow {
        id: UserPermissionRow::deterministic_id(
            user_id,
            Some(store_id),
            &PermissionType::StoreAccess,
        ),
        user_id: user_id.to_string(),
        store_id: Some(store_id.to_string()),
        permission: PermissionType::StoreAccess,
        context_id: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use repository::{StoreRow, UserAccountRow, mock::MockDataInserts, test_db::setup_all};

    fn join(id: &str, user_id: &str, store_id: &str, is_default: bool) -> UserStoreJoinRow {
        UserStoreJoinRow {
            id: id.to_string(),
            user_id: user_id.to_string(),
            store_id: store_id.to_string(),
            is_default,
        }
    }

    /// (store id, default), in store order.
    fn joins(connection: &StorageConnection, user_id: &str) -> Vec<(String, bool)> {
        let mut joins: Vec<_> = UserStoreJoinRowRepository::new(connection)
            .find_many_by_user_id(user_id)
            .unwrap()
            .into_iter()
            .map(|join| (join.store_id, join.is_default))
            .collect();
        joins.sort();
        joins
    }

    /// Store access ids, in id order.
    fn access(connection: &StorageConnection, user_id: &str, store_id: &str) -> Vec<String> {
        let mut ids: Vec<_> = store_access(connection, user_id, store_id)
            .unwrap()
            .into_iter()
            .map(|access| access.id)
            .collect();
        ids.sort();
        ids
    }

    /// Stores `first` and `second` on site 1, Anna, deleted Carl and the protected admin.
    async fn setup(name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all(name, MockDataInserts::none().names()).await;
        for id in ["first", "second"] {
            StoreRowRepository::new(&connection)
                .upsert_one(&StoreRow {
                    id: id.to_string(),
                    name_id: "name_store_a".to_string(),
                    site_id: 1,
                    ..Default::default()
                })
                .unwrap();
        }
        let users = UserAccountRowRepository::new(&connection);
        for (id, deleted) in [("anna", false), ("carl", true), ("admin", false)] {
            users
                .upsert_one(&UserAccountRow {
                    id: id.to_string(),
                    username: id.to_string(),
                    deleted_datetime: deleted.then(|| {
                        NaiveDate::from_ymd_opt(2025, 1, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap()
                    }),
                    ..Default::default()
                })
                .unwrap();
        }
        let kv = KeyValueStoreRepository::new(&connection);
        kv.set_string(
            KeyType::StandaloneCentralAdminUserId,
            Some("admin".to_string()),
        )
        .unwrap();
        kv.set_i32(KeyType::SettingsSyncSiteId, Some(1)).unwrap();
        connection
    }

    #[actix_rt::test]
    async fn a_new_store_gives_store_access_so_the_user_can_log_in() {
        let connection = setup("user_store_join_gives_store_access").await;
        upsert_user_store_join_leaving_default(&connection, &join("a", "anna", "first", true))
            .unwrap();
        assert_eq!(joins(&connection, "anna"), [("first".to_string(), true)]);
        // The id sync and login give it.
        assert_eq!(
            access(&connection, "anna", "first"),
            [UserPermissionRow::deterministic_id(
                "anna",
                Some("first"),
                &PermissionType::StoreAccess
            )]
        );
        // Not given twice, nor again on an update.
        upsert_user_store_join_leaving_default(&connection, &join("a", "anna", "first", false))
            .unwrap();
        assert_eq!(access(&connection, "anna", "first").len(), 1);

        let refused =
            |row: UserStoreJoinRow| upsert_user_store_join_leaving_default(&connection, &row);
        assert_eq!(
            refused(join("b", "anna", "first", false)),
            Err(UpsertUserStoreJoinError::DuplicateJoin {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            refused(join("b", "nobody", "first", false)),
            Err(UpsertUserStoreJoinError::UserNotFound)
        );
        assert_eq!(
            refused(join("b", "carl", "first", false)),
            Err(UpsertUserStoreJoinError::UserDeleted)
        );
        // A saved one stays editable.
        UserStoreJoinRowRepository::new(&connection)
            .upsert_one(&join("carls", "carl", "first", false))
            .unwrap();
        upsert_user_store_join_leaving_default(&connection, &join("carls", "carl", "first", true))
            .unwrap();
        assert_eq!(
            refused(join("b", "admin", "first", false)),
            Err(UpsertUserStoreJoinError::Protected)
        );
        assert_eq!(
            refused(join("b", "anna", "nowhere", false)),
            Err(UpsertUserStoreJoinError::StoreNotFound)
        );
    }

    #[actix_rt::test]
    async fn a_saved_store_can_change_only_its_default_flag() {
        let connection = setup("user_store_join_record_changed").await;
        upsert_user_store_join_leaving_default(&connection, &join("a", "anna", "first", true))
            .unwrap();
        for changed in [
            join("a", "anna", "second", true),
            join("a", "carl", "first", true),
        ] {
            assert_eq!(
                upsert_user_store_join_leaving_default(&connection, &changed),
                Err(UpsertUserStoreJoinError::RecordChanged),
                "{changed:?}"
            );
        }
        // Her store access stays on the store she has.
        assert_eq!(joins(&connection, "anna"), [("first".to_string(), true)]);
        assert_eq!(access(&connection, "anna", "first").len(), 1);
        assert_eq!(access(&connection, "anna", "second").len(), 0);

        // A second default is the caller's to check.
        upsert_user_store_join_leaving_default(&connection, &join("b", "anna", "second", true))
            .unwrap();
        assert_eq!(
            default_stores(&connection, vec!["anna".to_string()])
                .unwrap()
                .into_iter()
                .map(|join| join.id)
                .collect::<Vec<_>>(),
            ["a", "b"]
        );
    }

    #[actix_rt::test]
    async fn taking_a_store_away_takes_its_store_access_and_leaves_no_default() {
        let connection = setup("user_store_join_delete").await;
        upsert_user_store_join_leaving_default(&connection, &join("a", "anna", "first", true))
            .unwrap();
        upsert_user_store_join_leaving_default(&connection, &join("b", "anna", "second", false))
            .unwrap();
        let permissions = UserPermissionRowRepository::new(&connection);
        // A duplicate, as legacy mSupply sends, and another permission there.
        for (id, permission) in [
            ("duplicate", PermissionType::StoreAccess),
            ("report", PermissionType::Report),
        ] {
            permissions
                .upsert_one(&UserPermissionRow {
                    id: id.to_string(),
                    user_id: "anna".to_string(),
                    store_id: Some("first".to_string()),
                    permission,
                    context_id: None,
                })
                .unwrap();
        }

        delete_user_store_join(&connection, "admin", "a").unwrap();
        assert_eq!(joins(&connection, "anna"), [("second".to_string(), false)]);
        assert_eq!(access(&connection, "anna", "first"), Vec::<String>::new());
        assert!(permissions.find_one_by_id("report").unwrap().is_some());
        // Already gone.
        delete_user_store_join(&connection, "admin", "a").unwrap();
    }

    #[actix_rt::test]
    async fn a_duplicate_join_keeps_the_store_and_its_store_access() {
        let connection = setup("user_store_join_duplicate").await;
        upsert_user_store_join_leaving_default(&connection, &join("a", "anna", "first", true))
            .unwrap();
        // A duplicate, as legacy mSupply can send; the save service refuses one.
        UserStoreJoinRowRepository::new(&connection)
            .upsert_one(&join("duplicate", "anna", "first", false))
            .unwrap();

        // Her only store on this site, but the duplicate keeps it.
        delete_user_store_join(&connection, "anna", "a").unwrap();
        assert_eq!(joins(&connection, "anna"), [("first".to_string(), false)]);
        assert_eq!(access(&connection, "anna", "first").len(), 1);
        assert_eq!(
            delete_user_store_join(&connection, "anna", "duplicate"),
            Err(DeleteUserStoreJoinError::LocksOutSelf)
        );
        delete_user_store_join(&connection, "admin", "duplicate").unwrap();
        assert_eq!(joins(&connection, "anna"), []);
        assert_eq!(access(&connection, "anna", "first").len(), 0);
    }

    #[actix_rt::test]
    async fn a_user_cannot_take_away_their_own_last_store_on_this_site() {
        let connection = setup("user_store_join_last_store").await;
        // `store_a` is on another site.
        StoreRowRepository::new(&connection)
            .upsert_one(&StoreRow {
                id: "elsewhere".to_string(),
                name_id: "name_store_a".to_string(),
                site_id: 2,
                ..Default::default()
            })
            .unwrap();
        for (id, store_id) in [("a", "first"), ("b", "second"), ("c", "elsewhere")] {
            upsert_user_store_join_leaving_default(&connection, &join(id, "anna", store_id, false))
                .unwrap();
        }
        delete_user_store_join(&connection, "anna", "a").unwrap();
        assert_eq!(
            delete_user_store_join(&connection, "anna", "b"),
            Err(DeleteUserStoreJoinError::LocksOutSelf)
        );
        // Another user can.
        delete_user_store_join(&connection, "admin", "b").unwrap();

        UserStoreJoinRowRepository::new(&connection)
            .upsert_one(&join("admins", "admin", "first", true))
            .unwrap();
        assert_eq!(
            delete_user_store_join(&connection, "anna", "admins"),
            Err(DeleteUserStoreJoinError::Protected)
        );
    }
}

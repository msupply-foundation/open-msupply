use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, and_list, collect},
    delete::{DELETE_COLUMN, already_deleted_by, check_delete, is_delete},
    field_changes,
    lookup::{
        InMemory, KeyPart, NOT_FOUND, active_first, differs, find_by_id_or_composite_key,
        find_reference, key_conflict,
    },
    sheet::Value,
    sorted_by, stores_with_names,
    user_refs::{
        ID, STORE_CODE, STORE_ID, SetupAdmin, USER_ID, USERNAME, check_not_protected,
        exportable_users, locked_users, protected_error, user_column, users_by_id,
    },
};
use crate::{
    i64_to_u32,
    user_account::upsert::{protected_user_ids, server_user_ids},
    user_store_join::{
        DeleteUserStoreJoinError, UpsertUserStoreJoinError, default_stores, delete_user_store_join,
        find_user_store_join, has_store_access, upsert_user_store_join_unchecked_default,
    },
};
use repository::{
    RepositoryError, StorageConnection, StoreRow, StoreRowRepository, UserAccountRow,
    UserAccountRowRepository, UserStoreJoinFilter, UserStoreJoinRepository, UserStoreJoinRow,
    UserStoreJoinRowRepository,
};
use std::collections::{HashMap, HashSet};
use util::uuid::uuid;

const IS_DEFAULT: &str = "is_default";
const STORE_NAME: &str = "store_name";

const COLUMNS: &[&str] = &[
    ID,
    USERNAME,
    USER_ID,
    STORE_CODE,
    STORE_ID,
    IS_DEFAULT,
    DELETE_COLUMN,
];

/// The stores each user can log in to. Matched by `id`, else by its user and store together, a
/// pair that never changes. Protected users' joins are neither exported nor imported; deleted
/// users' are kept and not exported, and a row can't give a deleted user a store.
pub(super) struct UserStoreJoinTable;

impl ImportTable for UserStoreJoinTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::UserStoreJoin
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            USERNAME,
            USER_ID,
            STORE_CODE,
            STORE_ID,
            DELETE_COLUMN,
            STORE_NAME,
        ]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[STORE_NAME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        // Read whole, not paged: the export has already checked the row cap.
        let joins = UserStoreJoinRepository::new(connection).query_by_filter(exportable(filter))?;
        let users = users_by_id(connection)?;
        let stores = stores_with_names(connection)?;
        let rows = joins
            .into_iter()
            .map(|join| {
                let user = users.get(&join.user_id);
                let store = stores.get(&join.store_id);
                let mut cells = cells(&join, user, store.map(|(store, _)| store));
                cells.push(store.map(|(_, name)| name.clone()).into());
                // Usernames in any letter case, so `anna` comes before `Ben`.
                let order = (
                    user.map(|user| user.username.to_lowercase())
                        .unwrap_or_default(),
                    store
                        .map(|(store, _)| store.code.clone())
                        .unwrap_or_default(),
                    join.id,
                );
                (order, cells)
            })
            .collect();
        Ok(sorted_by(rows))
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let repo = UserStoreJoinRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(Some(exportable(filter)))?),
            total: i64_to_u32(repo.count(Some(exportable(&ExportFilter::default())))?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Runs after the user and store sheets, so their new records are found.
        Ok(Box::new(UserStoreJoinSheet {
            users: InMemory::new(UserAccountRowRepository::new(connection).find_all()?),
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
            protected: protected_user_ids(connection)?,
            server_users: server_user_ids(),
            setup_admin: SetupAdmin::read(connection)?,
            importer: start.user_id.to_string(),
            default_checks: Vec::new(),
            written: Vec::new(),
            removed: Vec::new(),
            deleted: HashSet::new(),
        }))
    }
}

/// A user's default store is checked after the sheet's last row, so rows moving it can come in
/// any order, and their store access after the file's last sheet, so the `user_permission`
/// sheet's rows count.
struct UserStoreJoinSheet {
    /// Read once: far fewer than joins, and unchanged while this sheet runs.
    users: InMemory<UserAccountRow>,
    stores: InMemory<StoreRow>,
    /// No `DELETE` row takes their stores away.
    protected: Vec<String>,
    /// No row gives them stores: the users the server records its own work as.
    server_users: Vec<String>,
    setup_admin: Option<SetupAdmin>,
    importer: String,
    /// Each row that adds or changes a join, with the join and whether the row makes it the user's
    /// default, should the sheet leave the user more than one. Its message is set then.
    default_checks: Vec<(RowError, UserStoreJoinRow, bool)>,
    /// Each row that adds or changes a join, with the join, should the file take it away or leave
    /// the user without store access there. Its message is set then.
    written: Vec<(RowError, UserStoreJoinRow)>,
    /// Each `DELETE` row, with the join it removed, should a later sheet give the user store
    /// access there again. Its message is set then. A later row of this sheet giving the store
    /// back drops it.
    removed: Vec<(RowError, UserStoreJoinRow)>,
    /// Each join a `DELETE` row removed, so a store this sheet took away isn't blamed on
    /// another sheet.
    deleted: HashSet<String>,
}

impl SheetImport for UserStoreJoinSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let is_default = collect(&mut errors, row.bool(IS_DEFAULT));
        // For a `DELETE` row too, so a missing reference stops the import.
        let user_id = find_reference(&self.users, row, USERNAME, USER_ID, |users| {
            active_first(users, |user| user.deleted_datetime.is_none())
        })?;
        let store_id = find_reference(&self.stores, row, STORE_CODE, STORE_ID, |stores| stores)?;
        let user_id = collect(&mut errors, user_id).flatten();
        let store_id = collect(&mut errors, store_id).flatten();
        // Then a missing reference is that error, not "required".
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let id = row.text(ID);
        let existing = self.find_join(
            connection,
            row,
            id.as_deref(),
            user_id.as_deref(),
            store_id.as_deref(),
        )??;
        if let Some(user_id) = existing
            .as_ref()
            .map(|saved| saved.user_id.as_str())
            .or(user_id.as_deref())
        {
            let (locked, change) =
                locked_users(&self.protected, &self.server_users, delete, "stores");
            check_not_protected(row, locked, &self.users, user_id, &change)?;
        }
        if delete {
            let Some(saved) = existing else {
                // Named by the row's user and store, as found.
                return already_deleted_by(
                    row,
                    user_id.as_ref().zip(store_id.as_ref()),
                    |(user_id, store_id)| self.record(user_id, store_id),
                );
            };
            return self.delete(connection, row, saved);
        }

        let saved = existing.as_ref();
        let user_id = user_id.or(saved.map(|join| join.user_id.clone()));
        let store_id = store_id.or(saved.map(|join| join.store_id.clone()));
        let is_default = is_default.or(saved.map(|join| join.is_default));
        row.require_for_new(
            &mut errors,
            "user's store",
            &[
                (USERNAME, user_id.is_none()),
                (STORE_CODE, store_id.is_none()),
                (IS_DEFAULT, is_default.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let new = UserStoreJoinRow {
            id: saved
                .map(|join| join.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            user_id: user_id.unwrap_or_default(),
            store_id: store_id.unwrap_or_default(),
            is_default: is_default.unwrap_or_default(),
        };
        let change = Change::between_upserts(saved, &new);
        if change != Change::Unchanged {
            if let (Some(admin), Some(store)) = (&self.setup_admin, self.stores.get(&new.store_id))
            {
                admin.check_store(row, &self.users, &new.user_id, store, "stores")?;
            }
            upsert_user_store_join_unchecked_default(connection, &self.server_users, &new)
                .map_err(|error| self.upsert_failure(row, &new, error))?;
            let gives_default = new.is_default && !saved.is_some_and(|saved| saved.is_default);
            self.default_checks.push((
                row.error(IS_DEFAULT, String::new()),
                new.clone(),
                gives_default,
            ));
            self.written
                .push((row.error(STORE_CODE, String::new()), new.clone()));
            // Gives back a store an earlier row took away, so that row's check is this row's.
            self.removed.retain(|(_, removed)| {
                removed.user_id != new.user_id || removed.store_id != new.store_id
            });
        }
        let user = self.users.get(&new.user_id);
        let store = self.stores.get(&new.store_id);
        Ok(RowOutcome {
            fields: existing
                .map(|saved| {
                    field_changes(
                        COLUMNS,
                        cells(&saved, user, store),
                        cells(&new, user, store),
                    )
                })
                .unwrap_or_default(),
            record: self.record(&new.user_id, &new.store_id),
            record_id: new.id,
            change,
        })
    }

    /// At most one default store for each user a row adds or changes a store for, even one who
    /// already had more, as legacy mSupply can send. A row that makes a store their default gets
    /// the error; with none, each of their rows does.
    fn finish_sheet(
        &mut self,
        connection: &StorageConnection,
        _sheet: &str,
    ) -> Result<Vec<RowError>, RepositoryError> {
        let checks = std::mem::take(&mut self.default_checks);
        if checks.is_empty() {
            return Ok(Vec::new());
        }
        let mut user_ids: Vec<String> = checks
            .iter()
            .map(|(_, join, _)| join.user_id.clone())
            .collect();
        user_ids.sort();
        user_ids.dedup();
        // Every user's at once.
        let mut defaults: HashMap<String, Vec<UserStoreJoinRow>> = HashMap::new();
        for join in default_stores(connection, user_ids)? {
            defaults.entry(join.user_id.clone()).or_default().push(join);
        }
        let gives_default: HashSet<&str> = checks
            .iter()
            .filter(|(_, _, gives)| *gives)
            .map(|(_, join, _)| join.user_id.as_str())
            .collect();
        let mut errors = Vec::new();
        for (mut error, join, gives) in checks.iter().cloned() {
            let user_defaults = defaults.get(&join.user_id).map_or(&[][..], Vec::as_slice);
            // Blame the rows giving a default, else every row of the user's.
            if user_defaults.len() <= 1 || (!gives && gives_default.contains(join.user_id.as_str()))
            {
                continue;
            }
            let codes = |joins: &mut dyn Iterator<Item = &UserStoreJoinRow>| {
                let mut codes: Vec<String> = joins
                    .map(|other| self.stores.key_or_id(&other.store_id).to_string())
                    .collect();
                codes.sort();
                codes
            };
            let username = self.users.key_or_id(&join.user_id);
            error.message = if gives {
                format!(
                    "{} would be {username}'s default store, and so would {}, but a user has \
                     only one. Set is_default to FALSE for all but one",
                    self.stores.key_or_id(&join.store_id),
                    and_list(&codes(
                        &mut user_defaults.iter().filter(|other| other.id != join.id)
                    ))
                )
            } else {
                format!(
                    "{username}'s default stores are {}, but a user has only one. Set is_default \
                     to FALSE for all but one",
                    and_list(&codes(&mut user_defaults.iter()))
                )
            };
            errors.push(error);
        }
        Ok(errors)
    }

    /// A store a row adds or changes MUST still be there, with store access, once every sheet has
    /// run: without access the user would see it at login and be refused, and a later sheet that
    /// takes the access away takes the store too, losing the row. A store a row takes away MUST
    /// stay away: a later sheet's store access would give it back.
    fn finish_file(
        &mut self,
        connection: &StorageConnection,
    ) -> Result<Vec<RowError>, RepositoryError> {
        let repo = UserStoreJoinRowRepository::new(connection);
        let mut errors = Vec::new();
        for (mut error, join) in std::mem::take(&mut self.removed) {
            if !has_store_access(connection, &join.user_id, &join.store_id)? {
                continue;
            }
            error.message = format!(
                "This row takes {} away from {}, but the user_permission sheet gives them \
                 STORE_ACCESS there, which gives it back. Mark that row DELETE too, or remove \
                 it from the file",
                self.stores.key_or_id(&join.store_id),
                self.users.key_or_id(&join.user_id)
            );
            errors.push(error);
        }
        for (mut error, join) in std::mem::take(&mut self.written) {
            // Deleted by a later row of this sheet, which has its own error.
            if self.deleted.contains(&join.id) {
                continue;
            }
            if repo.find_one_by_id(&join.id)?.is_none() {
                error.message = format!(
                    "This row gives {} store {}, but the user_permission sheet takes their \
                     STORE_ACCESS there away, which takes the store away too. Clear that row's \
                     DELETE, or mark this row DELETE",
                    self.users.key_or_id(&join.user_id),
                    self.stores.key_or_id(&join.store_id)
                );
                errors.push(error);
                continue;
            }
            if has_store_access(connection, &join.user_id, &join.store_id)? {
                continue;
            }
            error.message = format!(
                "{} has no store access on {}, so they couldn't log in to it. Add a \
                 STORE_ACCESS row for it on the user_permission sheet",
                self.users.key_or_id(&join.user_id),
                self.stores.key_or_id(&join.store_id)
            );
            errors.push(error);
        }
        Ok(errors)
    }
}

impl UserStoreJoinSheet {
    /// `anna in store MS`.
    fn record(&self, user_id: &str, store_id: &str) -> String {
        format!(
            "{} in store {}",
            self.users.key_or_id(user_id),
            self.stores.key_or_id(store_id)
        )
    }

    /// The saved join a row changes: by id, else by its user and store together. `Ok(None)` for
    /// a row that adds one.
    fn find_join(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        user_id: Option<&str>,
        store_id: Option<&str>,
    ) -> Result<Result<Option<UserStoreJoinRow>, RowError>, RepositoryError> {
        let by_key = || match (user_id, store_id) {
            (Some(user_id), Some(store_id)) => find_user_store_join(connection, user_id, store_id),
            _ => Ok(Vec::new()),
        };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |join| &join.id,
            |id| UserStoreJoinRowRepository::new(connection).find_one_by_id(id),
            |saved, found, id| {
                let parts = [
                    KeyPart::in_memory(
                        &self.users,
                        differs(user_id, &saved.user_id),
                        USERNAME,
                        USER_ID,
                        &saved.user_id,
                    ),
                    KeyPart::in_memory(
                        &self.stores,
                        differs(store_id, &saved.store_id),
                        STORE_CODE,
                        STORE_ID,
                        &saved.store_id,
                    ),
                ];
                key_conflict(row, found, &saved.id, id, &parts, || {
                    Ok((self.record(&saved.user_id, &saved.store_id), ()))
                })
            },
        )
    }

    fn delete(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
        saved: UserStoreJoinRow,
    ) -> Result<RowOutcome, RowFailure> {
        check_delete(
            row,
            COLUMNS,
            &[USERNAME],
            cells(
                &saved,
                self.users.get(&saved.user_id),
                self.stores.get(&saved.store_id),
            ),
            Vec::new(),
        )?;

        let removes_store =
            delete_user_store_join(connection, &self.protected, &self.importer, &saved.id)
                .map_err(|error| match error {
                    DeleteUserStoreJoinError::LocksOutSelf => row
                        .error(
                            DELETE_COLUMN,
                            "This is your last store on this server. You can't take it away, or \
                         you couldn't log in again",
                        )
                        .into(),
                    DeleteUserStoreJoinError::Protected => protected_error(
                        row,
                        self.users.key_or_id(&saved.user_id),
                        "take away their stores",
                    )
                    .into(),
                    DeleteUserStoreJoinError::DatabaseError(error) => RowFailure::Database(error),
                })?;
        self.deleted.insert(saved.id.clone());
        // A duplicate join keeps the store, and its store access.
        if removes_store {
            self.removed
                .push((row.error(DELETE_COLUMN, String::new()), saved.clone()));
        }
        Ok(RowOutcome {
            record: self.record(&saved.user_id, &saved.store_id),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    fn upsert_failure(
        &self,
        row: &Row,
        join: &UserStoreJoinRow,
        error: UpsertUserStoreJoinError,
    ) -> RowFailure {
        let username = self.users.key_or_id(&join.user_id);
        match error {
            UpsertUserStoreJoinError::UserNotFound => row
                .error(row.reference_column(USERNAME, USER_ID), NOT_FOUND)
                .into(),
            UpsertUserStoreJoinError::UserDeleted => row
                .error(
                    user_column(row),
                    format!("{username} is deleted, so they can't be given a store"),
                )
                .into(),
            UpsertUserStoreJoinError::Protected => {
                protected_error(row, username, "change their stores").into()
            }
            UpsertUserStoreJoinError::StoreNotFound => row
                .error(row.reference_column(STORE_CODE, STORE_ID), NOT_FOUND)
                .into(),
            // Unreachable here: `find_join` finds a saved user and store, so a row never adds a
            // second.
            UpsertUserStoreJoinError::DuplicateJoin { other_id } => row
                .error(
                    STORE_CODE,
                    format!(
                        "{username} already has store {}, through {other_id}",
                        self.stores.key_or_id(&join.store_id)
                    ),
                )
                .into(),
            // Finding the record makes a changed user or store a conflict first.
            UpsertUserStoreJoinError::RecordChanged => row
                .error(
                    ID,
                    "A user's store can't change its user or store: delete it and add another",
                )
                .into(),
            UpsertUserStoreJoinError::DatabaseError(error) => RowFailure::Database(error),
        }
    }
}

/// The joins an export holds, searched by `filter`.
fn exportable(filter: &ExportFilter) -> UserStoreJoinFilter {
    let (user_id, user_on_store) = exportable_users(filter);
    UserStoreJoinFilter {
        user_id: Some(user_id),
        user_on_store,
        ..Default::default()
    }
}

/// One per column. The export adds `store_name`.
fn cells(
    join: &UserStoreJoinRow,
    user: Option<&UserAccountRow>,
    store: Option<&StoreRow>,
) -> Vec<Value> {
    vec![
        join.id.clone().into(),
        user.map(|user| user.username.clone()).into(),
        join.user_id.clone().into(),
        store.map(|store| store.code.clone()).into(),
        join.store_id.clone().into(),
        join.is_default.into(),
        Value::Empty,
    ]
}

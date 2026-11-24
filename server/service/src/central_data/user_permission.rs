use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, collect},
    delete::{DELETE_COLUMN, already_deleted_by, check_delete, is_delete},
    lookup::{
        InMemory, KeyPart, NOT_FOUND, SavedCode, active_first, differs,
        find_by_id_or_composite_key, find_reference, key_conflict, key_or, read_contexts,
    },
    sheet::Value,
    sorted_by, stores_with_names,
    user_refs::{
        ID, STORE_CODE, STORE_ID, USER_ID, USERNAME, check_not_protected, exportable_users,
        protected_error, users_by_id,
    },
};
use crate::{
    i64_to_u32,
    user_account::upsert::protected_user_ids,
    user_permission::{
        DeleteUserPermissionError, UpsertUserPermissionError, delete_user_permission,
        find_user_permission, new_user_permission_id, upsert_user_permission,
    },
};
use repository::{
    ContextRow, EqualFilter, PermissionType, RepositoryError, StorageConnection, StoreRow,
    StoreRowRepository, UserAccountRow, UserAccountRowRepository, UserPermissionFilter,
    UserPermissionRepository, UserPermissionRow, UserPermissionRowRepository,
};
use std::{collections::HashMap, sync::LazyLock};

const PERMISSION: &str = "permission";
const CONTEXT_NAME: &str = "context_name";
const CONTEXT_ID: &str = "context_id";
const STORE_NAME: &str = "store_name";

const COLUMNS: &[&str] = &[
    ID,
    USERNAME,
    USER_ID,
    STORE_CODE,
    STORE_ID,
    PERMISSION,
    CONTEXT_NAME,
    CONTEXT_ID,
    DELETE_COLUMN,
];

/// Known permissions, as the database writes them. Leaked once, for `Row::choice`'s `&str`.
static PERMISSIONS: LazyLock<Vec<(&'static str, PermissionType)>> = LazyLock::new(|| {
    PermissionType::known_iter()
        .map(|permission| (&*permission.as_ref().to_string().leak(), permission))
        .collect()
});

/// Matched by `id`, else by user, store, permission and context, which are the whole record, so a
/// row adds, keeps or deletes one. Protected or deleted users' and unknown permissions are skipped.
pub(super) struct UserPermissionTable;

impl ImportTable for UserPermissionTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::UserPermission
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
            CONTEXT_NAME,
            CONTEXT_ID,
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
        let permissions = UserPermissionRepository::new(connection)
            .query_by_filter(exportable(connection, filter)?)?;
        let records = References::read(connection)?;
        let rows = permissions
            .iter()
            .map(|permission| {
                let user = records.users.get(&permission.user_id);
                let store = records.store(permission);
                let context = records.context(permission);
                let mut cells = cells(permission, user, store.map(|(store, _)| store), context);
                cells.push(store.map(|(_, name)| name.clone()).into());
                // Usernames and names in any letter case, so `anna` comes before `Ben`.
                let order = (
                    user.map(|user| user.username.to_lowercase())
                        .unwrap_or_default(),
                    store
                        .map(|(store, _)| store.code.clone())
                        .unwrap_or_default(),
                    permission.permission.as_ref().to_string(),
                    context
                        .map(|context| context.name.to_lowercase())
                        .unwrap_or_default(),
                    permission.id.clone(),
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
        let repo = UserPermissionRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(Some(exportable(connection, filter)?))?),
            total: i64_to_u32(repo.count(Some(exportable(connection, &ExportFilter::default())?))?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Runs after the user and store sheets, so their new records are found.
        Ok(Box::new(UserPermissionSheet {
            users: InMemory::new(UserAccountRowRepository::new(connection).find_all()?),
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
            contexts: read_contexts(connection)?,
            protected: protected_user_ids(connection)?,
            importer: start.user_id.to_string(),
        }))
    }
}

struct UserPermissionSheet {
    /// Read once: far fewer than permissions, and unchanged while this sheet runs.
    users: InMemory<UserAccountRow>,
    stores: InMemory<StoreRow>,
    contexts: InMemory<ContextRow>,
    protected: Vec<String>,
    importer: String,
}

/// `None`: neither column in the sheet. `Some(None)`: both cells blank.
type Reference = Option<Option<String>>;

impl SheetImport for UserPermissionSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        // For a `DELETE` row too, so a missing reference stops the import.
        let user_id = find_reference(&self.users, row, USERNAME, USER_ID, |users| {
            active_first(users, |user| user.deleted_datetime.is_none())
        })?;
        let store_id = find_reference(&self.stores, row, STORE_CODE, STORE_ID, |stores| stores)?;
        let context_id =
            find_reference(&self.contexts, row, CONTEXT_NAME, CONTEXT_ID, |contexts| {
                contexts
            })?;
        let permission = row.choice(PERMISSION, &PERMISSIONS);
        let user_id = collect(&mut errors, user_id).flatten();
        let store_id = collect(&mut errors, store_id);
        let context_id = collect(&mut errors, context_id);
        let permission = collect(&mut errors, permission);
        // Then a missing reference is that error, not "required".
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let key = Key {
            user_id,
            store_id,
            permission,
            context_id,
        };
        let id = row.text(ID);
        let existing = self.find_permission(connection, row, id.as_deref(), &key, delete)??;
        if let Some(user_id) = existing
            .as_ref()
            .map(|saved| saved.user_id.as_str())
            .or(key.user_id.as_deref())
        {
            check_not_protected(row, &self.protected, &self.users, user_id, "permissions")?;
        }
        if delete {
            let Some(saved) = existing else {
                // Named by the row's user, store, permission and context, as found.
                return already_deleted_by(row, key.record(), |key| self.record(&key));
            };
            return self.delete(connection, row, saved);
        }
        if let Some(saved) = existing {
            return Ok(RowOutcome {
                record: self.record(&saved),
                record_id: saved.id,
                change: Change::Unchanged,
                fields: Vec::new(),
            });
        }

        row.require_for_new(
            &mut errors,
            "user permission",
            &[
                (USERNAME, key.user_id.is_none()),
                (
                    STORE_CODE,
                    key.store_id.as_ref().is_none_or(Option::is_none),
                ),
                (PERMISSION, key.permission.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }
        let mut new = UserPermissionRow {
            id: String::new(),
            user_id: key.user_id.unwrap_or_default(),
            store_id: key.store_id.flatten(),
            permission: key.permission.unwrap_or_default(),
            context_id: key.context_id.flatten(),
        };
        new.id = id.unwrap_or_else(|| new_user_permission_id(&new));
        upsert_user_permission(connection, &self.protected, &new)
            .map_err(|error| upsert_failure(row, &new, self.users.get(&new.user_id), error))?;
        Ok(RowOutcome {
            record: self.record(&new),
            record_id: new.id,
            change: Change::Inserted,
            fields: Vec::new(),
        })
    }
}

/// `None` where the sheet has no such column, or a required cell is blank.
struct Key {
    user_id: Option<String>,
    store_id: Reference,
    permission: Option<PermissionType>,
    context_id: Reference,
}

impl Key {
    /// `None` without enough to look one up. A missing context column means none.
    fn record(&self) -> Option<UserPermissionRow> {
        Some(UserPermissionRow {
            id: String::new(),
            user_id: self.user_id.clone()?,
            store_id: Some(self.store_id.clone().flatten()?),
            permission: self.permission.clone()?,
            context_id: self.context_id.clone().flatten(),
        })
    }
}

impl UserPermissionSheet {
    /// With an id the row's key MUST match, but a `DELETE` row's blank cells aren't compared.
    fn find_permission(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        key: &Key,
        delete: bool,
    ) -> Result<Result<Option<UserPermissionRow>, RowError>, RepositoryError> {
        let by_key = || match key.record() {
            Some(record) => find_user_permission(connection, &record),
            None => Ok(Vec::new()),
        };
        // Blank context is none, except on a `DELETE` row. Blank store keeps the saved one.
        let reference_differs =
            |given: &Reference, saved: &Option<String>, blank_keeps: bool| match given {
                None => false,
                Some(None) if blank_keeps => false,
                Some(given) => given != saved,
            };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |permission| &permission.id,
            |id| UserPermissionRowRepository::new(connection).find_one_by_id(id),
            |saved, found, id| {
                let saved_store = saved.store_id.as_deref().unwrap_or_default();
                let saved_context = saved.context_id.as_deref().unwrap_or_default();
                let parts = [
                    KeyPart::in_memory(
                        &self.users,
                        differs(key.user_id.as_deref(), &saved.user_id),
                        USERNAME,
                        USER_ID,
                        &saved.user_id,
                    ),
                    KeyPart::in_memory(
                        &self.stores,
                        reference_differs(&key.store_id, &saved.store_id, true),
                        STORE_CODE,
                        STORE_ID,
                        saved_store,
                    ),
                    // No id column: a permission is its own code.
                    KeyPart {
                        changed: key
                            .permission
                            .as_ref()
                            .is_some_and(|permission| *permission != saved.permission),
                        code_column: PERMISSION,
                        id_column: PERMISSION,
                        saved_id: saved.permission.as_ref(),
                        saved_code: SavedCode::Known(saved.permission.as_ref()),
                    },
                    KeyPart::in_memory(
                        &self.contexts,
                        reference_differs(&key.context_id, &saved.context_id, delete),
                        CONTEXT_NAME,
                        CONTEXT_ID,
                        saved_context,
                    ),
                ];
                key_conflict(row, found, &saved.id, id, &parts, || {
                    Ok((self.record(saved), ()))
                })
            },
        )
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        saved: UserPermissionRow,
    ) -> Result<RowOutcome, RowFailure> {
        check_delete(
            row,
            COLUMNS,
            &[USERNAME, PERMISSION],
            cells(
                &saved,
                self.users.get(&saved.user_id),
                saved.store_id.as_deref().and_then(|id| self.stores.get(id)),
                saved
                    .context_id
                    .as_deref()
                    .and_then(|id| self.contexts.get(id)),
            ),
            Vec::new(),
        )?;

        delete_user_permission(connection, &self.protected, &self.importer, &saved.id).map_err(
            |error| match error {
                DeleteUserPermissionError::LocksOutSelf => row
                    .error(DELETE_COLUMN, locks_out_message(&saved.permission))
                    .into(),
                DeleteUserPermissionError::Protected => {
                    protected_error(row, self.users.key_or_id(&saved.user_id), "permissions").into()
                }
                DeleteUserPermissionError::DatabaseError(error) => RowFailure::Database(error),
            },
        )?;
        Ok(RowOutcome {
            record: self.record(&saved),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    /// `anna: DOCUMENT_QUERY for Immunisation in store MS`.
    fn record(&self, permission: &UserPermissionRow) -> String {
        record(
            permission,
            self.users.get(&permission.user_id),
            permission
                .store_id
                .as_deref()
                .and_then(|id| self.stores.get(id)),
            permission
                .context_id
                .as_deref()
                .and_then(|id| self.contexts.get(id)),
        )
    }
}

fn record(
    permission: &UserPermissionRow,
    user: Option<&UserAccountRow>,
    store: Option<&StoreRow>,
    context: Option<&ContextRow>,
) -> String {
    let mut record = format!(
        "{}: {}",
        key_or(user, &permission.user_id),
        permission.permission.as_ref()
    );
    if let Some(context_id) = &permission.context_id {
        let name = context
            .map(|context| context.name.as_str())
            .filter(|name| !name.is_empty())
            .unwrap_or(context_id);
        record.push_str(&format!(" for {name}"));
    }
    if let Some(store_id) = &permission.store_id {
        let code = key_or(store, store_id);
        record.push_str(&format!(" in store {code}"));
    }
    record
}

fn locks_out_message(permission: &PermissionType) -> &'static str {
    match permission {
        PermissionType::StoreAccess => {
            "This is your access to your last store on this server. You can't take it away, or \
             you couldn't log in again"
        }
        PermissionType::EditCentralData => {
            "This is your last central-data edit permission. You can't take it away, or you \
             couldn't import again to give it back"
        }
        _ => {
            "This is your last server-admin permission. You can't take it away, or you couldn't \
             give it back"
        }
    }
}

fn upsert_failure(
    row: &Row,
    permission: &UserPermissionRow,
    user: Option<&UserAccountRow>,
    error: UpsertUserPermissionError,
) -> RowFailure {
    let user_column = row.reference_column(USERNAME, USER_ID);
    let username = key_or(user, &permission.user_id);
    match error {
        UpsertUserPermissionError::UserDeleted => row
            .error(
                user_column,
                format!("{username} is deleted, so they can't be given a permission"),
            )
            .into(),
        UpsertUserPermissionError::UserNotFound => row.error(user_column, NOT_FOUND).into(),
        UpsertUserPermissionError::StoreNotFound => row
            .error(row.reference_column(STORE_CODE, STORE_ID), NOT_FOUND)
            .into(),
        UpsertUserPermissionError::ContextNotFound => row
            .error(row.reference_column(CONTEXT_NAME, CONTEXT_ID), NOT_FOUND)
            .into(),
        UpsertUserPermissionError::StoreRequired => row
            .error(
                STORE_CODE,
                "store_code is required for a new user permission",
            )
            .into(),
        UpsertUserPermissionError::Protected => {
            protected_error(row, username, "permissions").into()
        }
        UpsertUserPermissionError::UnknownPermission => row
            .error(PERMISSION, "This server doesn't know this permission")
            .into(),
        UpsertUserPermissionError::DuplicatePermission { other_id } => row
            .error(
                PERMISSION,
                format!("{username} already has this permission, through {other_id}"),
            )
            .into(),
        // Finding the record makes a changed key a conflict first.
        UpsertUserPermissionError::RecordChanged => row
            .error(
                ID,
                "A user permission can't change: delete it and add another",
            )
            .into(),
        UpsertUserPermissionError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// The permissions an export holds, searched by `filter`: those the server checks.
fn exportable(
    connection: &StorageConnection,
    filter: &ExportFilter,
) -> Result<UserPermissionFilter, RepositoryError> {
    let (user_id, user_on_store) = exportable_users(connection, filter)?;
    Ok(UserPermissionFilter {
        user_id: Some(user_id),
        permission: Some(EqualFilter::equal_any(
            PermissionType::known_iter().collect(),
        )),
        user_on_store,
        ..Default::default()
    })
}

/// What exported permissions refer to.
struct References {
    users: HashMap<String, UserAccountRow>,
    /// With the name of the store's name.
    stores: HashMap<String, (StoreRow, String)>,
    contexts: InMemory<ContextRow>,
}

impl References {
    fn read(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(References {
            users: users_by_id(connection)?,
            stores: stores_with_names(connection)?,
            contexts: read_contexts(connection)?,
        })
    }

    fn store(&self, permission: &UserPermissionRow) -> Option<&(StoreRow, String)> {
        permission
            .store_id
            .as_deref()
            .and_then(|id| self.stores.get(id))
    }

    fn context(&self, permission: &UserPermissionRow) -> Option<&ContextRow> {
        permission
            .context_id
            .as_deref()
            .and_then(|id| self.contexts.get(id))
    }
}

/// One per column. The export adds `store_name`.
fn cells(
    permission: &UserPermissionRow,
    user: Option<&UserAccountRow>,
    store: Option<&StoreRow>,
    context: Option<&ContextRow>,
) -> Vec<Value> {
    vec![
        permission.id.clone().into(),
        user.map(|user| user.username.clone()).into(),
        permission.user_id.clone().into(),
        store.map(|store| store.code.clone()).into(),
        permission.store_id.clone().into(),
        Value::Text(permission.permission.as_ref().to_string()),
        context
            .map(|context| context.name.clone())
            .filter(|name| !name.is_empty())
            .into(),
        permission.context_id.clone().into(),
        Value::Empty,
    ]
}

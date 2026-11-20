use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, collect},
    delete::{DELETE_COLUMN, already_deleted, check_delete, is_delete},
    lookup::{
        InMemory, KeyedTable, NOT_FOUND, active_first, find_reference, pick_one, record_conflict,
    },
    sheet::Value,
};
use crate::{
    user_account::upsert::protected_user_ids,
    user_permission::{
        DeleteUserPermissionError, UpsertUserPermissionError, delete_user_permission,
        find_user_permission, new_user_permission_id, upsert_user_permission,
    },
};
use repository::{
    ContextRowRepository, MasterListRowRepository, Pagination, PermissionType, RepositoryError,
    StorageConnection, StoreRepository, StoreRow, StoreRowRepository, UserAccountRow,
    UserAccountRowRepository, UserPermissionFilter, UserPermissionRepository, UserPermissionRow,
    UserPermissionRowRepository, trim_spaces,
};
use std::{collections::HashMap, sync::LazyLock};

const ID: &str = "id";
const USERNAME: &str = "username";
const USER_ID: &str = "user_id";
const STORE_CODE: &str = "store_code";
const STORE_ID: &str = "store_id";
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

/// Every permission the server checks, as the database writes it.
static LABELS: LazyLock<Vec<(String, PermissionType)>> = LazyLock::new(|| {
    PermissionType::known_iter()
        .map(|permission| (permission.as_ref().to_string(), permission))
        .collect()
});

static PERMISSIONS: LazyLock<Vec<(&'static str, PermissionType)>> = LazyLock::new(|| {
    LABELS
        .iter()
        .map(|(label, permission)| (label.as_str(), permission.clone()))
        .collect()
});

/// The permissions each user has on each store, some within a program, the context. Matched by
/// `id`, else by its user, store, permission and context together. They are the whole record and
/// never change: a row adds a record, leaves one as it is or deletes it.
/// A protected or deleted user's permissions, and permissions this server doesn't know, are
/// neither exported nor imported.
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
        let records = Exportable::read(connection)?;
        let mut rows: Vec<_> = records
            .permissions
            .iter()
            .filter(|permission| records.matches(filter, permission))
            .map(|permission| {
                let user = records.users.get(&permission.user_id);
                let store = records.store(permission);
                let context = records.context(permission);
                let mut cells = cells(permission, user, store.map(|(store, _)| store), context);
                cells.push(store.map(|(_, name)| name.clone()).into());
                let order = (
                    user.map(|user| user.username.clone()).unwrap_or_default(),
                    store
                        .map(|(store, _)| store.code.clone())
                        .unwrap_or_default(),
                    permission.permission.as_ref().to_string(),
                    context
                        .map(|context| context.name.clone())
                        .unwrap_or_default(),
                    permission.id.clone(),
                );
                (order, cells)
            })
            .collect();
        rows.sort_by(|(a, _), (b, _)| a.cmp(b));
        Ok(rows.into_iter().map(|(_, cells)| cells).collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let records = Exportable::read(connection)?;
        Ok(RecordCount::in_memory(&records.permissions, |permission| {
            records.matches(filter, permission)
        }))
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // After the user and store sheets, so the users and stores they add are found.
        Ok(Box::new(UserPermissionSheet {
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
            contexts: Contexts::read(connection)?,
            protected: protected_user_ids(connection)?,
            importer: start.user_id.to_string(),
        }))
    }
}

struct UserPermissionSheet {
    /// Read once: they're few, and none change while this sheet runs.
    stores: InMemory<StoreRow>,
    contexts: Contexts,
    protected: Vec<String>,
    /// The user running the import, who can't take away their own last server-admin permission.
    importer: String,
}

/// A reference cell pair: `None` when the sheet has neither column, `Some(None)` when both cells
/// are blank.
type Reference = Option<Option<String>>;

impl SheetImport for UserPermissionSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let users = UserAccountRowRepository::new(connection);
        // Looked up for a `DELETE` row too, so a missing reference stops the import.
        let user_id = find_reference(&users, row, USERNAME, USER_ID, |users| {
            active_first(users, |user| user.deleted_datetime.is_none())
        })?;
        let store_id = find_reference(&self.stores, row, STORE_CODE, STORE_ID, |stores| stores)?;
        let context_id =
            find_reference(&self.contexts, row, CONTEXT_NAME, CONTEXT_ID, |contexts| {
                active_first(contexts, |context| context.is_active)
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
        // Without its record, the row's other checks would treat it as a new permission.
        let existing = self.find_permission(connection, row, id.as_deref(), &key, delete)??;
        if let Some(user_id) = existing
            .as_ref()
            .map(|saved| saved.user_id.as_str())
            .or(key.user_id.as_deref())
            && self.protected.iter().any(|protected| protected == user_id)
        {
            let username = users.find_one_by_id(user_id)?.map(|user| user.username);
            return Err(protected_error(row, username.as_deref().unwrap_or(user_id)).into());
        }
        if delete {
            return self.delete(connection, row, existing);
        }
        if let Some(saved) = existing {
            let user = users.find_one_by_id(&saved.user_id)?;
            return Ok(RowOutcome {
                record: self.record(&saved, user.as_ref()),
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
        let user = users.find_one_by_id(&new.user_id)?;
        upsert_user_permission(connection, &new)
            .map_err(|error| upsert_failure(row, &new, user.as_ref(), error))?;
        Ok(RowOutcome {
            record: self.record(&new, user.as_ref()),
            record_id: new.id,
            change: Change::Inserted,
            fields: Vec::new(),
        })
    }
}

/// What a row gives of a permission's lookup key. `None` where the sheet has no such column, or a
/// required cell is blank.
struct Key {
    user_id: Option<String>,
    store_id: Reference,
    permission: Option<PermissionType>,
    context_id: Reference,
}

impl Key {
    /// The record the key gives, when it gives enough to find one: a missing context column
    /// means none.
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
    /// The saved permission a row finds: by id, else by its user, store, permission and context
    /// together. `Ok(None)` for a row that adds one. With an id, the row's key MUST be its
    /// record's, though a `DELETE` row's blank cells aren't compared.
    fn find_permission(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        key: &Key,
        delete: bool,
    ) -> Result<Result<Option<UserPermissionRow>, RowError>, RepositoryError> {
        let by_key = match key.record() {
            Some(record) => find_user_permission(connection, &record)?,
            None => Vec::new(),
        };
        let Some(id) = id else {
            return Ok(pick_one(by_key).map_err(|e| row.error(ID, e.message(""))));
        };
        let Some(saved) = UserPermissionRowRepository::new(connection).find_one_by_id(id)? else {
            // A new id beside a saved key is a copied row with one column edited.
            return Ok(match by_key.first() {
                Some(saved) => Err(self.conflict(connection, row, saved, id, PERMISSION)?),
                None => Ok(None),
            });
        };
        // A blank context is none, except on a `DELETE` row, which may leave it blank. A blank
        // store keeps the saved one, as every permission has one.
        let differs = |given: &Reference, saved: &Option<String>, blank_keeps: bool| match given {
            None => false,
            Some(None) if blank_keeps => false,
            Some(given) => given != saved,
        };
        let column = if key
            .user_id
            .as_ref()
            .is_some_and(|user| *user != saved.user_id)
        {
            Some(USERNAME)
        } else if differs(&key.store_id, &saved.store_id, true) {
            Some(STORE_CODE)
        } else if key
            .permission
            .as_ref()
            .is_some_and(|permission| *permission != saved.permission)
        {
            Some(PERMISSION)
        } else if differs(&key.context_id, &saved.context_id, delete) {
            Some(CONTEXT_NAME)
        } else {
            None
        };
        Ok(match column {
            Some(column) => Err(self.conflict(connection, row, &saved, id, column)?),
            None => Ok(Some(saved)),
        })
    }

    /// On `key_column`, or the id column beside it when the row fills only that.
    fn conflict(
        &self,
        connection: &StorageConnection,
        row: &Row,
        saved: &UserPermissionRow,
        id: &str,
        key_column: &str,
    ) -> Result<RowError, RepositoryError> {
        let user = UserAccountRowRepository::new(connection).find_one_by_id(&saved.user_id)?;
        let store = saved.store_id.as_deref().and_then(|id| self.stores.get(id));
        let context = saved
            .context_id
            .as_deref()
            .and_then(|id| self.contexts.get(id));
        let (column, saved_key) = match key_column {
            USERNAME => match row.reference_column(USERNAME, USER_ID) {
                USERNAME => (USERNAME, user.as_ref().map(|user| user.username.clone())),
                _ => (USER_ID, Some(saved.user_id.clone())),
            },
            STORE_CODE => match row.reference_column(STORE_CODE, STORE_ID) {
                STORE_CODE => (STORE_CODE, store.map(|store| store.code.clone())),
                _ => (STORE_ID, saved.store_id.clone()),
            },
            CONTEXT_NAME => match row.reference_column(CONTEXT_NAME, CONTEXT_ID) {
                CONTEXT_NAME => (CONTEXT_NAME, context.map(|context| context.name.clone())),
                _ => (CONTEXT_ID, saved.context_id.clone()),
            },
            _ => (PERMISSION, Some(saved.permission.as_ref().to_string())),
        };
        Ok(row.error(
            column,
            record_conflict(
                column,
                &self.record(saved, user.as_ref()),
                &saved_key.unwrap_or_default(),
                &saved.id,
                &row.text(column).unwrap_or_default(),
                id,
            ),
        ))
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<UserPermissionRow>,
    ) -> Result<RowOutcome, RowFailure> {
        let Some(saved) = existing else {
            return already_deleted(row, PERMISSION, Vec::new());
        };
        let user = UserAccountRowRepository::new(connection).find_one_by_id(&saved.user_id)?;
        check_delete(
            row,
            COLUMNS,
            cells(
                &saved,
                user.as_ref(),
                saved.store_id.as_deref().and_then(|id| self.stores.get(id)),
                saved
                    .context_id
                    .as_deref()
                    .and_then(|id| self.contexts.get(id)),
            ),
            Vec::new(),
        )?;

        delete_user_permission(connection, &self.importer, &saved.id).map_err(
            |error| match error {
                DeleteUserPermissionError::LocksOutSelf => row
                    .error(DELETE_COLUMN, locks_out_message(&saved.permission))
                    .into(),
                // Unreachable here: `import_row` refuses a protected user first.
                DeleteUserPermissionError::Protected => protected_error(
                    row,
                    user.as_ref()
                        .map_or(saved.user_id.as_str(), |user| &user.username),
                )
                .into(),
                DeleteUserPermissionError::DatabaseError(error) => RowFailure::Database(error),
            },
        )?;
        Ok(RowOutcome {
            record: self.record(&saved, user.as_ref()),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    /// How the preview and messages name a permission: `anna: STOCKTAKE_QUERY in store MS`, with
    /// its context's name after the permission when it has one.
    fn record(&self, permission: &UserPermissionRow, user: Option<&UserAccountRow>) -> String {
        record(
            permission,
            user,
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
    context: Option<&Context>,
) -> String {
    let mut record = format!(
        "{}: {}",
        user.map_or(permission.user_id.as_str(), |user| &user.username),
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
        let code = store.map_or(store_id.as_str(), |store| &store.code);
        record.push_str(&format!(" in store {code}"));
    }
    record
}

/// For a `DELETE` row that would lock the user running the import out.
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

/// On the column the row found the user by, or its id when it gave neither.
fn protected_error(row: &Row, username: &str) -> RowError {
    let column = if row.text(USERNAME).is_some() || row.text(USER_ID).is_some() {
        row.reference_column(USERNAME, USER_ID)
    } else {
        ID
    };
    row.error(
        column,
        format!(
            "{username} is protected, as the server needs it, so import can't change their \
             permissions"
        ),
    )
}

fn upsert_failure(
    row: &Row,
    permission: &UserPermissionRow,
    user: Option<&UserAccountRow>,
    error: UpsertUserPermissionError,
) -> RowFailure {
    let user_column = row.reference_column(USERNAME, USER_ID);
    let username = user.map_or(permission.user_id.as_str(), |user| &user.username);
    match error {
        UpsertUserPermissionError::UserDeleted => row
            .error(
                user_column,
                format!("{username} is deleted, so they can't be given a permission"),
            )
            .into(),
        // Not checked here: `find_reference` finds them among the saved records.
        UpsertUserPermissionError::UserNotFound => row.error(user_column, NOT_FOUND).into(),
        UpsertUserPermissionError::StoreNotFound => row
            .error(row.reference_column(STORE_CODE, STORE_ID), NOT_FOUND)
            .into(),
        UpsertUserPermissionError::ContextNotFound => row
            .error(row.reference_column(CONTEXT_NAME, CONTEXT_ID), NOT_FOUND)
            .into(),
        // Unreachable here: `import_row` refuses a protected user and a missing store first,
        // `PERMISSIONS` holds only known permissions, and `find_permission` turns a saved key into
        // a match or a conflict.
        UpsertUserPermissionError::StoreRequired => row
            .error(
                STORE_CODE,
                "store_code is required for a new user permission",
            )
            .into(),
        UpsertUserPermissionError::Protected => protected_error(row, username).into(),
        UpsertUserPermissionError::UnknownPermission => row
            .error(PERMISSION, "This server doesn't know this permission")
            .into(),
        UpsertUserPermissionError::DuplicatePermission { other_id } => row
            .error(
                PERMISSION,
                format!("{username} already has this permission, through {other_id}"),
            )
            .into(),
        UpsertUserPermissionError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// A permission's context: a program, named by its master list, or one with no master list, such
/// as the patient context, found only by id.
#[derive(Clone)]
struct Context {
    id: String,
    /// The master list's name; blank without one.
    name: String,
    is_active: bool,
}

/// Every context, read once: there's one per program.
struct Contexts {
    by_id: HashMap<String, Context>,
}

impl Contexts {
    fn read(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        let contexts = ContextRowRepository::new(connection).all()?;
        let ids: Vec<String> = contexts.iter().map(|context| context.id.clone()).collect();
        let master_lists: HashMap<String, _> = MasterListRowRepository::new(connection)
            .find_many_by_id(&ids)?
            .into_iter()
            .map(|master_list| (master_list.id.clone(), master_list))
            .collect();
        let by_id = contexts
            .into_iter()
            .map(|context| {
                let master_list = master_lists.get(&context.id);
                let context = Context {
                    name: master_list
                        .map(|master_list| master_list.name.clone())
                        .unwrap_or_default(),
                    is_active: master_list.is_none_or(|master_list| master_list.is_active),
                    id: context.id,
                };
                (context.id.clone(), context)
            })
            .collect();
        Ok(Contexts { by_id })
    }

    fn get(&self, id: &str) -> Option<&Context> {
        self.by_id.get(id)
    }
}

/// Looked up by its master list's name, as a master list reference is.
impl KeyedTable for Contexts {
    type Record = Context;
    fn id(context: &Context) -> &str {
        &context.id
    }
    fn key(context: &Context) -> &str {
        &context.name
    }
    fn find_by_id(&self, id: &str) -> Result<Option<Context>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<Context>, RepositoryError> {
        let name = trim_spaces(name);
        let mut found: Vec<Context> = self
            .by_id
            .values()
            .filter(|context| !context.name.is_empty() && trim_spaces(&context.name) == name)
            .cloned()
            .collect();
        found.sort_by(|a, b| a.id.cmp(&b.id));
        Ok(found)
    }
}

/// Everything an export or count reads.
struct Exportable {
    /// Neither a protected or deleted user's, nor one this server doesn't know.
    permissions: Vec<UserPermissionRow>,
    users: HashMap<String, UserAccountRow>,
    /// With the name of the store's name.
    stores: HashMap<String, (StoreRow, String)>,
    contexts: Contexts,
}

impl Exportable {
    /// shortcut: every permission is read into memory, to filter and count; at tens of thousands
    /// that's still quick. Filter in SQL if a central's grows past that.
    fn read(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        let protected = protected_user_ids(connection)?;
        let users: HashMap<String, UserAccountRow> = UserAccountRowRepository::new(connection)
            .find_all()?
            .into_iter()
            .filter(|user| user.deleted_datetime.is_none() && !protected.contains(&user.id))
            .map(|user| (user.id.clone(), user))
            .collect();
        let mut permissions = UserPermissionRepository::new(connection)
            .query_by_filter(UserPermissionFilter::new())?;
        permissions.retain(|permission| {
            users.contains_key(&permission.user_id)
                && !matches!(permission.permission, PermissionType::Unknown(_))
        });
        let stores = StoreRepository::new(connection)
            .query(Pagination::all(), None, None)?
            .into_iter()
            .map(|store| {
                (
                    store.store_row.id.clone(),
                    (store.store_row, store.name_row.name),
                )
            })
            .collect();
        Ok(Exportable {
            permissions,
            users,
            stores,
            contexts: Contexts::read(connection)?,
        })
    }

    fn store(&self, permission: &UserPermissionRow) -> Option<&(StoreRow, String)> {
        permission
            .store_id
            .as_deref()
            .and_then(|id| self.stores.get(id))
    }

    fn context(&self, permission: &UserPermissionRow) -> Option<&Context> {
        permission
            .context_id
            .as_deref()
            .and_then(|id| self.contexts.get(id))
    }

    /// Searches the username and the store's code.
    fn matches(&self, filter: &ExportFilter, permission: &UserPermissionRow) -> bool {
        let username = self
            .users
            .get(&permission.user_id)
            .map_or("", |user| user.username.as_str());
        let store_code = self
            .store(permission)
            .map_or("", |(store, _)| store.code.as_str());
        filter.matches(&[username, store_code], None)
    }
}

/// One per column, as the export writes them. The export adds `store_name`.
fn cells(
    permission: &UserPermissionRow,
    user: Option<&UserAccountRow>,
    store: Option<&StoreRow>,
    context: Option<&Context>,
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

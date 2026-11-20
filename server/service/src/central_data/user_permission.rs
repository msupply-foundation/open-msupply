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
    i64_to_u32,
    user_account::upsert::protected_user_ids,
    user_permission::{
        DeleteUserPermissionError, UpsertUserPermissionError, add_checked_user_permission,
        delete_checked_user_permission, find_user_permission, new_user_permission_id,
    },
};
use repository::{
    ContextRowRepository, EqualFilter, MasterListRowRepository, Pagination, PermissionType,
    RepositoryError, StorageConnection, StoreRepository, StoreRow, StoreRowRepository,
    StringFilter, UserAccountRow, UserAccountRowRepository, UserPermissionFilter,
    UserPermissionRepository, UserPermissionRow, UserPermissionRowRepository, trim_spaces,
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
        // One query: the export has already checked the row count against the import cap.
        let permissions = UserPermissionRepository::new(connection)
            .query_by_filter(permission_filter(connection, Some(filter))?)?;
        let records = References::read(connection, &permissions)?;
        let mut rows: Vec<_> = permissions
            .iter()
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
        let repo = UserPermissionRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(Some(permission_filter(connection, Some(filter))?))?),
            total: i64_to_u32(repo.count(Some(permission_filter(connection, None)?))?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // After the user and store sheets, so the users and stores they add are found.
        Ok(Box::new(UserPermissionSheet {
            users: InMemory::new(UserAccountRowRepository::new(connection).find_all()?),
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
            contexts: Contexts::read(connection)?,
            protected: protected_user_ids(connection)?,
            importer: start.user_id.to_string(),
        }))
    }
}

struct UserPermissionSheet {
    /// Read once, so rows don't each query them: they're far fewer than the permissions, and none
    /// change while this sheet runs.
    users: InMemory<UserAccountRow>,
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
        // Looked up for a `DELETE` row too, so a missing reference stops the import.
        let user_id = find_reference(&self.users, row, USERNAME, USER_ID, |users| {
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
            return Err(protected_error(row, self.username(user_id)).into());
        }
        if delete {
            return self.delete(connection, row, existing);
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
        // Found by `find_reference`, so always here.
        let Some(user) = self.users.get(&new.user_id) else {
            return Err(row
                .error(row.reference_column(USERNAME, USER_ID), NOT_FOUND)
                .into());
        };
        // `find_reference` found the store and context, `PERMISSIONS` holds only permissions the
        // server checks, `find_permission` found no record with the key, and protected users are
        // refused above, so the save needn't read them again.
        add_checked_user_permission(connection, &new, user)
            .map_err(|error| upsert_failure(row, &new, Some(user), error))?;
        Ok(RowOutcome {
            record: self.record(&new),
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
    /// The user's username, else their id.
    fn username<'a>(&'a self, user_id: &'a str) -> &'a str {
        self.users
            .get(user_id)
            .map_or(user_id, |user| user.username.as_str())
    }

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
                Some(saved) => Err(self.conflict(row, saved, id, PERMISSION)),
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
            Some(column) => Err(self.conflict(row, &saved, id, column)),
            None => Ok(Some(saved)),
        })
    }

    /// On `key_column`, or the id column beside it when the row fills only that.
    fn conflict(
        &self,
        row: &Row,
        saved: &UserPermissionRow,
        id: &str,
        key_column: &str,
    ) -> RowError {
        let user = self.users.get(&saved.user_id);
        let store = saved.store_id.as_deref().and_then(|id| self.stores.get(id));
        let context = saved
            .context_id
            .as_deref()
            .and_then(|id| self.contexts.get(id));
        let (column, saved_key) = match key_column {
            USERNAME => match row.reference_column(USERNAME, USER_ID) {
                USERNAME => (USERNAME, user.map(|user| user.username.clone())),
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
        row.error(
            column,
            record_conflict(
                column,
                &self.record(saved),
                &saved_key.unwrap_or_default(),
                &saved.id,
                &row.text(column).unwrap_or_default(),
                id,
            ),
        )
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
        check_delete(
            row,
            COLUMNS,
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

        // `import_row` refused a protected user's, and `find_permission` read it.
        delete_checked_user_permission(connection, &self.importer, &saved).map_err(|error| {
            match error {
                DeleteUserPermissionError::LocksOutSelf => row
                    .error(DELETE_COLUMN, locks_out_message(&saved.permission))
                    .into(),
                // Unreachable here: `import_row` refuses a protected user first.
                DeleteUserPermissionError::Protected => {
                    protected_error(row, self.username(&saved.user_id)).into()
                }
                DeleteUserPermissionError::DatabaseError(error) => RowFailure::Database(error),
            }
        })?;
        Ok(RowOutcome {
            record: self.record(&saved),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    /// How the preview and messages name a permission: `anna: STOCKTAKE_QUERY in store MS`, with
    /// its context's name after the permission when it has one.
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

/// Neither a protected or deleted user's, nor one the server doesn't check. Permissions can be
/// many, so they're filtered and counted in SQL; with `filter`, its search matches the username
/// or the store's code.
fn permission_filter(
    connection: &StorageConnection,
    filter: Option<&ExportFilter>,
) -> Result<UserPermissionFilter, RepositoryError> {
    let mut permission_filter = UserPermissionFilter {
        user_id: Some(EqualFilter::not_equal_all(protected_user_ids(connection)?)),
        permission: Some(EqualFilter::equal_any(
            PermissionType::known_iter().collect(),
        )),
        user_is_deleted: Some(false),
        ..Default::default()
    };
    if let Some(text) = filter
        .and_then(|filter| filter.contains.as_deref())
        .map(str::trim)
        && !text.is_empty()
    {
        permission_filter.username_or_store_code = Some(StringFilter::like(text));
    }
    Ok(permission_filter)
}

/// The records the exported permissions refer to, to write beside them.
struct References {
    users: HashMap<String, UserAccountRow>,
    /// With the name of the store's name.
    stores: HashMap<String, (StoreRow, String)>,
    contexts: Contexts,
}

impl References {
    fn read(
        connection: &StorageConnection,
        permissions: &[UserPermissionRow],
    ) -> Result<Self, RepositoryError> {
        let mut user_ids: Vec<String> = permissions
            .iter()
            .map(|permission| permission.user_id.clone())
            .collect();
        user_ids.sort();
        user_ids.dedup();
        let users = UserAccountRowRepository::new(connection)
            .find_many_by_id(&user_ids)?
            .into_iter()
            .map(|user| (user.id.clone(), user))
            .collect();
        // Few, so read whole.
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
        Ok(References {
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

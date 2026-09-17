//! Raw SQL from reports and backend plugins.
//!
//! Report queries and plugin `sql()` are the two places arbitrary statement text meets the
//! database, and they run through the same two functions here: [`query_json_postgres`] and
//! [`query_json_sqlite`]. A statement runs read-only, enforced by the database; its values
//! arrive as named `$name` parameters beside the text and can only ever be data; each row
//! comes back as a JSON object keyed by column. Reports reach the functions through
//! [`ReportQueryExecutor`], plugins through [`query_read_only`].

use crate::database_settings::SQLITE_LOCKWAIT_MS;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::StorageConnectionManager;
use crate::TransactionError;
use diesel::sql_types::Text;

/// Named parameters for a statement, referenced from the text as `$name`.
///
/// A value is a string, number, boolean or null. A datetime is a string in the form the
/// database stores, `YYYY-MM-DD HH:MM:SS`. Arrays and objects have no meaning as one SQL
/// value and are refused when a `$name` reaches one.
pub type SqlParameters = serde_json::Map<String, serde_json::Value>;

/// A report's SQL query, carrying both dialects. Which one runs is decided by
/// [`ReportQueryExecutor`], so callers never need to know the backend.
#[derive(Debug, Clone, PartialEq)]
pub struct ReportSqlQuery {
    pub name: String,
    pub sqlite: String,
    pub postgres: String,
}

/// Runs a report's SQL queries. Owned and `Clone`, so it can be moved onto a blocking thread.
///
/// Report queries are synchronous, so callers are expected to run [`ReportQueryExecutor::run`]
/// inside `spawn_blocking` rather than on an async worker thread (#12710).
#[derive(Clone)]
pub struct ReportQueryExecutor {
    connection_manager: StorageConnectionManager,
}

impl ReportQueryExecutor {
    pub fn new(connection_manager: &StorageConnectionManager) -> Self {
        Self {
            connection_manager: connection_manager.clone(),
        }
    }

    /// Run every query in order, returning `(name, rows)` per query.
    ///
    /// The queries run sequentially on a single connection. On SQLite that matters: the page cache
    /// is per-connection, so later queries reuse pages the earlier ones loaded, and the schema is
    /// parsed once rather than per query. Running them concurrently instead would put each on its
    /// own blocking-pool thread, which oversubscribes low-core devices and is bounded by nothing
    /// (these connections are outside the diesel pool).
    ///
    /// The backend is picked with `if cfg!` rather than `#[cfg]` so both arms are compiled under
    /// either feature - one build proves the other still type checks, and rust-analyzer doesn't
    /// grey out half the file depending on which feature the editor is configured with. The unused
    /// arm is dead code the optimiser drops.
    pub fn run(
        &self,
        queries: Vec<ReportSqlQuery>,
        parameters: &SqlParameters,
    ) -> Result<Vec<(String, Vec<serde_json::Value>)>, RepositoryError> {
        if cfg!(feature = "postgres") {
            // Checked out here rather than by the caller so that waiting for a pooled connection
            // also happens off the async worker, and nothing non-`Send` has to cross into the
            // `spawn_blocking` closure.
            let connection = self.connection_manager.connection()?;
            queries
                .into_iter()
                .map(|query| {
                    let rows = query_json_postgres(&connection, &query.postgres, Some(parameters))?;
                    Ok((query.name, rows))
                })
                .collect()
        } else {
            let connection = report_connection(self.connection_manager.database_url())?;
            queries
                .into_iter()
                .map(|query| {
                    let rows = query_json_sqlite(&connection, &query.sqlite, Some(parameters))?;
                    Ok((query.name, rows))
                })
                .collect()
        }
    }
}

/// One statement for a backend plugin's `sql()`, through the same two functions a report's
/// queries take — so a plugin and a report cannot tell each other's SQL apart, and neither
/// can the database.
///
/// `connection` is used on postgres, where the statement runs on it inside a read-only
/// transaction: the plugin path lends the connection its caller already holds, so a plugin
/// call does not pin a second pool connection under load (#12689). On sqlite the statement
/// runs on its own read-only connection opened on `database_url`, as a report's do, and
/// `connection` is not touched.
///
/// `parameters` given, even empty, means every `$name` in the text must have a value.
/// `None` runs the text exactly as written — what a bundle built before `sql()` took a
/// second argument sends.
///
/// A connection that is already in a transaction is refused. On postgres that is what keeps
/// the read-only setting from escaping: `SET TRANSACTION READ ONLY` applies to the whole
/// enclosing transaction and outlives a savepoint's `RELEASE`, so the caller's transaction
/// would be left read-only for the rest of its life. On sqlite the statement could not see
/// the caller's uncommitted rows anyway, and refusing is more honest than reading stale
/// state. The plugin path never arrives in one: `with_shared_connection` refuses to lend an
/// in-transaction connection.
pub fn query_read_only(
    connection: &StorageConnection,
    database_url: &str,
    sql: &str,
    parameters: Option<&SqlParameters>,
) -> Result<Vec<serde_json::Value>, RepositoryError> {
    let transaction_level = connection
        .lock()
        .transaction_level::<RepositoryError>()
        .map_err(TransactionError::to_inner_error)?;
    if transaction_level > 0 {
        return Err(RepositoryError::DBError {
            msg: "Refusing to run a read-only query on a connection that is already in a \
                  transaction"
                .to_string(),
            extra: format!("transaction level {transaction_level}"),
        });
    }

    if cfg!(feature = "postgres") {
        query_json_postgres(connection, sql, parameters)
    } else {
        query_json_sqlite(&report_connection(database_url)?, sql, parameters)
    }
}

#[derive(QueryableByName, Debug, PartialEq)]
struct JsonDataRow {
    #[diesel(sql_type = Text)]
    data: String,
}

/// A parameter as a Postgres literal for `EXECUTE`. The escaping here is what keeps these
/// values data, since they are NOT bound.
///
/// They cannot simply be bound: the `PREPARE` below declares no parameter types, so
/// Postgres infers each from how the statement uses it and coerces the literal — which is
/// what lets one report compare `$now` to a `timestamp` column and another `$storeId` to
/// `text` without saying which, and what keeps `date` and native enum columns behaving as
/// they do for a hand-written literal. A bind would send a type OID and take that away.
///
/// So a string is quoted with every `'` doubled, complete while
/// `standard_conforming_strings` is on, which `query_json_postgres` pins for the
/// transaction. Unescaped, a caller's parameter could end its literal and be evaluated as an
/// expression (`graphql::reports::print` merges the request's `arguments` in and guards only
/// `storeId`) — the injection #687 closed for plugin `sql()`. The SQLite path binds through
/// rusqlite and was never affected.
fn sql_literal(name: &str, value: &serde_json::Value) -> Result<String, RepositoryError> {
    Ok(match value {
        serde_json::Value::Null => "NULL".to_string(),
        serde_json::Value::Bool(boolean) => boolean.to_string(),
        serde_json::Value::Number(number) => number.to_string(),
        serde_json::Value::String(text) => format!("'{}'", text.replace('\'', "''")),
        serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
            return Err(not_a_value(name, value));
        }
    })
}

fn not_a_value(name: &str, value: &serde_json::Value) -> RepositoryError {
    RepositoryError::as_db_error(
        "SQL_PARAMETER_NOT_A_VALUE",
        format!("${name} must be a string, number, boolean or null; got {value}"),
    )
}

/// Run a query through diesel, wrapping it so each row comes back as JSON.
///
/// Postgres only - the SQL it builds (`PREPARE`, `row_to_json`) is Postgres syntax. It still
/// compiles on a SQLite build because everything it touches is backend generic; it just never
/// runs there.
///
/// Read-only is `SET TRANSACTION READ ONLY` on a transaction opened here, so it ends with the
/// statement and nothing leaks back to a lent connection. The caller must not already be in a
/// transaction (see `query_read_only`); a report's connection is fresh from the pool.
fn query_json_postgres(
    connection: &StorageConnection,
    sql: &str,
    parameters: Option<&SqlParameters>,
) -> Result<Vec<serde_json::Value>, RepositoryError> {
    use diesel::connection::SimpleConnection;
    use diesel::{sql_query, RunQueryDsl};
    use regex::Regex;
    use util::uuid::small_uuid;

    // remove trailing ";" if there is any
    let sql = sql.trim();
    let sql = sql.strip_suffix(';').unwrap_or(sql).to_string();

    // Without parameters the text runs as written: a plugin bundle built before `sql()` took
    // a second argument may carry a `$` of its own.
    let (sql, used_params) = match parameters {
        None => (sql, Vec::new()),
        Some(parameters) => {
            // extract all used params from the sql query string, e.g. $myVariable
            let re = Regex::new(r"\$[A-Za-z_][A-Za-z0-9_]*").unwrap();
            // stores the variable name and the found parameter value, e.g. ($myVariable, "Hello")
            let mut used_params = Vec::<(String, serde_json::Value)>::new();
            for param in re.find_iter(&sql) {
                let param = param.as_str();
                if used_params.iter().any(|(used, _)| used == param) {
                    continue;
                }
                let param_name = &param[1..];
                let Some(param_value) = parameters.get(param_name) else {
                    return Err(RepositoryError::DBError {
                        msg: format!("Invalid parameter: {param_name}"),
                        extra: "".to_string(),
                    });
                };
                used_params.push((param.to_string(), param_value.clone()))
            }

            // Replace named variable like $myVariable with the numbered parameters like $1. Using
            // the order in which variables where first used. One pass over whole matches: a
            // sequential `replace` of `$store` would also rewrite the head of `$storeId`.
            let sql = re
                .replace_all(&sql, |captures: &regex::Captures| {
                    let position = used_params
                        .iter()
                        .position(|(used, _)| used == &captures[0])
                        .expect("every match was collected above");
                    format!("${}", position + 1)
                })
                .into_owned();
            (sql, used_params)
        }
    };

    // Create the string containing all the parameter values
    let param_values = used_params
        .iter()
        .map(|(name, value)| sql_literal(&name[1..], value))
        .collect::<Result<Vec<String>, _>>()?
        .join(", ");
    let param_values = if param_values.is_empty() {
        "".to_string()
    } else {
        format!("({})", param_values)
    };

    // do the query
    let statement_name = format!("statement_{}", small_uuid());
    let json_row_sql_query = format!(
        "PREPARE {} AS
            WITH provided_query AS(
                {}
                ) SELECT row_to_json(provided_query) as data FROM provided_query;
        ",
        statement_name, sql
    );
    let result = connection
        .transaction_sync_etc(
            |connection| -> Result<Vec<serde_json::Value>, RepositoryError> {
                let mut guard = connection.lock();
                let pg_connection = guard.connection();
                // READ ONLY must be the first statement of the transaction. Pinning
                // standard_conforming_strings is what makes doubling a quote a complete escape
                // in `sql_literal`, whatever the server is configured with.
                pg_connection.batch_execute(
                    "SET TRANSACTION READ ONLY; SET LOCAL standard_conforming_strings = on;",
                )?;
                pg_connection.batch_execute(&json_row_sql_query)?;
                let json_results =
                    sql_query(format!("EXECUTE {}{};", statement_name, param_values))
                        .load::<JsonDataRow>(pg_connection)?;
                pg_connection.batch_execute(&format!("DEALLOCATE PREPARE {};", statement_name))?;

                json_results
                    .into_iter()
                    .map(|row| {
                        serde_json::from_str(&row.data).map_err(|error| {
                            RepositoryError::as_db_error("row_to_json was not JSON", error)
                        })
                    })
                    .collect()
            },
            false,
        )
        .map_err(|error| error.to_inner_error());

    if result.is_err() {
        // A prepared statement is session-scoped and survives the rollback, so on a pooled
        // connection every failed query would otherwise leave one behind for the life of the
        // session. Best effort: if PREPARE itself failed there is nothing to deallocate.
        let _ = connection
            .lock()
            .connection()
            .batch_execute(&format!("DEALLOCATE PREPARE {};", statement_name));
    }
    result
}

impl From<rusqlite::Error> for RepositoryError {
    fn from(value: rusqlite::Error) -> Self {
        RepositoryError::DBError {
            msg: format!("{value}"),
            extra: "".to_string(),
        }
    }
}

/// Open a connection for running report and plugin queries.
///
/// Opened READ-ONLY: that flag is the write guard on sqlite, for a report and a plugin alike,
/// and unlike `PRAGMA query_only` it is not state anything could reset. `database_url` is the
/// path the pool was opened with (`StorageConnectionManager::database_url`), so this reads the
/// same file.
///
/// These connections bypass the diesel pool, so they don't get the customiser's pragmas
/// (`SqliteConnectionOptions::on_acquire`). `busy_timeout` in particular defaults to 0, which
/// means a query that collides with a sync write fails immediately with "database is
/// locked" instead of waiting, so set it explicitly to match the pooled connections.
///
/// SQLite only - on a Postgres build `database_url` is a Postgres URL and this is never called.
fn report_connection(database_url: &str) -> Result<rusqlite::Connection, RepositoryError> {
    use rusqlite::OpenFlags;

    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY
        | OpenFlags::SQLITE_OPEN_NO_MUTEX
        | OpenFlags::SQLITE_OPEN_URI;
    let conn = rusqlite::Connection::open_with_flags(database_url, flags)?;
    conn.busy_timeout(std::time::Duration::from_millis(SQLITE_LOCKWAIT_MS.into()))?;
    Ok(conn)
}

/// Run a query on an existing SQLite connection.
///
/// The connection is passed in rather than opened per query: SQLite's page cache is
/// per-connection, so reusing one connection lets later queries hit pages the earlier ones
/// already loaded, and pays the schema parse once rather than per query.
///
/// Parameters are bound by name through rusqlite, so sqlite resolves `$name` (and `:name`)
/// itself and a `$` inside a string literal is never mistaken for one.
fn query_json_sqlite(
    conn: &rusqlite::Connection,
    sql: &str,
    parameters: Option<&SqlParameters>,
) -> Result<Vec<serde_json::Value>, RepositoryError> {
    use rusqlite::types::Null;
    use serde_json::Number;

    let mut statement = conn.prepare(sql)?;

    if let Some(parameters) = parameters {
        for p in 1..=statement.parameter_count() {
            let Some(param) = statement.parameter_name(p) else {
                continue;
            };
            // remove leading "$" (or ":")
            let param_name = &param[1..];
            let Some(param) = parameters.get(param_name) else {
                return Err(RepositoryError::DBError {
                    msg: format!("Invalid parameter: {param_name}"),
                    extra: "".to_string(),
                });
            };
            match param {
                serde_json::Value::Null => statement.raw_bind_parameter(p, Null)?,
                serde_json::Value::Bool(b) => statement.raw_bind_parameter(p, b)?,
                serde_json::Value::Number(number) => {
                    if let Some(number) = number.as_f64() {
                        statement.raw_bind_parameter(p, number)?;
                    } else if let Some(number) = number.as_u64() {
                        statement.raw_bind_parameter(p, number as i64)?;
                    } else if let Some(number) = number.as_i64() {
                        statement.raw_bind_parameter(p, number)?;
                    }
                }
                serde_json::Value::String(s) => statement.raw_bind_parameter(p, s)?,
                serde_json::Value::Array(_) | serde_json::Value::Object(_) => {
                    return Err(not_a_value(param_name, param));
                }
            };
        }
    }

    let mut column_names = vec![];
    for c in 0..statement.column_count() {
        let name = statement.column_name(c)?.to_string();
        column_names.push(name);
    }
    let rows = statement.raw_query();
    let rows = rows.mapped(|row| {
        let mut object = serde_json::Map::<String, serde_json::Value>::new();
        for (c, _) in column_names.iter().enumerate() {
            let value = row.get_ref(c)?;
            let name = column_names[c].clone();
            match value.data_type() {
                rusqlite::types::Type::Null => {
                    object.insert(name, serde_json::Value::Null);
                }
                rusqlite::types::Type::Integer => {
                    let int: i64 = row.get(c)?;
                    object.insert(name, serde_json::Value::Number(Number::from(int)));
                }
                rusqlite::types::Type::Real => {
                    let f: f64 = row.get(c)?;
                    if let Some(number) = Number::from_f64(f) {
                        object.insert(name, serde_json::Value::Number(number));
                    }
                }
                rusqlite::types::Type::Text => {
                    object.insert(name, serde_json::Value::String(row.get(c)?));
                }
                rusqlite::types::Type::Blob => {
                    // do nothing?
                }
            };
        }
        Ok(serde_json::Value::Object(object))
    });
    let mut result = Vec::new();
    for row in rows.into_iter() {
        result.push(row?);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use serde_json::json;

    use crate::{
        mock::MockDataInserts, test_db, ActivityLogRow, ActivityLogRowRepository, ActivityLogType,
        RepositoryError, StorageConnection, StorageConnectionManager, StoreRowRepository,
        UserAccountRow, UserAccountRowRepository,
    };

    use super::{query_read_only, sql_literal, ReportQueryExecutor, ReportSqlQuery, SqlParameters};

    /// Run one query through the executor. The SQL here is valid in both dialects, so the same
    /// string is given for each and the executor picks whichever matches the build.
    fn query(
        executor: &ReportQueryExecutor,
        sql: &str,
        parameters: &SqlParameters,
    ) -> Result<Vec<serde_json::Value>, RepositoryError> {
        let mut results = executor.run(
            vec![ReportSqlQuery {
                name: "query".to_string(),
                sqlite: sql.to_string(),
                postgres: sql.to_string(),
            }],
            parameters,
        )?;
        Ok(results.remove(0).1)
    }

    fn params(value: serde_json::Value) -> SqlParameters {
        value.as_object().unwrap().clone()
    }

    /// The plugin path: one statement on a lent connection.
    fn plugin(
        connection: &StorageConnection,
        manager: &StorageConnectionManager,
        sql: &str,
        parameters: Option<&SqlParameters>,
    ) -> Result<Vec<serde_json::Value>, RepositoryError> {
        query_read_only(connection, manager.database_url(), sql, parameters)
    }

    #[actix_rt::test]
    async fn test_report_query() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "test_report_query",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let executor = ReportQueryExecutor::new(&connection_manager);

        // query with no params
        let result = query(
            &executor,
            "SELECT id, code, logo FROM store LIMIT 1;", // test with trailing ";"
            &serde_json::Map::new(),
        )
        .unwrap();
        assert_eq!(
            &serde_json::to_string(&result).unwrap().to_string(),
            "[{\"code\":\"code\",\"id\":\"store_a\",\"logo\":null}]"
        );

        // simple params
        let result = query(
            &executor,
            "SELECT id, code FROM store WHERE id=$store LIMIT $limit", // test without trailing ";"
            &params(json!({
                "store": "store_a",
                "limit": 2,
            })),
        )
        .unwrap();

        assert_eq!(
            &serde_json::to_string(&result).unwrap().to_string(),
            "[{\"code\":\"code\",\"id\":\"store_a\"}]"
        );

        // multiple used params, and a parameter the query does not use (a report is handed
        // every variable it might want)
        let result = query(
            &executor,
            "SELECT id, code FROM store WHERE id LIKE $b || '%' AND code LIKE $b || '%' LIMIT $a",
            &params(json!({
                "a": 5,
                "b": "name",
                "unused": "ignored",
            })),
        )
        .unwrap();

        assert_eq!(
            &serde_json::to_string(&result).unwrap().to_string(),
            "[{\"code\":\"name_store_code\",\"id\":\"name_store_id\"},{\"code\":\"name_store_code_a\",\"id\":\"name_store_a_id\"}]"
        );

        // a batch comes back in input order, with each name paired to its own rows
        let results = executor
            .run(
                vec![
                    ReportSqlQuery {
                        name: "first".to_string(),
                        sqlite: "SELECT id FROM store WHERE id=$store".to_string(),
                        postgres: "SELECT id FROM store WHERE id=$store".to_string(),
                    },
                    ReportSqlQuery {
                        name: "second".to_string(),
                        sqlite: "SELECT code FROM store WHERE id=$store".to_string(),
                        postgres: "SELECT code FROM store WHERE id=$store".to_string(),
                    },
                ],
                &params(json!({ "store": "store_a" })),
            )
            .unwrap();
        assert_eq!(results[0].0, "first");
        assert_eq!(results[1].0, "second");
        assert_eq!(results[0].1.len(), 1);
        assert_eq!(results[1].1.len(), 1);
        // the two queries select different columns, so rows paired with the wrong name surface here
        assert!(results[0].1[0].as_object().unwrap().contains_key("id"));
        assert!(results[1].1[0].as_object().unwrap().contains_key("code"));
    }

    /// A parameter is a VALUE, on both engines.
    ///
    /// Unescaped, the Postgres path made it an EXPRESSION: it evaluated
    /// `' || current_user || '` and the report got the answer. Postgres refuses sub-selects
    /// in `EXECUTE` arguments, so not an arbitrary table read, but any function the role can
    /// call ran.
    #[actix_rt::test]
    async fn a_parameter_cannot_become_an_expression() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "report_query_parameter_is_never_an_expression",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let executor = ReportQueryExecutor::new(&connection_manager);

        let payload = "' || current_user || '";
        let result = query(
            &executor,
            "SELECT $injected AS echoed",
            &params(json!({ "injected": payload })),
        )
        .unwrap();
        // It comes back byte for byte: it was only ever data
        assert_eq!(result.len(), 1, "{result:?}");
        assert_eq!(result[0]["echoed"], json!(payload), "{result:?}");

        // A lone quote is a value too, not a syntax error
        let result = query(
            &executor,
            "SELECT $injected AS echoed",
            &params(json!({ "injected": "it's" })),
        )
        .unwrap();
        assert_eq!(result[0]["echoed"], json!("it's"), "{result:?}");
    }

    /// One parameter's name may be a prefix of another's. Rewriting them one at a time
    /// turned `$storeId` into `$1Id` once `$store` had been replaced.
    #[actix_rt::test]
    async fn a_parameter_name_that_prefixes_another_is_rewritten_whole() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "report_query_prefixed_parameter_names",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let executor = ReportQueryExecutor::new(&connection_manager);

        let result = query(
            &executor,
            "SELECT id FROM store WHERE id = $store OR id = $storeId ORDER BY id",
            &params(json!({ "store": "store_a", "storeId": "name_store_id" })),
        )
        .unwrap();
        assert_eq!(
            result,
            vec![json!({ "id": "name_store_id" }), json!({ "id": "store_a" })]
        );
    }

    #[test]
    fn a_parameter_literal_cannot_end_its_own_quoting() {
        assert_eq!(sql_literal("p", &json!("plain")).unwrap(), "'plain'");
        assert_eq!(sql_literal("p", &json!("it's")).unwrap(), "'it''s'");
        assert_eq!(
            sql_literal("p", &json!("'; DROP TABLE store; --")).unwrap(),
            "'''; DROP TABLE store; --'"
        );
        assert_eq!(sql_literal("p", &json!(null)).unwrap(), "NULL");
        assert_eq!(sql_literal("p", &json!(true)).unwrap(), "true");
        assert_eq!(sql_literal("p", &json!(42)).unwrap(), "42");
        assert_eq!(sql_literal("p", &json!(1.5)).unwrap(), "1.5");
        // No literal spelling of these means anything as one value
        assert!(sql_literal("p", &json!(["a"]))
            .unwrap_err()
            .to_string()
            .contains("$p"));
        assert!(sql_literal("p", &json!({ "a": 1 })).is_err());
    }

    /// Security audit DS-3: plugin `sql()` runs bundle-supplied statements, so writes must be
    /// refused by the database rather than by trying to recognise them — and a report's
    /// queries take the same route.
    #[actix_rt::test]
    async fn refuses_writes() {
        let (_, connection, manager, _) =
            test_db::setup_all("read_only_sql_refuses_writes", MockDataInserts::none()).await;

        UserAccountRowRepository::new(&connection)
            .insert_one(&UserAccountRow {
                id: "user-1".to_string(),
                username: "user-1".to_string(),
                hashed_password: "ORIGINAL-HASH".to_string(),
                ..Default::default()
            })
            .unwrap();

        let writes = [
            "UPDATE user_account SET hashed_password = 'OWNED'",
            "DELETE FROM user_account",
            "INSERT INTO user_account (id, username, hashed_password) VALUES ('x', 'x', 'x')",
            "CREATE TABLE plugin_owned (id TEXT)",
            "DROP TABLE user_account",
        ];
        for write in writes {
            assert!(
                plugin(&connection, &manager, write, None).is_err(),
                "a write was accepted: {}",
                write
            );
            assert!(
                query(
                    &ReportQueryExecutor::new(&manager),
                    write,
                    &params(json!({}))
                )
                .is_err(),
                "a report write was accepted: {}",
                write
            );
        }

        // Nothing landed
        let user = UserAccountRowRepository::new(&connection)
            .find_one_by_id("user-1")
            .unwrap()
            .unwrap();
        assert_eq!(user.hashed_password, "ORIGINAL-HASH");
    }

    /// The read-only setting is transaction-scoped on postgres, and `transaction_sync_etc`
    /// would open a savepoint inside the caller's transaction, where `RELEASE` does not
    /// undo it - so a connection with a transaction open is refused outright rather than
    /// left read-only for the rest of the caller's transaction.
    #[actix_rt::test]
    async fn refuses_a_connection_already_in_a_transaction() {
        let (_, connection, manager, _) = test_db::setup_all(
            "read_only_sql_refuses_in_transaction",
            MockDataInserts::none().names().stores(),
        )
        .await;

        connection
            .transaction_sync(|transaction_connection| {
                assert!(
                    plugin(transaction_connection, &manager, "SELECT 1 AS one", None).is_err(),
                    "a connection already in a transaction was accepted"
                );
                Ok(()) as Result<(), RepositoryError>
            })
            .unwrap();

        // The caller's transaction was not left read-only by the refusal
        let store = StoreRowRepository::new(&connection)
            .find_one_by_id("store_a")
            .unwrap()
            .unwrap();
        StoreRowRepository::new(&connection)
            .upsert_one(&store)
            .unwrap();
    }

    /// Rows come back keyed by column, and the lent connection is still writable afterwards:
    /// plugins keep a deliberate write path via `use_repository`.
    #[actix_rt::test]
    async fn returns_rows_keyed_by_column_and_leaves_the_connection_writable() {
        let (_, connection, manager, _) = test_db::setup_all(
            "read_only_sql_rows_by_column",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let rows = plugin(
            &connection,
            &manager,
            "SELECT id, code FROM store WHERE id = 'store_a';",
            None,
        )
        .unwrap();
        assert_eq!(rows, vec![json!({ "id": "store_a", "code": "code" })]);

        // A statement that failed must not leave the connection read-only either
        assert!(plugin(&connection, &manager, "SELECT * FROM nope", None).is_err());

        let store = StoreRowRepository::new(&connection)
            .find_one_by_id("store_a")
            .unwrap()
            .unwrap();
        StoreRowRepository::new(&connection)
            .upsert_one(&store)
            .unwrap();
    }

    /// Issue #687: a value a caller sent can only ever be compared as data. Written into the
    /// text by hand, the payload below ends the literal and reads `user_account` inside a
    /// perfectly read-only transaction.
    #[actix_rt::test]
    async fn a_plugin_parameter_is_data() {
        let (_, connection, manager, _) = test_db::setup_all(
            "read_only_sql_parameter_is_data",
            MockDataInserts::none().names().stores(),
        )
        .await;

        UserAccountRowRepository::new(&connection)
            .insert_one(&UserAccountRow {
                id: "user-1".to_string(),
                username: "user-1".to_string(),
                hashed_password: "SECRET-HASH".to_string(),
                ..Default::default()
            })
            .unwrap();

        let sql = "SELECT id FROM store WHERE id = $storeId";
        let rows = plugin(
            &connection,
            &manager,
            sql,
            Some(&params(json!({ "storeId": "store_a" }))),
        )
        .unwrap();
        assert_eq!(rows, vec![json!({ "id": "store_a" })]);

        let payload = "x' UNION SELECT hashed_password FROM user_account --";
        let rows = plugin(
            &connection,
            &manager,
            sql,
            Some(&params(json!({ "storeId": payload }))),
        )
        .unwrap();
        assert!(rows.is_empty(), "the payload matched something: {:?}", rows);

        // A name with no value, and an array where a value is needed, are refused by name
        let error = plugin(&connection, &manager, sql, Some(&params(json!({}))))
            .unwrap_err()
            .to_string();
        assert!(error.contains("storeId"), "{}", error);
        let error = plugin(
            &connection,
            &manager,
            sql,
            Some(&params(json!({ "storeId": ["a", "b"] }))),
        )
        .unwrap_err()
        .to_string();
        assert!(error.contains("storeId"), "{}", error);
    }

    /// A value keeps the typing a hand-written literal had: a datetime string meets a
    /// `timestamp` column and a `date` column without being told which, a whole number lands
    /// in LIMIT, and the other scalars come back as themselves.
    #[actix_rt::test]
    async fn values_keep_literal_typing() {
        let (_, connection, manager, _) = test_db::setup_all(
            "read_only_sql_literal_typing",
            MockDataInserts::none().names().stores(),
        )
        .await;

        ActivityLogRowRepository::new(&connection)
            .insert_one(&ActivityLogRow {
                id: "log-1".to_string(),
                r#type: ActivityLogType::UserLoggedIn,
                user_id: None,
                store_id: Some("store_a".to_string()),
                record_id: None,
                datetime: NaiveDate::from_ymd_opt(2024, 5, 1)
                    .unwrap()
                    .and_hms_opt(10, 30, 0)
                    .unwrap(),
                changed_to: None,
                changed_from: None,
            })
            .unwrap();

        // activity_log.datetime is a TIMESTAMP column
        let sql = "SELECT id FROM activity_log WHERE datetime >= $at";
        let at = |text: &str| params(json!({ "at": text }));
        assert_eq!(
            plugin(&connection, &manager, sql, Some(&at("2024-05-01 00:00:00"))).unwrap(),
            vec![json!({ "id": "log-1" })]
        );
        assert!(
            plugin(&connection, &manager, sql, Some(&at("2024-05-02 00:00:00")))
                .unwrap()
                .is_empty()
        );

        // store.created_date is a DATE column; mock store_a was created on 2020-01-01
        let sql = "SELECT id FROM store WHERE id = 'store_a' AND created_date <= $on";
        let on = |text: &str| params(json!({ "on": text }));
        assert_eq!(
            plugin(&connection, &manager, sql, Some(&on("2020-01-01")))
                .unwrap()
                .len(),
            1
        );
        assert!(plugin(&connection, &manager, sql, Some(&on("2019-12-31")))
            .unwrap()
            .is_empty());

        let rows = plugin(
            &connection,
            &manager,
            "SELECT id FROM store ORDER BY id LIMIT $n",
            Some(&params(json!({ "n": 1 }))),
        )
        .unwrap();
        assert_eq!(rows.len(), 1);

        // A null binds as NULL, a `$` inside a literal is text, and a number meets a numeric
        // context. (On postgres a parameter takes its type from where it is used, so a bare
        // `SELECT $value` would come back as text; a report writes its parameters in context.)
        let rows = plugin(
            &connection,
            &manager,
            "SELECT COALESCE($absent, id) AS absent, '$9' AS dollar FROM store \
             WHERE id = 'store_a' AND $value > 1",
            Some(&params(json!({ "absent": null, "value": 1.5 }))),
        )
        .unwrap();
        assert_eq!(rows, vec![json!({ "absent": "store_a", "dollar": "$9" })]);
    }

    /// A statement given without parameters runs exactly as written: this is every plugin
    /// bundle built before `sql()` took a second argument.
    #[actix_rt::test]
    async fn without_parameters_the_statement_runs_as_written() {
        let (_, connection, manager, _) = test_db::setup_all(
            "read_only_sql_without_parameters",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let rows = plugin(
            &connection,
            &manager,
            "SELECT id, '$storeId' AS note FROM store WHERE id = 'store_a'",
            None,
        )
        .unwrap();
        assert_eq!(rows, vec![json!({ "id": "store_a", "note": "$storeId" })]);
    }

    /// Sqlite resolves parameter names itself, so a sqlite-only report written with `:name`
    /// (PNG's SummaryForPeriod) keeps working, and a `$` inside a string literal is never
    /// mistaken for a parameter.
    #[actix_rt::test]
    async fn sqlite_binds_by_name_natively() {
        if cfg!(feature = "postgres") {
            return;
        }
        let (_, connection, manager, _) = test_db::setup_all(
            "read_only_sql_sqlite_native_names",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let rows = plugin(
            &connection,
            &manager,
            "SELECT id FROM store WHERE id = :storeId AND '$storeId' = '$storeId'",
            Some(&params(json!({ "storeId": "store_a" }))),
        )
        .unwrap();
        assert_eq!(rows, vec![json!({ "id": "store_a" })]);
    }
}

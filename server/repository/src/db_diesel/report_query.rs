use crate::database_settings::DatabaseSettings;
use crate::RepositoryError;
use crate::StorageConnectionManager;
#[cfg(feature = "postgres")]
use crate::StorageConnection;
#[cfg(feature = "postgres")]
use diesel::sql_types::*;

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
    #[cfg(not(feature = "postgres"))]
    settings: DatabaseSettings,
    #[cfg(feature = "postgres")]
    connection_manager: StorageConnectionManager,
}

impl ReportQueryExecutor {
    #[cfg(not(feature = "postgres"))]
    pub fn new(
        settings: &DatabaseSettings,
        _connection_manager: &StorageConnectionManager,
    ) -> Self {
        Self {
            settings: settings.clone(),
        }
    }

    #[cfg(feature = "postgres")]
    pub fn new(
        _settings: &DatabaseSettings,
        connection_manager: &StorageConnectionManager,
    ) -> Self {
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
    #[cfg(not(feature = "postgres"))]
    pub fn run(
        &self,
        queries: Vec<ReportSqlQuery>,
        parameters: &serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<(String, Vec<serde_json::Value>)>, RepositoryError> {
        let connection = report_connection(&self.settings)?;
        queries
            .into_iter()
            .map(|query| {
                let rows = query_json_with_connection(&connection, &query.sqlite, parameters)?;
                Ok((query.name, rows))
            })
            .collect()
    }

    #[cfg(feature = "postgres")]
    pub fn run(
        &self,
        queries: Vec<ReportSqlQuery>,
        parameters: &serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<(String, Vec<serde_json::Value>)>, RepositoryError> {
        // Checked out here rather than by the caller so that waiting for a pooled connection also
        // happens off the async worker, and nothing non-`Send` has to cross into the closure.
        let connection = self.connection_manager.connection()?;
        queries
            .into_iter()
            .map(|query| {
                let rows = query_json(&connection, &query.postgres, parameters)?;
                Ok((query.name, rows))
            })
            .collect()
    }
}

#[cfg(feature = "postgres")]
#[derive(QueryableByName, Debug, PartialEq)]
pub struct JsonDataRow {
    #[diesel(sql_type = Text)]
    data: String,
}

#[cfg(feature = "postgres")]
pub(crate) fn query_json(
    connection: &StorageConnection,
    sql: &str,
    parameters: &serde_json::Map<String, serde_json::Value>,
) -> Result<Vec<serde_json::Value>, RepositoryError> {
    use diesel::connection::SimpleConnection;
    use diesel::{sql_query, RunQueryDsl};
    use regex::Regex;
    use util::uuid::small_uuid;

    // extract all used params from the sql query string, e.g. $myVariable
    let re = Regex::new(r"(\$[a-zA-Z0-9]+)").unwrap();
    // stores the variable name and the found parameter value, e.g. ($myVariable, "Hello")
    let mut used_params = Vec::<(String, serde_json::Value)>::new();
    for param in re.captures_iter(sql) {
        let param: &str = &param[0];
        if used_params.iter().any(|it| &it.0 == param) {
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

    // remove trailing ";" if there is any
    let mut sql = if sql.chars().last() == Some(';') {
        sql[..sql.len() - 1].to_string()
    } else {
        sql.to_string()
    };
    // Replace named variable like $myVariable with the numbered parameters like $1. Using the order
    // in which variables where first used.
    for (i, param) in used_params.iter().enumerate() {
        sql = sql.replace(&param.0, &format!("${}", i + 1));
    }

    // Create the string containing all the parameter values
    let param_values = used_params
        .iter()
        .map(|it| match &it.1 {
            serde_json::Value::Null => "NULL".to_string(),
            serde_json::Value::Bool(b) => format!("{b}"),
            serde_json::Value::Number(n) => format!("{n}"),
            serde_json::Value::String(s) => format!("'{}'", s),
            // not supported but just add them...
            serde_json::Value::Array(_) => format!("{}", it.1.to_string()),
            serde_json::Value::Object(_) => format!("{}", it.1.to_string()),
        })
        .collect::<Vec<String>>()
        .join(", ");
    let param_values = if param_values.is_empty() {
        "".to_string()
    } else {
        format!("({})", param_values)
    };

    // do the query
    let mut guard = connection.lock();
    let pg_connection = guard.connection();
    let statement_name = format!("statement_{}", small_uuid());
    let json_row_sql_query = format!(
        "PREPARE {} AS
            WITH provided_query AS(
                {}
                ) SELECT row_to_json(provided_query) as data FROM provided_query;
        ",
        statement_name, sql
    );
    pg_connection.batch_execute(&json_row_sql_query)?;
    let json_results = sql_query(&format!("EXECUTE {}{};", statement_name, param_values))
        .load::<JsonDataRow>(pg_connection)?;
    pg_connection.batch_execute(&format!("DEALLOCATE PREPARE {};", statement_name))?;

    let rows: Vec<serde_json::Value> = json_results
        .into_iter()
        .map(|r| serde_json::from_str(&r.data).unwrap())
        .collect();

    Ok(rows)
}

#[cfg(not(feature = "postgres"))]
use crate::database_settings::SQLITE_LOCKWAIT_MS;
#[cfg(not(feature = "postgres"))]
impl From<rusqlite::Error> for RepositoryError {
    fn from(value: rusqlite::Error) -> Self {
        RepositoryError::DBError {
            msg: format!("{value}"),
            extra: "".to_string(),
        }
    }
}

/// Open a connection for running report queries.
///
/// These queries bypass the diesel pool, so they don't get the customiser's pragmas
/// (`SqliteConnectionOptions::on_acquire`). `busy_timeout` in particular defaults to 0, which
/// means a report query that collides with a sync write fails immediately with "database is
/// locked" instead of waiting, so set it explicitly to match the pooled connections.
#[cfg(not(feature = "postgres"))]
pub(crate) fn report_connection(
    settings: &DatabaseSettings,
) -> Result<rusqlite::Connection, RepositoryError> {
    let conn = rusqlite::Connection::open(settings.connection_string())?;
    conn.busy_timeout(std::time::Duration::from_millis(SQLITE_LOCKWAIT_MS.into()))?;
    Ok(conn)
}

/// Run a report query on an existing connection.
///
/// Prefer this over [`query_json`] when running several queries for one report: SQLite's page
/// cache is per-connection, so reusing one connection lets later queries hit pages the earlier
/// ones already loaded, and pays the schema parse once rather than per query.
#[cfg(not(feature = "postgres"))]
pub(crate) fn query_json_with_connection(
    conn: &rusqlite::Connection,
    sql: &str,
    parameters: &serde_json::Map<String, serde_json::Value>,
) -> Result<Vec<serde_json::Value>, RepositoryError> {
    use rusqlite::types::Null;
    use serde_json::Number;

    let mut statement = conn.prepare(sql)?;

    for p in 1..=statement.parameter_count() {
        let Some(param) = statement.parameter_name(p) else {
            continue;
        };
        // remove trailing "$"
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
            serde_json::Value::Array(_) => statement.raw_bind_parameter(p, Null)?,
            serde_json::Value::Object(_) => statement.raw_bind_parameter(p, Null)?,
        };
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
    use serde_json::json;

    use crate::{mock::MockDataInserts, test_db};

    use super::{ReportQueryExecutor, ReportSqlQuery};

    /// Run one query through the executor. The SQL here is valid in both dialects, so the same
    /// string is given for each and the executor picks whichever matches the build.
    fn query(
        executor: &ReportQueryExecutor,
        sql: &str,
        parameters: &serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, crate::RepositoryError> {
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

    #[actix_rt::test]
    async fn test_report_query() {
        let (_, _, connection_manager, settings) = test_db::setup_all(
            "test_report_query",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let executor = ReportQueryExecutor::new(&settings, &connection_manager);

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
            json!({
                "store": "store_a",
                "limit": 2,
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        assert_eq!(
            &serde_json::to_string(&result).unwrap().to_string(),
            "[{\"code\":\"code\",\"id\":\"store_a\"}]"
        );

        // multiple used params
        let result = query(
            &executor,
            "SELECT id, code FROM store WHERE id LIKE $b || '%' AND code LIKE $b || '%' LIMIT $a",
            json!({
                "a": 5,
                "b": "name",
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        assert_eq!(
            &serde_json::to_string(&result).unwrap().to_string(),
            "[{\"code\":\"name_store_code\",\"id\":\"name_store_id\"},{\"code\":\"name_store_code_a\",\"id\":\"name_store_a_id\"}]"
        );
    }
}

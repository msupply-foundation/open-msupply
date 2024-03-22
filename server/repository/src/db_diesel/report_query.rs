use crate::RepositoryError;
#[cfg(feature = "postgres")]
use crate::StorageConnection;
#[cfg(feature = "postgres")]
use diesel::sql_types::*;

#[cfg(feature = "postgres")]
#[derive(QueryableByName, Debug, PartialEq)]
pub struct JsonDataRow {
    #[sql_type = "Text"]
    data: String,
}

#[cfg(feature = "postgres")]
pub fn query_json(
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
    let pg_connection = &connection.connection;
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
use crate::database_settings::DatabaseSettings;
#[cfg(not(feature = "postgres"))]
impl From<rusqlite::Error> for RepositoryError {
    fn from(value: rusqlite::Error) -> Self {
        RepositoryError::DBError {
            msg: format!("{}", value),
            extra: "".to_string(),
        }
    }
}

#[cfg(not(feature = "postgres"))]
pub fn query_json(
    settings: &DatabaseSettings,
    sql: &str,
    parameters: &serde_json::Map<String, serde_json::Value>,
) -> Result<Vec<serde_json::Value>, RepositoryError> {
    use rusqlite::{types::Null, Connection as RusqliteConnection};
    use serde_json::Number;

    let conn = RusqliteConnection::open(settings.connection_string())?;

    let mut statement = conn.prepare(sql)?;

    for p in 1..=statement.parameter_count() {
        let Some(param) = statement.parameter_name(p) else {
            continue;
        };
        // remove trailing ":"
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
                    statement.raw_bind_parameter(p, number)?;
                } else if let Some(number) = number.as_i64() {
                    statement.raw_bind_parameter(p, number)?;
                }
            }
            serde_json::Value::String(s) => statement.raw_bind_parameter(p, s)?,
            serde_json::Value::Array(_) => statement.raw_bind_parameter(p, Null)?,
            serde_json::Value::Object(_) => statement.raw_bind_parameter(p, Null)?,
        };
    }
    let rows = statement.raw_query();
    let rows = rows.mapped(|row| {
        let mut object = serde_json::Map::<String, serde_json::Value>::new();
        for c in 0..row.column_count() {
            let value = row.get_ref(c)?;
            let name = row.column_name(c)?.to_string();
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

    use crate::{mock::MockDataInserts, query_json, test_db};

    use crate::{database_settings::DatabaseSettings, RepositoryError, StorageConnection};

    #[cfg(feature = "postgres")]
    pub fn query(
        connection: &StorageConnection,
        _settings: &DatabaseSettings,
        sql: &str,
        parameters: &serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, RepositoryError> {
        query_json(connection, sql, parameters)
    }

    #[cfg(not(feature = "postgres"))]
    pub fn query(
        _connection: &StorageConnection,
        settings: &DatabaseSettings,
        sql: &str,
        parameters: &serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, RepositoryError> {
        query_json(settings, sql, parameters)
    }

    #[actix_rt::test]
    async fn test_report_query() {
        let (_, connection, _, settings) = test_db::setup_all(
            "test_report_query",
            MockDataInserts::none().names().stores(),
        )
        .await;

        // query with no params
        let result = query(
            &connection,
            &settings,
            "SELECT id, code, logo FROM store LIMIT 1;", // test with trailing ";"
            &serde_json::Map::new(),
        )
        .unwrap();
        assert_eq!(
            &format!("{}", serde_json::to_string(&result).unwrap()),
            "[{\"code\":\"code\",\"id\":\"store_a\",\"logo\":null}]"
        );

        // simple params
        let result = query(
            &connection,
            &settings,
            "SELECT id, code FROM store WHERE code=$code LIMIT $limit", // test without trailing ";"
            &json!({
                "code": "code",
                "limit": 2,
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        assert_eq!(
            &format!("{}", serde_json::to_string(&result).unwrap()),
            "[{\"code\":\"code\",\"id\":\"store_a\"},{\"code\":\"code\",\"id\":\"store_b\"}]"
        );

        // multiple used params
        let result = query(
            &connection,
            &settings,
            "SELECT id, code FROM store WHERE id LIKE $b || '%' AND code LIKE $b || '%' LIMIT $a",
            &json!({
                "a": 5,
                "b": "name",
            })
            .as_object()
            .unwrap(),
        )
        .unwrap();

        assert_eq!(
            &format!("{}", serde_json::to_string(&result).unwrap()),
            "[{\"code\":\"name_store_code\",\"id\":\"name_store_id\"},{\"code\":\"name_store_code_a\",\"id\":\"name_store_a_id\"}]"
        );
    }
}

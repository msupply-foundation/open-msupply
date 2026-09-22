use boa_engine::*;
use repository::{query_read_only, SqlParameters};
use serde_json::Value;
use util::format_error;

use crate::boajs::{
    context::{use_boajs_connection, BoaJsContext},
    utils::*,
};

// sql(statement, params?)
//
// `params` is an object of named values, referenced from the statement as `$name`:
//
//     sql("SELECT id FROM store WHERE id = $storeId AND type IN $types",
//         { storeId, types: ['A', 'B'] })
//
// The statement takes the route a report's SQL takes (`repository::query_read_only`, the
// same two functions `ReportQueryExecutor` runs): read-only, `$name` parameters exactly as
// a report writes `$storeId`, rows keyed by column. A caller's value never reaches the text
// (#687). Left out, the statement runs exactly as written — what every bundle built before
// this argument existed expects.
//
// Registered with length 2 so a bundle can tell this host from one that ignores the second
// argument: `sql.length >= 2`. On the older host an unbound `$name` reads as NULL on sqlite
// and the statement quietly matches nothing, which is why `@common/utils` checks before it
// relies on the parameters.
//
// The statement is arbitrary text from a plugin bundle, so it runs read-only — the database
// refuses any write, rather than this trying to tell reads and writes apart by parsing.
// Plugins that need to persist something use the narrow `use_repository` API instead.
pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("sql"),
        2,
        NativeFunction::from_copy_closure(move |_, args, ctx| {
            let sql = get_string_argument(args, 0)?;
            let params = params_from_js(args.get(1), ctx)?;

            // When using BoaJsContext, it's best to use 'scope' see PluginContext for a link to testing repo
            let rows = use_boajs_connection(|connection| -> Result<Vec<Value>, JsError> {
                let service_provider = BoaJsContext::service_provider();
                query_read_only(
                    connection,
                    service_provider.connection_manager.database_url(),
                    &sql,
                    params.as_ref(),
                )
                // Names only, never values: a plugin's parameters carry patient ids, name
                // ids and dates, and this log is not the place for them.
                .inspect_err(|e| {
                    log::error!("{} {sql} {}", format_error(e), param_names(params.as_ref()))
                })
                .map_err(std_error_to_js_error)
            })
            .map_err(std_error_to_js_error)??;

            let rows = rows
                .into_iter()
                .map(unwrap_json_row)
                .collect::<Result<Vec<Value>, JsError>>()?;
            JsValue::from_json(&Value::Array(rows), ctx)
        }),
    )?;
    Ok(())
}

/// The parameter names, for an error log.
///
/// Only the names: the values are a caller's data and the log is not the place for them
/// (a plugin passes patient ids, name ids and dates through here). Knowing which names the
/// statement was given is what actually diagnoses a failure, since the errors this reports
/// are "Invalid parameter: x" and the engine's own complaints about a value's type.
fn param_names(params: Option<&SqlParameters>) -> String {
    match params {
        None => "(no parameters)".to_string(),
        Some(params) => format!(
            "({})",
            params
                .keys()
                .map(String::as_str)
                .collect::<Vec<_>>()
                .join(", ")
        ),
    }
}

/// The optional parameters object, as JSON.
///
/// Absent, `undefined` and `null` all mean "no parameters": the statement runs untouched,
/// which is what a bundle built before `sql()` took a second argument expects. Any object,
/// even an empty one, switches the `$name` contract on. Values are the scalars a report's
/// parameters are; `sqlQuery` in `@common/utils` renders a `Date` as `YYYY-MM-DD HH:MM:SS`
/// and expands an array into one `$name_N` per element before calling this.
fn params_from_js(
    arg: Option<&JsValue>,
    context: &mut Context,
) -> Result<Option<SqlParameters>, JsError> {
    let Some(arg) = arg else {
        return Ok(None);
    };
    if arg.is_null_or_undefined() {
        return Ok(None);
    }
    match arg.to_json(context)? {
        Some(Value::Object(params)) => Ok(Some(params)),
        _ => Err(string_to_js_error(
            "sql(): parameters must be an object of named values, e.g. { storeId }",
        )),
    }
}

/// Rows used to reach the host as one `json_row` column holding a JSON object, because the
/// host could only read that shape: every plugin wrapped its statement in
/// `SELECT json_object(...) AS json_row FROM (...)`. Rows now come back keyed by column, so
/// the wrapper is unnecessary — but a bundle that still sends it must get what it always
/// got, so a row that is exactly that one column is unwrapped. Sqlite hands the JSON over
/// as text; postgres's `row_to_json` nests it as an object already.
fn unwrap_json_row(row: Value) -> Result<Value, JsError> {
    let Value::Object(mut object) = row else {
        return Ok(row);
    };
    if object.len() != 1 || !object.contains_key("json_row") {
        return Ok(Value::Object(object));
    }
    match object.remove("json_row").expect("checked just above") {
        Value::String(text) => serde_json::from_str(&text).map_err(std_error_to_js_error),
        already_json => Ok(already_json),
    }
}

#[cfg(test)]
mod test {
    use actix_web::web::Data;
    use chrono::NaiveDate;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ActivityLogRow, ActivityLogRowRepository,
        ActivityLogType, UserAccountRow, UserAccountRowRepository,
    };
    use serde_json::json;

    use crate::{
        boajs::{
            call_method,
            context::BoaJsContext,
            utils::{ExecuteGraphQlError, ExecuteGraphql},
            BoaJsError,
        },
        service_provider::ServiceProvider,
    };

    // sql never calls graphql, but BoaJsContext::new requires an ExecuteGraphql impl to
    // bind the global context, so use a no-op stub.
    struct NoopGraphql;
    #[async_trait::async_trait]
    impl ExecuteGraphql for NoopGraphql {
        async fn execute_graphql(
            &self,
            _: &str,
            _: &str,
            _: serde_json::Value,
        ) -> Result<serde_json::Value, ExecuteGraphQlError> {
            unreachable!("sql does not use graphql")
        }
    }

    /// A minimal plugin bundle. `run` hands its input straight to `sql`, as a plugin
    /// would; `arity` is what `@common/utils` feature-detects on.
    const BUNDLE: &str = r#"
        export function run({ query, params }) { return sql(query, params); }
        export function one({ query }) { return sql(query); }
        export function arity() { return sql.length; }
    "#;

    async fn setup(name: &str) -> Data<ServiceProvider> {
        let (_, _, connection_manager, _) =
            setup_all(name, MockDataInserts::none().names().stores()).await;
        let service_provider = Data::new(ServiceProvider::new(connection_manager));
        // call_method reads the service provider from the global BoaJsContext.
        BoaJsContext::new(&service_provider, NoopGraphql).bind();
        service_provider
    }

    /// The wrapper every plugin used to have to write, kept working for bundles that still do.
    fn wrapped(fields: &[&str], statement: &str) -> String {
        let json_object = if cfg!(feature = "postgres") {
            "json_build_object"
        } else {
            "json_object"
        };
        let projection = fields
            .iter()
            .map(|field| format!("'{field}', inner_statement.{field}"))
            .collect::<Vec<_>>()
            .join(", ");
        format!(
            "SELECT {json_object}({projection}) AS json_row FROM ({statement}) AS inner_statement"
        )
    }

    fn call(export: &str, input: serde_json::Value) -> Result<serde_json::Value, BoaJsError> {
        call_method(input, vec![export], &BUNDLE.as_bytes().to_vec())
    }

    #[actix_rt::test]
    async fn sql_takes_a_value_as_data_and_returns_rows_keyed_by_column() {
        let service_provider = setup("boajs_sql_value_as_data").await;
        let connection = service_provider.connection().unwrap();
        UserAccountRowRepository::new(&connection)
            .insert_one(&UserAccountRow {
                id: "user-1".to_string(),
                username: "user-1".to_string(),
                hashed_password: "SECRET-HASH".to_string(),
                ..Default::default()
            })
            .unwrap();

        let query = "SELECT id, code FROM store WHERE id = $storeId";
        let rows = call(
            "run",
            json!({ "query": query, "params": { "storeId": "store_a" } }),
        )
        .unwrap();
        assert_eq!(rows, json!([{ "id": "store_a", "code": "code" }]));

        // Written into the text, this reads the password hashes; as a value, it is an id
        // nobody has
        let payload = "x' UNION SELECT hashed_password, 'x' FROM user_account --";
        let rows = call(
            "run",
            json!({ "query": query, "params": { "storeId": payload } }),
        )
        .unwrap();
        assert_eq!(rows, json!([]));

        // A list is the helper's business (`sqlQuery` expands it to one name per element):
        // the host takes the scalars a report's parameters are, and refuses an array by name
        let error = call(
            "run",
            json!({ "query": query, "params": { "storeId": ["a", "b"] } }),
        )
        .unwrap_err()
        .to_string();
        assert!(error.contains("storeId"), "{}", error);
    }

    /// Bundles built before `sql()` took parameters call it with one argument and wrap their
    /// statement in a `json_row` projection; both must keep giving exactly what they did.
    #[actix_rt::test]
    async fn sql_still_takes_a_wrapped_statement_alone_and_advertises_the_new_arity() {
        setup("boajs_sql_wrapped_statement_alone").await;

        let query = wrapped(&["id"], "SELECT id FROM store WHERE id = 'store_a'");
        let rows = call("one", json!({ "query": query })).unwrap();
        assert_eq!(rows, json!([{ "id": "store_a" }]));

        // null for the object means the same as leaving it out
        let rows = call("run", json!({ "query": query, "params": null })).unwrap();
        assert_eq!(rows, json!([{ "id": "store_a" }]));

        // and the wrapper with parameters is unwrapped too
        let query = wrapped(&["id"], "SELECT id FROM store WHERE id = $storeId");
        let rows = call(
            "run",
            json!({ "query": query, "params": { "storeId": "store_a" } }),
        )
        .unwrap();
        assert_eq!(rows, json!([{ "id": "store_a" }]));

        // What @common/utils checks to know this host takes parameters
        assert_eq!(call("arity", json!({})).unwrap(), json!(2));
    }

    /// A value keeps the typing a hand-written literal had: a JS number into LIMIT, a
    /// datetime string against a timestamp column, a date string against a date column.
    #[actix_rt::test]
    async fn sql_keeps_literal_typing() {
        let service_provider = setup("boajs_sql_literal_typing").await;
        let connection = service_provider.connection().unwrap();

        let query = "SELECT id FROM store ORDER BY id LIMIT $n";
        let rows = call("run", json!({ "query": query, "params": { "n": 1 } })).unwrap();
        assert_eq!(rows.as_array().map(Vec::len), Some(1), "{}", rows);

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

        let query = "SELECT id FROM activity_log WHERE datetime >= $at";
        let rows = call(
            "run",
            json!({ "query": query, "params": { "at": "2024-05-01 00:00:00" } }),
        )
        .unwrap();
        assert_eq!(rows, json!([{ "id": "log-1" }]));
        let rows = call(
            "run",
            json!({ "query": query, "params": { "at": "2024-05-02 00:00:00" } }),
        )
        .unwrap();
        assert_eq!(rows, json!([]));

        // store.created_date is a DATE column; mock store_a was created on 2020-01-01
        let query = "SELECT id FROM store WHERE id = 'store_a' AND created_date <= $on";
        let rows = call(
            "run",
            json!({ "query": query, "params": { "on": "2020-01-01" } }),
        )
        .unwrap();
        assert_eq!(rows, json!([{ "id": "store_a" }]));
    }

    /// A parameter the host cannot take, or a name the statement has no value for, is an
    /// error naming it — and it reaches the plugin as an ordinary JS error.
    #[actix_rt::test]
    async fn sql_refuses_what_it_cannot_take_by_name() {
        setup("boajs_sql_refuses_by_name").await;
        let query = "SELECT $a AS a, $b AS b";

        let refused = |input: serde_json::Value| call("run", input).unwrap_err().to_string();

        let error =
            refused(json!({ "query": query, "params": { "a": "fine", "b": { "nested": 1 } } }));
        assert!(error.contains("$b"), "{}", error);

        let error = refused(json!({ "query": query, "params": ["not", "an object"] }));
        assert!(error.contains("must be an object"), "{}", error);

        // A name in the statement with no value (the report path's own message)
        let error = refused(json!({ "query": query, "params": { "a": "only a" } }));
        assert!(error.contains("Invalid parameter: b"), "{}", error);

        // A positional placeholder is not a name (on postgres it is left alone and the engine
        // complains; sqlite treats it as a name nothing supplies)
        assert!(call(
            "run",
            json!({ "query": "SELECT $1 AS a", "params": { "a": 1 } })
        )
        .is_err());

        // A value with no name is fine: a report is handed every variable it might want
        let rows = call(
            "run",
            json!({
                "query": "SELECT id FROM store WHERE id = $a",
                "params": { "a": "store_a", "unused": 3 }
            }),
        )
        .unwrap();
        assert_eq!(rows, json!([{ "id": "store_a" }]));
    }
}

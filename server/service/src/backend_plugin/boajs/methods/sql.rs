use boa_engine::*;
use repository::{raw_query, JsonRawRow};

use crate::backend_plugin::{boajs::utils::*, plugin_provider::PluginContext};

// SQL method accepts first argument as SQL string
// TODO add the json row wrapper, so that consumer doesn't need to add "json_object" or "row_to_json"
// TODO check SQL is SELECT only with "sqlparser"
pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("sql"),
        0,
        NativeFunction::from_copy_closure(move |_, args, ctx| {
            // TODO Is this actually safe ? (need to check reference counts after plugin has run)
            let service_provider = PluginContext::service_provider();

            let sql = get_string_argument(args, 0)?;

            let connection = service_provider
                .connection()
                .map_err(std_error_to_js_error)?;
            let results = raw_query(&connection, sql);

            let as_json: Vec<serde_json::Value> = results
                .into_iter()
                .map(|JsonRawRow { json_row }| serde_json::from_str(&json_row))
                .collect::<Result<Vec<serde_json::Value>, _>>()
                .map_err(std_error_to_js_error)?;

            let value: serde_json::Value =
                serde_json::to_value(&as_json).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            Ok(JsValue::from_json(&value, ctx)?)
        }),
    )?;
    Ok(())
}

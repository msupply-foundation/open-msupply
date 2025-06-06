use boa_engine::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use util::constants::PLUGIN_USER_ID;

use crate::{boajs::context::BoaJsContext, boajs::utils::*};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub(crate) struct UseGraphqlInput {
    query: String,
    variables: serde_json::Value,
}

// TODO this method should accept user id, when call plugin is called it should accept this user id
// optional, defaulting to PLUGIN_USER_ID.
pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("use_graphql"),
        0,
        NativeFunction::from_copy_closure(move |_, args, mut ctx| {
            let UseGraphqlInput { query, variables } = get_serde_argument(&mut ctx, args, 0)?;
            let graphql = BoaJsContext::execute_graphql();
            let value = do_async_blocking(async move {
                graphql
                    .execute_graphql(PLUGIN_USER_ID, &query, variables)
                    .await
            })
            .map_err(std_error_to_js_error)?
            .map_err(std_error_to_js_error)?;

            // We return the moved variable as a `JsValue`.
            Ok(JsValue::from_json(&value, ctx)?)
        }),
    )?;
    Ok(())
}

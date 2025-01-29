use boa_engine::*;

// Sql type method will return either "postgres" or "sqlite" string
pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("sql_type"),
        0,
        NativeFunction::from_copy_closure(move |_, _, _| {
            let result = if cfg!(feature = "postgres") {
                js_string!("postgres")
            } else {
                js_string!("sqlite")
            };

            Ok(JsValue::String(result))
        }),
    )?;

    Ok(())
}

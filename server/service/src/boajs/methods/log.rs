use boa_engine::*;
use log::info;

// Log method will log all arguments
pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("log"),
        0,
        NativeFunction::from_copy_closure(move |_, args, _| {
            info!("from js {:#?}", args);
            Ok(JsValue::null())
        }),
    )?;

    Ok(())
}

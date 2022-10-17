use std::error::Error as StandardError;

/// Formats error for display, including sources using similar logic to anyhow::Error (debug)
/// ```
/// #[derive(thiserror::Error, Debug)]
/// #[error("e1 msg {msg}")]
/// struct E1 {
///     msg: String,
///     source: E2,
/// }
///
/// #[derive(thiserror::Error, Debug)]
/// enum E2 {
///     #[error("e2")]
///     E3(#[source] E3),
/// }
///
/// #[derive(thiserror::Error, Debug)]
/// enum E3 {
///     #[error("e3 {0}")]
///     Text(String),
/// }
///
/// let err = E1 {
///     msg: "e1msg".to_string(),
///     source: E2::E3(E3::Text("e3msg".to_string())),
/// };
/// let result =
/// r#"e1 msg e1msg -> [
///     "e2",
///     "e3 e3msg",
/// ]"#;
/// assert_eq!(util::format_error(&err), result)
/// ```

pub fn format_error(error: &impl StandardError) -> String {
    let mut sources = Vec::new();
    let mut current: &dyn StandardError = error;
    while let Some(next) = current.source() {
        sources.push(format!("{}", next));
        current = next;
    }

    if sources.is_empty() {
        format!("{}", error)
    } else {
        format!("{} -> {:#?}", error, sources)
    }
}

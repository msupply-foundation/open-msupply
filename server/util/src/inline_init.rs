/// ```
/// # use util::inline_init;
///
///  #[derive(Default, Debug, PartialEq)]
/// struct Check {
///   id: String,
///   description: String
/// }
///
/// assert_eq!(
///     inline_init(|input: &mut Check| input.id = "id1".to_string()),
///     Check {
///         id: "id1".to_string(),
///         description: "".to_string()
///     }
/// );
/// ```
pub fn inline_init<T, F>(mut f: F) -> T
where
    T: Default,
    F: FnMut(&mut T) -> (),
{
    let mut t = T::default();
    f(&mut t);
    t
}

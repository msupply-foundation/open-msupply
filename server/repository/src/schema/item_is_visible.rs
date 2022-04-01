#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default)]
pub struct ItemIsVisibleRow {
    pub id: String,
    pub is_visible: bool,
}

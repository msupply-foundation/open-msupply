#[derive(Clone, Queryable, Debug, PartialEq, Eq)]
pub struct ItemIsVisibleRow {
    pub id: String,
    pub is_visible: bool,
}

use super::diesel_schema::master_list_line;

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "master_list_line"]
pub struct MasterListLineRow {
    pub id: String,
    pub item_id: String,
    pub master_list_id: String,
}

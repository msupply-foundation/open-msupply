use super::ancillary_item_row::{ancillary_item, AncillaryItemRow};
use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    Pagination, StorageConnection,
};
use diesel::{dsl::IntoBoxed, prelude::*};
use std::collections::{HashMap, HashSet, VecDeque};
use thiserror::Error;

/// Maximum depth of an ancillary item chain (in edges). A chain longer than this
/// is rejected at insert/update time so that traversal at order time can rely on
/// a small bound without expensive cycle checks.
pub const MAX_ANCILLARY_ITEM_DEPTH: u32 = 5;

#[derive(Clone, Default)]
pub struct AncillaryItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_link_id: Option<EqualFilter<String>>,
    pub ancillary_item_link_id: Option<EqualFilter<String>>,
    pub item_or_ancillary_link_id: Option<String>,
}

impl AncillaryItemFilter {
    pub fn new() -> AncillaryItemFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn item_link_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_link_id = Some(filter);
        self
    }
    pub fn ancillary_item_link_id(mut self, filter: EqualFilter<String>) -> Self {
        self.ancillary_item_link_id = Some(filter);
        self
    }
    pub fn item_or_ancillary_link_id(mut self, id: String) -> Self {
        self.item_or_ancillary_link_id = Some(id);
        self
    }
}

pub struct AncillaryItemRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AncillaryItemRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AncillaryItemRepository { connection }
    }

    pub fn count(&self, filter: Option<AncillaryItemFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: AncillaryItemFilter,
    ) -> Result<Option<AncillaryItemRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AncillaryItemFilter,
    ) -> Result<Vec<AncillaryItemRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AncillaryItemFilter>,
    ) -> Result<Vec<AncillaryItemRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        let result = final_query.load::<AncillaryItemRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedAncillaryItemQuery = IntoBoxed<'static, ancillary_item::table, DBType>;

fn create_filtered_query(filter: Option<AncillaryItemFilter>) -> BoxedAncillaryItemQuery {
    let mut query = ancillary_item::table.into_boxed();

    // Exclude any deleted items
    query = query.filter(ancillary_item::deleted_datetime.is_null());

    if let Some(f) = filter {
        let AncillaryItemFilter {
            id,
            item_link_id,
            ancillary_item_link_id,
            item_or_ancillary_link_id,
        } = f;

        if let Some(record_id) = item_or_ancillary_link_id {
            query = query.filter(
                ancillary_item::item_link_id
                    .eq(record_id.clone())
                    .or(ancillary_item::ancillary_item_link_id.eq(record_id)),
            );
        }

        apply_equal_filter!(query, id, ancillary_item::id);
        apply_equal_filter!(query, item_link_id, ancillary_item::item_link_id);
        apply_equal_filter!(
            query,
            ancillary_item_link_id,
            ancillary_item::ancillary_item_link_id
        );
    }

    query
}

#[derive(Debug, Error, PartialEq)]
pub enum AncillaryItemValidationError {
    #[error("ancillary item cannot link an item to itself")]
    SelfLink,
    #[error("ancillary item link would create a cycle")]
    Cycle,
    #[error("ancillary item link would exceed max depth of {max} (would be {actual})")]
    DepthExceeded { max: u32, actual: u32 },
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

/// Validate that adding/updating an ancillary item link from `item_link_id` to
/// `ancillary_item_link_id` will not create a cycle or exceed [`MAX_ANCILLARY_ITEM_DEPTH`].
///
/// `excluding_id` should be `Some(row_id)` when validating an update, so the row being
/// replaced is excluded from the existing graph.
pub fn validate_ancillary_item_link(
    connection: &StorageConnection,
    item_link_id: &str,
    ancillary_item_link_id: &str,
    excluding_id: Option<&str>,
) -> Result<(), AncillaryItemValidationError> {
    if item_link_id == ancillary_item_link_id {
        return Err(AncillaryItemValidationError::SelfLink);
    }

    let edges = AncillaryItemRepository::new(connection).query_by_filter(AncillaryItemFilter::new())?;

    // Build adjacency maps, skipping the row being updated (if any)
    let mut forward: HashMap<String, Vec<String>> = HashMap::new();
    let mut backward: HashMap<String, Vec<String>> = HashMap::new();
    for edge in edges {
        if Some(edge.id.as_str()) == excluding_id {
            continue;
        }
        forward
            .entry(edge.item_link_id.clone())
            .or_default()
            .push(edge.ancillary_item_link_id.clone());
        backward
            .entry(edge.ancillary_item_link_id.clone())
            .or_default()
            .push(edge.item_link_id.clone());
    }

    // Cycle: from the new ancillary node, can we reach back to the principal?
    if reachable(&forward, ancillary_item_link_id, item_link_id) {
        return Err(AncillaryItemValidationError::Cycle);
    }

    // Depth: longest chain through the new edge
    let forward_depth = longest_path_from(&forward, ancillary_item_link_id);
    let backward_depth = longest_path_from(&backward, item_link_id);
    let total = forward_depth + 1 + backward_depth;
    if total > MAX_ANCILLARY_ITEM_DEPTH {
        return Err(AncillaryItemValidationError::DepthExceeded {
            max: MAX_ANCILLARY_ITEM_DEPTH,
            actual: total,
        });
    }

    Ok(())
}

fn reachable(adj: &HashMap<String, Vec<String>>, from: &str, target: &str) -> bool {
    let mut visited: HashSet<&str> = HashSet::new();
    let mut queue: VecDeque<&str> = VecDeque::new();
    queue.push_back(from);
    visited.insert(from);
    while let Some(node) = queue.pop_front() {
        if node == target {
            return true;
        }
        if let Some(neighbours) = adj.get(node) {
            for n in neighbours {
                if visited.insert(n.as_str()) {
                    queue.push_back(n.as_str());
                }
            }
        }
    }
    false
}

/// Length of the longest simple path starting at `from` in `adj` (in edges).
/// Uses DFS with a visited set, which is safe given existing data is acyclic
/// (validated on every insert) and bounded in size.
fn longest_path_from(adj: &HashMap<String, Vec<String>>, from: &str) -> u32 {
    fn dfs<'a>(
        adj: &'a HashMap<String, Vec<String>>,
        node: &'a str,
        visited: &mut HashSet<&'a str>,
    ) -> u32 {
        let mut best = 0;
        if let Some(neighbours) = adj.get(node) {
            for n in neighbours {
                if visited.insert(n.as_str()) {
                    let depth = 1 + dfs(adj, n.as_str(), visited);
                    if depth > best {
                        best = depth;
                    }
                    visited.remove(n.as_str());
                }
            }
        }
        best
    }

    let mut visited: HashSet<&str> = HashSet::new();
    visited.insert(from);
    dfs(adj, from, &mut visited)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        ancillary_item_row::{AncillaryItemRow, AncillaryItemRowRepository},
        mock::MockDataInserts,
        test_db, ItemRow, ItemRowRepository,
    };

    async fn setup(name: &str) -> StorageConnection {
        let (_, connection, _, _) = test_db::setup_all(name, MockDataInserts::none()).await;
        connection
    }

    /// Creates an item with the given id; `ItemRowRepository::upsert_one` also
    /// inserts a matching `item_link` row with the same id, so callers can use the
    /// id directly as an `item_link_id`.
    fn make_link(connection: &StorageConnection, id: &str) {
        ItemRowRepository::new(connection)
            .upsert_one(&ItemRow {
                id: id.to_string(),
                name: id.to_string(),
                ..Default::default()
            })
            .unwrap();
    }

    fn insert_edge(connection: &StorageConnection, id: &str, principal: &str, ancillary: &str) {
        AncillaryItemRowRepository::new(connection)
            .upsert_one(&AncillaryItemRow {
                id: id.to_string(),
                item_link_id: principal.to_string(),
                ancillary_item_link_id: ancillary.to_string(),
                item_quantity: 1.0,
                ancillary_quantity: 1.0,
                deleted_datetime: None,
            })
            .unwrap();
    }

    #[actix_rt::test]
    async fn test_ancillary_item_query_repository() {
        let connection = setup("test_ancillary_item_query_repository").await;
        for id in ["a", "b"] {
            make_link(&connection, id);
        }

        insert_edge(&connection, "row1", "a", "b");

        let row = AncillaryItemRepository::new(&connection)
            .query_one(AncillaryItemFilter::new().id(EqualFilter::equal_to("row1".to_string())))
            .unwrap()
            .unwrap();
        assert_eq!(row.item_link_id, "a");
        assert_eq!(row.ancillary_item_link_id, "b");

        let row = AncillaryItemRepository::new(&connection)
            .query_one(AncillaryItemFilter::new().item_or_ancillary_link_id("b".to_string()))
            .unwrap()
            .unwrap();
        assert_eq!(row.id, "row1");

        // Soft-deleted rows are excluded
        AncillaryItemRowRepository::new(&connection)
            .mark_deleted("row1")
            .unwrap();
        assert_eq!(
            AncillaryItemRepository::new(&connection)
                .count(None)
                .unwrap(),
            0
        );
    }

    #[actix_rt::test]
    async fn test_validate_self_link() {
        let connection = setup("test_validate_self_link").await;
        make_link(&connection, "a");

        assert_eq!(
            validate_ancillary_item_link(&connection, "a", "a", None),
            Err(AncillaryItemValidationError::SelfLink)
        );
    }

    #[actix_rt::test]
    async fn test_validate_direct_cycle() {
        // A -> B already exists; trying to add B -> A should fail
        let connection = setup("test_validate_direct_cycle").await;
        for id in ["a", "b"] {
            make_link(&connection, id);
        }
        insert_edge(&connection, "ab", "a", "b");

        assert_eq!(
            validate_ancillary_item_link(&connection, "b", "a", None),
            Err(AncillaryItemValidationError::Cycle)
        );
    }

    #[actix_rt::test]
    async fn test_validate_indirect_cycle() {
        // A -> B -> C exists; adding C -> A should fail
        let connection = setup("test_validate_indirect_cycle").await;
        for id in ["a", "b", "c"] {
            make_link(&connection, id);
        }
        insert_edge(&connection, "ab", "a", "b");
        insert_edge(&connection, "bc", "b", "c");

        assert_eq!(
            validate_ancillary_item_link(&connection, "c", "a", None),
            Err(AncillaryItemValidationError::Cycle)
        );
    }

    #[actix_rt::test]
    async fn test_validate_depth_5_boundary() {
        // Build chain A -> B -> C -> D -> E (4 edges), then validate E -> F
        // which is the 5th edge — at the boundary, allowed.
        let connection = setup("test_validate_depth_5_boundary").await;
        for id in ["a", "b", "c", "d", "e", "f", "g"] {
            make_link(&connection, id);
        }
        insert_edge(&connection, "ab", "a", "b");
        insert_edge(&connection, "bc", "b", "c");
        insert_edge(&connection, "cd", "c", "d");
        insert_edge(&connection, "de", "d", "e");

        // Adding the 5th edge is allowed
        assert_eq!(
            validate_ancillary_item_link(&connection, "e", "f", None),
            Ok(())
        );
        insert_edge(&connection, "ef", "e", "f");

        // Adding a 6th edge to extend the chain is rejected
        assert!(matches!(
            validate_ancillary_item_link(&connection, "f", "g", None),
            Err(AncillaryItemValidationError::DepthExceeded { max: 5, actual: 6 })
        ));
    }

    #[actix_rt::test]
    async fn test_validate_depth_through_middle() {
        // A -> B -> C and D -> E exist. Adding C -> D would yield A -> B -> C -> D -> E
        // — a chain of 4 edges, which is still allowed.
        let connection = setup("test_validate_depth_through_middle").await;
        for id in ["a", "b", "c", "d", "e"] {
            make_link(&connection, id);
        }
        insert_edge(&connection, "ab", "a", "b");
        insert_edge(&connection, "bc", "b", "c");
        insert_edge(&connection, "de", "d", "e");

        assert_eq!(
            validate_ancillary_item_link(&connection, "c", "d", None),
            Ok(())
        );
    }

    #[actix_rt::test]
    async fn test_validate_update_excludes_self() {
        // A -> B exists with id "ab". Updating "ab" to A -> B again should not see itself
        // as creating a cycle.
        let connection = setup("test_validate_update_excludes_self").await;
        for id in ["a", "b"] {
            make_link(&connection, id);
        }
        insert_edge(&connection, "ab", "a", "b");

        assert_eq!(
            validate_ancillary_item_link(&connection, "a", "b", Some("ab")),
            Ok(())
        );
    }
}

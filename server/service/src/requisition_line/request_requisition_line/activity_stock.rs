use repository::{
    EqualFilter, RepositoryError, StockOnHandFilter, StockOnHandRepository, StorageConnection,
};

/// The available stock on hand a request line carries when it is held for `campaign_id`.
///
/// An activity RE-SCOPES what counts as available: stock held for a campaign is not
/// available to routine immunisation, so a line held for one counts only that campaign's
/// stock (issue 595). Held for nothing in particular — `None` — the line counts the whole
/// store, exactly as it always did.
///
/// Shared by the line update and the editor's forecast preview, so the figure the editor
/// SHOWS for a draft activity is the figure saving it stores. A campaign holding none of
/// the item sums to 0, and the whole-store view omits an item with no stock at all, so a
/// missing row is 0 too — both the honest answer, not an error.
pub fn activity_stock_on_hand(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
    campaign_id: Option<&str>,
) -> Result<f64, RepositoryError> {
    let Some(campaign_id) = campaign_id else {
        return Ok(StockOnHandRepository::new(connection)
            .query_one(
                StockOnHandFilter::new()
                    .store_id(EqualFilter::equal_to(store_id.to_string()))
                    .item_id(EqualFilter::equal_to(item_id.to_string())),
            )?
            .map(|row| row.available_stock_on_hand)
            .unwrap_or(0.0));
    };

    StockOnHandRepository::new(connection).campaign_query_one(store_id, item_id, campaign_id)
}

//! Spike (count option C): process-wide in-memory cache of invoice list counts.
//!
//! Counts are keyed by the `Debug` rendering of the `InvoiceFilter` (counts depend only on the
//! filter — never on sort or pagination). Any invoice row write clears the whole cache, so a
//! cached count is always exact: a cold filter pays one full COUNT, every later request is a
//! map lookup until the next invoice insert/update/delete.
//!
//! Trade-offs (for the production evaluation): per-process only — horizontally scaled servers
//! or writes that bypass `InvoiceRowRepository` (raw SQL, restores) would serve stale counts
//! until the next write clears the cache on that process. Sync writes invoices frequently on a
//! busy central server, so the hit rate under continuous sync also needs measuring.

use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

use super::invoice::InvoiceFilter;

static CACHE: LazyLock<Mutex<HashMap<String, i64>>> = LazyLock::new(Default::default);

fn key(filter: &Option<InvoiceFilter>) -> String {
    format!("{:?}", filter)
}

pub fn get(filter: &Option<InvoiceFilter>) -> Option<i64> {
    CACHE.lock().unwrap().get(&key(filter)).copied()
}

pub fn insert(filter: &Option<InvoiceFilter>, count: i64) {
    CACHE.lock().unwrap().insert(key(filter), count);
}

/// Called from every invoice row write path.
pub fn clear() {
    CACHE.lock().unwrap().clear();
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::EqualFilter;

    #[test]
    fn cache_round_trip_and_clear() {
        let filter_a = Some(InvoiceFilter {
            store_id: Some(EqualFilter::equal_to("store_a".to_string())),
            ..Default::default()
        });
        let filter_b = Some(InvoiceFilter {
            store_id: Some(EqualFilter::equal_to("store_b".to_string())),
            ..Default::default()
        });

        insert(&filter_a, 42);
        assert_eq!(get(&filter_a), Some(42));
        assert_eq!(get(&filter_b), None, "different filters must not collide");

        clear();
        assert_eq!(get(&filter_a), None);
    }
}

use std::collections::HashMap;

/// A row a `KeyedLookup` can hold.
pub trait Keyed {
    fn id(&self) -> &str;
    /// What the row is looked up by besides its id, such as a code or name.
    fn key(&self) -> &str;
    /// Keys that normalise alike are the same key. Surrounding spaces, which legacy data can
    /// have, never count; letter case does, as in the database, unless a row says otherwise.
    fn normalise(key: &str) -> String {
        key.trim().to_string()
    }
}

/// Saved rows in memory, so a run of writes reads the table once. The writes keep it current.
pub struct KeyedLookup<R> {
    by_id: HashMap<String, R>,
    ids_by_key: HashMap<String, Vec<String>>,
}

impl<R: Keyed> KeyedLookup<R> {
    pub fn from_rows(rows: Vec<R>) -> Self {
        let mut lookup = Self {
            by_id: HashMap::new(),
            ids_by_key: HashMap::new(),
        };
        for row in rows {
            lookup.put(row);
        }
        lookup
    }

    pub fn by_id(&self, id: &str) -> Option<&R> {
        self.by_id.get(id)
    }

    /// As `R::normalise` matches keys.
    pub fn by_key(&self, key: &str) -> Vec<&R> {
        self.ids_by_key
            .get(&R::normalise(key))
            .into_iter()
            .flatten()
            .filter_map(|id| self.by_id.get(id))
            .collect()
    }

    /// Another row with `row`'s key, when saving `row` brings the clash in. A clash already saved
    /// isn't one, so existing duplicates stay editable.
    pub fn taken_by(&self, row: &R) -> Option<&R> {
        let brings_in_clash = self
            .by_id(row.id())
            .is_none_or(|saved| R::normalise(saved.key()) != R::normalise(row.key()));
        if !brings_in_clash {
            return None;
        }
        self.by_key(row.key())
            .into_iter()
            .find(|other| other.id() != row.id())
    }

    pub fn put(&mut self, row: R) {
        self.remove(row.id());
        self.ids_by_key
            .entry(R::normalise(row.key()))
            .or_default()
            .push(row.id().to_string());
        self.by_id.insert(row.id().to_string(), row);
    }

    pub fn remove(&mut self, id: &str) {
        let Some(old) = self.by_id.remove(id) else {
            return;
        };
        let key = R::normalise(old.key());
        if let Some(ids) = self.ids_by_key.get_mut(&key) {
            ids.retain(|other| other != id);
            if ids.is_empty() {
                self.ids_by_key.remove(&key);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Row(&'static str, &'static str);

    impl Keyed for Row {
        fn id(&self) -> &str {
            self.0
        }
        fn key(&self) -> &str {
            self.1
        }
    }

    fn ids(lookup: &KeyedLookup<Row>, key: &str) -> Vec<&'static str> {
        lookup.by_key(key).into_iter().map(|row| row.0).collect()
    }

    #[test]
    fn follows_a_key_change() {
        let mut lookup = KeyedLookup::from_rows(vec![Row("a", "Tab"), Row("b", "Tab")]);
        lookup.put(Row("a", "Tablet"));
        assert_eq!(ids(&lookup, "Tab"), vec!["b"]);
        assert_eq!(ids(&lookup, "Tablet"), vec!["a"]);
        // Saving it unchanged doesn't list it twice.
        lookup.put(Row("a", "Tablet"));
        assert_eq!(ids(&lookup, "Tablet"), vec!["a"]);
    }

    #[test]
    fn ignores_spaces_around_a_key() {
        let mut lookup = KeyedLookup::from_rows(vec![Row("a", "Tab ")]);
        assert_eq!(ids(&lookup, "Tab"), vec!["a"]);
        assert_eq!(ids(&lookup, " Tab"), vec!["a"]);
        // Trimming the saved key doesn't list it twice.
        lookup.put(Row("a", "Tab"));
        assert_eq!(ids(&lookup, "Tab"), vec!["a"]);
        // Letter case counts.
        assert!(ids(&lookup, "TAB").is_empty());
    }

    struct AnyCase(&'static str, &'static str);

    impl Keyed for AnyCase {
        fn id(&self) -> &str {
            self.0
        }
        fn key(&self) -> &str {
            self.1
        }
        fn normalise(key: &str) -> String {
            key.trim().to_lowercase()
        }
    }

    #[test]
    fn a_row_can_match_keys_in_any_case() {
        let lookup = KeyedLookup::from_rows(vec![AnyCase("a", "Anna")]);
        let found: Vec<_> = lookup
            .by_key(" ANNA ")
            .into_iter()
            .map(|row| row.0)
            .collect();
        assert_eq!(found, vec!["a"]);
        // Its own key in another case is no clash; another row's is.
        assert!(lookup.taken_by(&AnyCase("a", "anna")).is_none());
        assert_eq!(
            lookup.taken_by(&AnyCase("b", "anna")).map(|row| row.0),
            Some("a")
        );
    }

    #[test]
    fn forgets_a_removed_row() {
        let mut lookup = KeyedLookup::from_rows(vec![Row("a", "Tab")]);
        lookup.remove("a");
        assert!(ids(&lookup, "Tab").is_empty());
        assert!(lookup.by_id("a").is_none());
        assert!(lookup.ids_by_key.is_empty());
    }
}

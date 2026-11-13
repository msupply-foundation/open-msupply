use std::collections::HashMap;

/// A row a `KeyedLookup` can hold.
pub trait Keyed {
    fn id(&self) -> &str;
    /// What the row is looked up by besides its id, such as a code or name.
    fn key(&self) -> &str;
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

    /// Letter case counts, as in the database; surrounding spaces, which legacy data can have,
    /// don't.
    pub fn by_key(&self, key: &str) -> Vec<&R> {
        self.ids_by_key
            .get(key.trim())
            .into_iter()
            .flatten()
            .filter_map(|id| self.by_id.get(id))
            .collect()
    }

    pub fn put(&mut self, row: R) {
        self.remove(row.id());
        self.ids_by_key
            .entry(row.key().trim().to_string())
            .or_default()
            .push(row.id().to_string());
        self.by_id.insert(row.id().to_string(), row);
    }

    pub fn remove(&mut self, id: &str) {
        if let Some(old) = self.by_id.remove(id)
            && let Some(ids) = self.ids_by_key.get_mut(old.key().trim())
        {
            ids.retain(|other| other != id);
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

    #[test]
    fn forgets_a_removed_row() {
        let mut lookup = KeyedLookup::from_rows(vec![Row("a", "Tab")]);
        lookup.remove("a");
        assert!(ids(&lookup, "Tab").is_empty());
        assert!(lookup.by_id("a").is_none());
    }
}

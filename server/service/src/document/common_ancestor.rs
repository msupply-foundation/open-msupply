use std::collections::{HashMap, HashSet};

use repository::AncestorDetail;

#[derive(Debug)]
pub enum CommonAncestorError {
    NoCommonAncestorFound,
    /// History data is corrupted and ids couldn't be found
    InvalidAncestorData,
}

/// Abstract away how details are retrieved from the underlying storage
pub trait AncestorDB {
    fn get_details(&self, id: &str) -> Option<AncestorDetail>;
}

/// Keep all ancestors loaded in memory
pub struct InMemoryAncestorDB {
    map: HashMap<String, AncestorDetail>,
}

impl InMemoryAncestorDB {
    pub fn new() -> Self {
        InMemoryAncestorDB {
            map: HashMap::new(),
        }
    }

    pub fn insert(&mut self, items: &Vec<AncestorDetail>) {
        for item in items {
            self.map.insert(item.id.clone(), item.clone());
        }
    }
}

impl AncestorDB for InMemoryAncestorDB {
    fn get_details(&self, id: &str) -> Option<AncestorDetail> {
        self.map.get(id).map(|v| v.clone())
    }
}

pub fn common_ancestors<T: AncestorDB>(
    db: &T,
    v1: &str,
    v2: &str,
) -> Result<String, CommonAncestorError> {
    // collect all parents reachable from v1
    let mut v1_ancestors = HashSet::<String>::new();
    let mut v1_queue = Vec::<String>::new();
    v1_queue.push(String::from(v1));
    while let Some(candidate) = v1_queue.pop() {
        if v1_ancestors.insert(candidate.to_owned()) == false {
            continue;
        }
        let detail = db
            .get_details(&candidate)
            .ok_or(CommonAncestorError::InvalidAncestorData)?;
        for parent in detail.parent_ids {
            v1_queue.push(parent);
        }
    }

    // follow v2 and find latest common ancestor

    // just to keep track of already handled branches
    let mut v2_ancestors = HashSet::<String>::new();
    // use AncestorDetail here to be able to sort by latest timestamp
    let mut v2_queue = Vec::<AncestorDetail>::new();
    let detail = db
        .get_details(&v2)
        .ok_or(CommonAncestorError::InvalidAncestorData)?;
    v2_queue.push(detail);
    while let Some(candidate) = v2_queue.pop() {
        if v1_ancestors.contains(&candidate.id) {
            return Ok(candidate.id);
        }
        if v2_ancestors.insert(candidate.id) == false {
            continue;
        }

        for parent in candidate.parent_ids {
            let detail = db
                .get_details(&parent)
                .ok_or(CommonAncestorError::InvalidAncestorData)?;
            v2_queue.push(detail);
        }
        // sort so that most recent items get tested first
        v2_queue.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    }

    Err(CommonAncestorError::NoCommonAncestorFound)
}

#[cfg(test)]
mod common_ancestor_test {
    use chrono::NaiveDateTime;
    use repository::AncestorDetail;

    use crate::document::common_ancestor::{common_ancestors, InMemoryAncestorDB};

    #[test]
    fn test_simple() {
        let local = vec![
            AncestorDetail {
                id: "a0".to_owned(),
                parent_ids: vec![],
                timestamp: NaiveDateTime::from_timestamp(1, 0),
            },
            AncestorDetail {
                id: "a1".to_owned(),
                parent_ids: vec!["a0".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(2, 0),
            },
        ];
        let remote = vec![
            AncestorDetail {
                id: "a0".to_owned(),
                parent_ids: vec![],
                timestamp: NaiveDateTime::from_timestamp(1, 0),
            },
            AncestorDetail {
                id: "b0".to_owned(),
                parent_ids: vec!["a0".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(3, 0),
            },
            AncestorDetail {
                id: "b1".to_owned(),
                parent_ids: vec!["b0".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(3, 0),
            },
        ];

        let mut db = InMemoryAncestorDB::new();
        db.insert(&local);
        db.insert(&remote);

        let result = common_ancestors(&db, "b1", "a1");
        assert_eq!(result.unwrap(), "a0");
    }

    #[test]
    fn test_complex_ancestor() {
        let local = vec![
            AncestorDetail {
                id: "a00".to_owned(),
                parent_ids: vec![],
                timestamp: NaiveDateTime::from_timestamp(1, 0),
            },
            AncestorDetail {
                id: "a0".to_owned(),
                parent_ids: vec!["a00".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(2, 0),
            },
            AncestorDetail {
                id: "a1".to_owned(),
                parent_ids: vec!["a0".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(3, 0),
            },
            AncestorDetail {
                id: "a2".to_owned(),
                parent_ids: vec!["a1".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(4, 0),
            },
            AncestorDetail {
                id: "a3".to_owned(),
                parent_ids: vec!["a2".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(5, 0),
            },
            AncestorDetail {
                id: "a4".to_owned(),
                parent_ids: vec!["a3".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(6, 0),
            },
            AncestorDetail {
                id: "b0".to_owned(),
                parent_ids: vec!["a1".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(30, 0),
            },
            AncestorDetail {
                id: "b1".to_owned(),
                parent_ids: vec!["b0".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(31, 0),
            },
            AncestorDetail {
                id: "b2".to_owned(),
                parent_ids: vec!["b1".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(32, 0),
            },
            AncestorDetail {
                id: "b3".to_owned(),
                parent_ids: vec!["a4".to_owned(), "b2".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(33, 0),
            },
        ];

        let remote = vec![
            AncestorDetail {
                id: "a00".to_owned(),
                parent_ids: vec![],
                timestamp: NaiveDateTime::from_timestamp(1, 0),
            },
            AncestorDetail {
                id: "a0".to_owned(),
                parent_ids: vec!["a00".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(2, 0),
            },
            AncestorDetail {
                id: "a1".to_owned(),
                parent_ids: vec!["a0".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(3, 0),
            },
            AncestorDetail {
                id: "a2".to_owned(),
                parent_ids: vec!["a1".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(4, 0),
            },
            AncestorDetail {
                id: "a3".to_owned(),
                parent_ids: vec!["a2".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(5, 0),
            },
            AncestorDetail {
                id: "a4".to_owned(),
                parent_ids: vec!["a3".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(6, 0),
            },
            AncestorDetail {
                id: "a5".to_owned(),
                parent_ids: vec!["a4".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(7, 0),
            },
            AncestorDetail {
                id: "a6".to_owned(),
                parent_ids: vec!["a4".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(8, 0),
            },
            AncestorDetail {
                id: "a7".to_owned(),
                parent_ids: vec!["a5".to_owned(), "a6".to_owned()],
                timestamp: NaiveDateTime::from_timestamp(9, 0),
            },
        ];

        let mut db = InMemoryAncestorDB::new();
        db.insert(&local);
        db.insert(&remote);

        let result = common_ancestors(&db, "b3", "a7");
        assert_eq!(result.unwrap(), "a4");
    }
}

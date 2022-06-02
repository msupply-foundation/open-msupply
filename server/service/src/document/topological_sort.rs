use std::collections::{HashMap, VecDeque};

use repository::Document;

pub trait TopoSortable {
    fn id(&self) -> &String;
    fn parents(&self) -> &Vec<String>;
}

impl TopoSortable for Document {
    fn id(&self) -> &String {
        &self.id
    }

    fn parents(&self) -> &Vec<String> {
        &self.parents
    }
}

/// Only returns items that are reachable from head
pub fn extract_tree<T: TopoSortable>(
    head: String,
    items: Vec<T>,
) -> Result<HashMap<String, T>, String> {
    let mut items: HashMap<String, T> = items
        .into_iter()
        .map(|item| (item.id().to_owned(), item))
        .collect();

    let mut queue: Vec<String> = vec![head];
    let mut output: HashMap<String, T> = HashMap::new();
    while let Some(id) = queue.pop() {
        match items.remove(&id) {
            Some(item) => {
                for parent in item.parents() {
                    queue.push(parent.to_string());
                }
                output.insert(id, item);
            }
            None => {
                // ok if we already encountered this item
                if !output.contains_key(&id) {
                    return Err(format!("Missing item: {}", id));
                }
            }
        };
    }

    Ok(output)
}

pub fn topo_sort<T: TopoSortable>(mut items: HashMap<String, T>) -> Result<Vec<T>, String> {
    if items.is_empty() {
        return Ok(items.into_iter().map(|(_, v)| v).collect());
    }

    // count how many ancestors referring a vertex
    let mut ancestors: HashMap<String, u32> = HashMap::new();
    // make sure all items are in the ancestors list
    for item in items.values() {
        ancestors.entry(item.id().to_owned()).or_insert(0);
    }
    for item in items.values() {
        for parent in item.parents() {
            let entry = ancestors
                .get_mut(parent)
                .ok_or("Graph contains invalid parents".to_string())?;
            *entry += 1;
        }
    }

    let mut queue: VecDeque<String> = ancestors
        .iter()
        .filter(|(_, v)| **v == 0)
        .map(|(k, _)| k.to_owned())
        .collect();
    if queue.is_empty() {
        return Err("Graph has cycle".to_string());
    }
    let mut result: Vec<T> = Vec::new();
    while let Some(head) = queue.pop_front() {
        let head_item = items.remove(&head).ok_or("Bug 0".to_string())?;

        // Go through the parents and remove references in the ancestors map.
        // If ancestors entry reaches 0; remove it from the map an add it to the queue.
        for parent in head_item.parents() {
            let entry = ancestors.get_mut(parent).ok_or("Bug 1".to_string())?;
            *entry -= 1;
            if *entry == 0 {
                queue.push_back(parent.to_owned());
                ancestors.remove(parent);
            }
        }

        result.push(head_item);
    }

    Ok(result)
}

#[cfg(test)]
mod topo_sort_test {

    use super::*;

    #[derive(Debug)]
    struct TestItem {
        id: String,
        parents: Vec<String>,
    }

    impl TopoSortable for TestItem {
        fn id(&self) -> &String {
            &self.id
        }

        fn parents(&self) -> &Vec<String> {
            &self.parents
        }
    }

    fn assert_entries(expected: Vec<String>, actual: HashMap<String, TestItem>) {
        assert_eq!(expected.len(), actual.len());
        for item in expected {
            assert!(actual.contains_key(&item));
        }
    }

    #[test]
    fn test_extract_tree() {
        // simple extract
        let items = vec![
            TestItem {
                id: "h".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "p0".to_string(),
                parents: vec!["p1".to_string()],
            },
            TestItem {
                id: "p1".to_string(),
                parents: vec![],
            },
        ];
        let result = extract_tree("h".to_string(), items).unwrap();
        assert_entries(
            vec!["h".to_string(), "p0".to_string(), "p1".to_string()],
            result,
        );

        // containing invalid parent
        let items = vec![
            TestItem {
                id: "h".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "p0".to_string(),
                parents: vec!["p1".to_string()],
            },
            TestItem {
                id: "p1".to_string(),
                parents: vec!["invalid".to_string()],
            },
        ];
        extract_tree("h".to_string(), items).unwrap_err();

        // head not in
        let items = vec![TestItem {
            id: "h".to_string(),
            parents: vec![],
        }];
        extract_tree("invalid".to_string(), items).unwrap_err();

        // merges
        let items = vec![
            TestItem {
                id: "h".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "p0".to_string(),
                parents: vec!["p01".to_string(), "p02".to_string()],
            },
            TestItem {
                id: "p01".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "p02".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "root".to_string(),
                parents: vec![],
            },
        ];
        let result = extract_tree("h".to_string(), items).unwrap();
        assert_entries(
            vec![
                "h".to_string(),
                "p0".to_string(),
                "p01".to_string(),
                "p02".to_string(),
                "root".to_string(),
            ],
            result,
        );

        // missing item in merge
        let items = vec![
            TestItem {
                id: "h".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "p0".to_string(),
                parents: vec!["p01".to_string(), "p02".to_string()],
            },
            TestItem {
                id: "p01".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "root".to_string(),
                parents: vec![],
            },
        ];
        extract_tree("h".to_string(), items).unwrap_err();

        // contains "noise"
        let items = vec![
            TestItem {
                id: "h".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "p0".to_string(),
                parents: vec!["p01".to_string(), "p02".to_string()],
            },
            TestItem {
                id: "p01".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "p02".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "root".to_string(),
                parents: vec![],
            },
            TestItem {
                id: "unrelated".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "orphaned".to_string(),
                parents: vec![],
            },
        ];
        let result = extract_tree("h".to_string(), items).unwrap();
        assert_entries(
            vec![
                "h".to_string(),
                "p0".to_string(),
                "p01".to_string(),
                "p02".to_string(),
                "root".to_string(),
            ],
            result,
        );
    }

    #[test]
    fn test_topo_sort() {
        let items = vec![
            TestItem {
                id: "h".to_string(),
                parents: vec!["p0".to_string()],
            },
            TestItem {
                id: "p0".to_string(),
                parents: vec!["p01".to_string(), "p02".to_string()],
            },
            TestItem {
                id: "p01".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "p02".to_string(),
                parents: vec!["root".to_string()],
            },
            TestItem {
                id: "root".to_string(),
                parents: vec![],
            },
        ];
        let result = extract_tree("h".to_string(), items).unwrap();
        let result = topo_sort(result).unwrap();
        assert_eq!(
            result.into_iter().map(|i| i.id).collect::<Vec<String>>(),
            vec![
                "h".to_string(),
                "p0".to_string(),
                // note order of p01 and p02 is implementation dependent
                "p01".to_string(),
                "p02".to_string(),
                "root".to_string(),
            ]
        )
    }
}

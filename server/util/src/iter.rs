/// Helper function to de-duplicate an iterator into a sorted vector. Could be replaced with something like Itertools if we wanted to add that as a dependency, but this is simple enough for now.
pub fn dedup_iter<T: Ord, I: IntoIterator<Item = T>>(inputs: I) -> Vec<T> {
    let mut unique: Vec<T> = inputs.into_iter().collect();
    unique.sort_unstable();
    unique.dedup();
    unique
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dedup_iter() {
        let input = vec!["c", "a", "b", "a", "c", "b"];
        assert_eq!(dedup_iter(input), vec!["a", "b", "c"]);
    }
}

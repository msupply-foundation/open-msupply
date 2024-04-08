use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;

pub fn fuzzy_search<'a>(pattern: &str, choices: &'a [&str]) -> Vec<&'a str> {
    let matcher = SkimMatcherV2::default();

    // if pattern is empty, return empty list
    if pattern == "" {
        return vec![] as Vec<&str>;
    }

    let mut matches = choices
        .iter()
        .filter_map(|choice| {
            matcher
                .fuzzy_match(choice, pattern)
                .map(|score| (choice, score))
        })
        .collect::<Vec<(&&str, i64)>>();

    // sort by score and return only the choices
    matches.sort_by(|a, b| b.1.cmp(&a.1));
    matches.into_iter().map(|(choice, _)| *choice).collect()
}

mod tests {
    #[test]
    fn test_fuzzy_search() {
        let choices = &["apple", "banana", "orange", "kiwi", "mango"];
        let pattern = "an";

        // test that the result is sorted by score
        let result = crate::fuzzy_search(pattern, choices);
        assert_eq!(result, vec!["banana", "orange", "mango"]);
        assert_eq!(result.len(), 3);

        // test that an empty pattern returns an empty list
        let result = crate::fuzzy_search("", choices);
        assert_eq!(result, vec![] as Vec<&str>);
    }
}

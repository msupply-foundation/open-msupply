//! Matching a patient's first or last name from the start of any word in it,
//! ignoring case and accents: "trao" finds "Traoré" and "helene" finds
//! "Marie-Hélène", but "an" doesn't find "Hassan".
//!
//! Each database folds the stored names its own way, both splitting words at
//! anything that isn't a letter, digit or mark, so they agree on Latin
//! accents and punctuation but can differ at the edges (Đ isn't folded on
//! either):
//! - SQLite calls `search_words_match` below, registered on every connection
//!   (`SqliteConnectionOptions`). There is no index: a search checks every
//!   patient the query's other conditions leave, as it did before.
//! - Postgres has a `search_fold` SQL function and an index on the words of
//!   each name (migration `add_patient_search_indexes`), for central's search
//!   across every site's patients.

use diesel::{BoxableExpression, sql_types::Bool, sql_types::Nullable};
use unicode_normalization::{UnicodeNormalization, char::is_combining_mark};

use super::{DBType, name_row::name};

/// The accents Latin letters break down into (Combining Diacritical Marks),
/// the same range the Postgres `search_fold` removes. Other marks, such as
/// Lao vowel signs, are part of the letter and stay.
fn is_accent(c: char) -> bool {
    ('\u{300}'..='\u{36f}').contains(&c)
}

/// Lowercase, without accents, and with each word preceded by a space, so the
/// start of a word is " word". Anything other than a letter, digit or mark
/// separates words: "Koné-Diallo, Awa" is " kone diallo awa".
pub fn fold_for_search(text: &str) -> String {
    let mut folded = String::with_capacity(text.len() + 1);
    let mut in_word = false;
    let mut push = |c: char| {
        if c.is_alphanumeric() || is_combining_mark(c) {
            if !in_word {
                folded.push(' ');
                in_word = true;
            }
            folded.push(c);
        } else {
            in_word = false;
        }
    };
    if text.is_ascii() {
        text.chars().for_each(|c| push(c.to_ascii_lowercase()));
    } else {
        text.nfd()
            .filter(|c| !is_accent(*c))
            .flat_map(char::to_lowercase)
            .for_each(push);
    }
    folded
}

/// The words of typed search text, folded as the names are.
fn search_words(text: &str) -> Vec<String> {
    fold_for_search(text)
        .split_whitespace()
        .map(str::to_string)
        .collect()
}

#[derive(Clone, Copy)]
pub(crate) enum NameColumn {
    FirstName,
    LastName,
}

pub(crate) type WordsCondition =
    Box<dyn BoxableExpression<name::table, DBType, SqlType = Nullable<Bool>>>;

#[cfg(not(feature = "postgres"))]
diesel::define_sql_function! {
    /// Whether every word of `words` (space-separated, folded) starts a word of
    /// `name`, registered on each SQLite connection
    fn search_words_match(
        name: Nullable<diesel::sql_types::Text>,
        words: diesel::sql_types::Text
    ) -> Nullable<Bool>;
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn register_sqlite_functions(
    connection: &mut diesel::SqliteConnection,
) -> diesel::QueryResult<()> {
    search_words_match_utils::register_impl(connection, |name: Option<String>, words: String| {
        name.map(|name| {
            let name = fold_for_search(&name);
            // Every word of the folded name follows a space
            words.split_whitespace().all(|word| {
                name.match_indices(' ')
                    .any(|(space, _)| name[space + 1..].starts_with(word))
            })
        })
    })
}

/// Each typed word starts a word of the name, in any order. None when the text
/// has no words, e.g. only punctuation.
#[cfg(not(feature = "postgres"))]
pub(crate) fn words_start_with(column: NameColumn, text: &str) -> Option<WordsCondition> {
    let words = search_words(text);
    if words.is_empty() {
        return None;
    }
    let words = words.join(" ");
    Some(match column {
        NameColumn::FirstName => Box::new(search_words_match(name::first_name, words)),
        NameColumn::LastName => Box::new(search_words_match(name::last_name, words)),
    })
}

/// Each typed word starts a word of the name, in any order. None when the text
/// has no words, e.g. only punctuation.
///
/// The expression is the one the index is on, word for word, or the index
/// isn't used.
#[cfg(feature = "postgres")]
pub(crate) fn words_start_with(column: NameColumn, text: &str) -> Option<WordsCondition> {
    use diesel::{dsl::sql, sql_types::Text};

    let words = search_words(text);
    if words.is_empty() {
        return None;
    }
    // Words are letters, digits and marks only, so nothing in them means
    // anything to to_tsquery
    let query = words
        .iter()
        .map(|word| format!("{word}:*"))
        .collect::<Vec<_>>()
        .join(" & ");
    let column = match column {
        NameColumn::FirstName => "first_name",
        NameColumn::LastName => "last_name",
    };
    Some(Box::new(
        sql::<Nullable<Bool>>(&format!(
            "to_tsvector('simple', search_fold(name.{column})) @@ to_tsquery('simple', "
        ))
        .bind::<Text, _>(query)
        .sql(")"),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn folds_case_accents_and_punctuation() {
        assert_eq!(fold_for_search("Koné-Diallo, Awa"), " kone diallo awa");
        assert_eq!(fold_for_search("O'Brien  Zoë"), " o brien zoe");
        assert_eq!(fold_for_search("ĐẶNG Thu Hà"), " đang thu ha");
        // Lao vowel signs are marks within the word, not accents
        assert_eq!(fold_for_search("ອິນທະວົງ ຄຳລາ"), " ອິນທະວົງ ຄຳລາ");
        assert_eq!(fold_for_search(" - "), "");
    }

    #[test]
    fn splits_search_text_into_words() {
        assert_eq!(search_words("  Marie-HÉLÈNE "), ["marie", "helene"]);
        assert!(search_words("%_").is_empty());
    }
}

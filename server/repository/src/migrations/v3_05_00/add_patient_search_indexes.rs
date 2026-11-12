use crate::migrations::*;

/// Indexes for central's patient search, which looks across every site's
/// patients (8M took 1–5 s a search without them). Postgres only: a remote
/// site's own patients are few enough to read for each search, and it's
/// usually on SQLite, so SQLite gets nothing.
///
/// - The words of each first and last name, lowercase and without accents,
///   for matching the start of any word (db_diesel/name_search.rs). The
///   query repeats the indexed expression exactly.
/// - The lowercase code and secondary code, for a code that starts with the
///   typed text, searched as a range (`COLLATE "C"`, so a range by bytes).
/// - Date of birth, for a date or range on its own.
///
/// Not partial (`WHERE type = 'PATIENT'`): nearly every name on central is a
/// patient, so it would save little, and other names have no first or last
/// name to index anyway. (A partial index would be used: these queries carry
/// raw SQL, which Diesel never caches, so Postgres plans each one with the
/// bound type in hand.)
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_patient_search_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            // Lowercase, without the accents Latin letters break down into
            // (Combining Diacritical Marks), and with punctuation turned into
            // spaces. The text search parser keeps "Mary.Ann" or "Ali/Hassan"
            // as one word, but the typed text is split there
            // (name_search.rs), so the stored name must be too. normalize()
            // needs a UTF-8 database; any other doesn't ignore accents.
            let unaccented = if is_utf8(connection)? {
                r#"regexp_replace(normalize(lower($1), NFD), '[\u0300-\u036f]', '', 'g')"#
            } else {
                "lower($1)"
            };
            let fold =
                format!(r#"regexp_replace({unaccented}, '[[:punct:][:space:]]+', ' ', 'g')"#);
            sql!(
                connection,
                r#"
                CREATE OR REPLACE FUNCTION search_fold(text) RETURNS text
                    LANGUAGE sql IMMUTABLE PARALLEL SAFE
                    AS $$ SELECT {fold} $$;
                CREATE INDEX index_name_first_name_words
                    ON name USING gin (to_tsvector('simple', search_fold(first_name)));
                CREATE INDEX index_name_last_name_words
                    ON name USING gin (to_tsvector('simple', search_fold(last_name)));
                CREATE INDEX index_name_code_lower
                    ON name (lower(code) COLLATE "C");
                CREATE INDEX index_name_national_health_number_lower
                    ON name (lower(national_health_number) COLLATE "C");
                CREATE INDEX index_name_date_of_birth ON name (date_of_birth);
                ANALYZE name;
                "#
            )?;
        }

        Ok(())
    }
}

#[cfg(feature = "postgres")]
fn is_utf8(connection: &StorageConnection) -> anyhow::Result<bool> {
    use diesel::{RunQueryDsl, sql_query, sql_types::Text};

    #[derive(diesel::QueryableByName)]
    struct Encoding {
        #[diesel(sql_type = Text)]
        encoding: String,
    }
    let Encoding { encoding } = sql_query(
        "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = current_database()",
    )
    .get_result(connection.lock().connection())?;
    Ok(encoding == "UTF8")
}

#[cfg(not(feature = "postgres"))]
fn is_utf8(_: &StorageConnection) -> anyhow::Result<bool> {
    Ok(true)
}

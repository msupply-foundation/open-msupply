//! The standard form of a barcode.
//!
//! Barcodes, barcode proposals and lines store a barcode in its standard form
//! with its scheme (`"<kind>:<value>"`, e.g. `gtin:09506682101352`), and a scan
//! matches by that text, so every device must turn the same printed barcode
//! into exactly the same text. Changing these rules changes stored values, and
//! needs a migration.
//!
//! - A product number (GTIN) is all digits, 8, 12, 13 or 14 long, with a valid
//!   GS1 check digit. The shorter lengths are the same number with the leading
//!   zeros left off, so it is stored left-padded to 14 digits (GS1's standard).
//! - Anything else is a plain barcode, stored exactly as scanned apart from
//!   whitespace and control characters trimmed from the ends. Case and leading
//!   zeros are kept.
//!
//! GS1 reserves some ranges for use inside one company (restricted circulation
//! numbers). Those are not globally unique but are treated as product numbers
//! for now; see decisions/2026-09-30_barcodes.md.

pub const GTIN_KIND: &str = "gtin";
pub const PLAIN_KIND: &str = "plain";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalisedBarcode {
    /// [`GTIN_KIND`] or [`PLAIN_KIND`]
    pub kind: &'static str,
    pub value: String,
}

impl NormalisedBarcode {
    /// The stored form, e.g. `gtin:09506682101352`.
    pub fn id(&self) -> String {
        format!("{}:{}", self.kind, self.value)
    }

    /// A GS1 product number (GTIN), as opposed to a plain barcode.
    pub fn is_gtin(&self) -> bool {
        self.kind == GTIN_KIND
    }
}

/// The standard form of `raw`, or `None` when nothing is left after trimming.
pub fn normalise_barcode(raw: &str) -> Option<NormalisedBarcode> {
    let trimmed = raw.trim_matches(|c: char| c.is_whitespace() || c.is_control());
    if trimmed.is_empty() {
        return None;
    }

    if is_gtin(trimmed) {
        return Some(NormalisedBarcode {
            kind: GTIN_KIND,
            value: format!("{trimmed:0>14}"),
        });
    }

    Some(NormalisedBarcode {
        kind: PLAIN_KIND,
        value: trimmed.to_string(),
    })
}

/// `raw` in its stored form (`gtin:09506682101352`), or `None` when nothing is
/// left after trimming.
pub fn standard_barcode(raw: &str) -> Option<String> {
    normalise_barcode(raw).map(|barcode| barcode.id())
}

/// A stored barcode as people read it: a product number as it's usually
/// printed (see [`shortest_gtin`]), a plain barcode as scanned. Text without a
/// known scheme is returned as it is. The result is put back in the same
/// stored form by [`standard_barcode`].
pub fn display_barcode(stored: &str) -> &str {
    if let Some(value) = stored.strip_prefix("gtin:") {
        return shortest_gtin(value);
    }
    if let Some(value) = stored.strip_prefix("plain:") {
        return value;
    }
    stored
}

/// A stored (14 digit) product number as a scanner usually prints it: EAN-8,
/// UPC-A or EAN-13 by its leading zeros (GS1's GTIN-14 layout), else all 14.
/// For systems that match barcode text exactly: legacy mSupply and Open mSupply
/// before barcode numbers. Leading zeros don't change the check digit, so the
/// result normalises back to `value`.
pub fn shortest_gtin(value: &str) -> &str {
    let zeros = value.bytes().take_while(|b| *b == b'0').count();
    let keep = match zeros {
        6.. => 8,
        2.. => 12,
        1 => 13,
        _ => 14,
    };
    &value[value.len().saturating_sub(keep)..]
}

/// 8, 12, 13 or 14 digits ending in a valid GS1 (mod 10) check digit.
fn is_gtin(text: &str) -> bool {
    if !matches!(text.len(), 8 | 12 | 13 | 14) || !text.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    let digits: Vec<u32> = text.bytes().map(|b| (b - b'0') as u32).collect();
    let (check, body) = digits.split_last().expect("length checked above");
    // Weights alternate 3, 1, 3, … starting from the digit next to the check digit.
    let sum: u32 = body
        .iter()
        .rev()
        .enumerate()
        .map(|(i, d)| if i % 2 == 0 { d * 3 } else { *d })
        .sum();
    (10 - sum % 10) % 10 == *check
}

#[cfg(test)]
mod test {
    use super::*;

    fn gtin(value: &str) -> Option<NormalisedBarcode> {
        Some(NormalisedBarcode {
            kind: GTIN_KIND,
            value: value.to_string(),
        })
    }

    fn plain(value: &str) -> Option<NormalisedBarcode> {
        Some(NormalisedBarcode {
            kind: PLAIN_KIND,
            value: value.to_string(),
        })
    }

    #[test]
    fn pads_every_gtin_length_to_14() {
        // EAN-13
        assert_eq!(normalise_barcode("9506682101352"), gtin("09506682101352"));
        // GTIN-14 (already padded)
        assert_eq!(normalise_barcode("09506682101352"), gtin("09506682101352"));
        // UPC-A
        assert_eq!(normalise_barcode("036000291452"), gtin("00036000291452"));
        // EAN-8
        assert_eq!(normalise_barcode("96385074"), gtin("00000096385074"));
    }

    #[test]
    fn one_product_has_one_id() {
        assert_eq!(
            normalise_barcode("9506682101352").unwrap().id(),
            normalise_barcode("09506682101352").unwrap().id()
        );
        assert_eq!(
            normalise_barcode("9506682101352").unwrap().id(),
            "gtin:09506682101352"
        );
    }

    #[test]
    fn bad_check_digit_is_plain() {
        assert_eq!(normalise_barcode("9506682101353"), plain("9506682101353"));
    }

    #[test]
    fn wrong_length_digits_are_plain() {
        assert_eq!(normalise_barcode("0123456789"), plain("0123456789"));
    }

    #[test]
    fn plain_keeps_case_and_zeros_and_trims_ends() {
        assert_eq!(normalise_barcode("  00Ab-12\r\n"), plain("00Ab-12"));
        assert_eq!(normalise_barcode("\u{1d}ABC\u{1d}"), plain("ABC"));
        assert_eq!(normalise_barcode("A B"), plain("A B"));
    }

    #[test]
    fn empty_is_none() {
        assert_eq!(normalise_barcode(""), None);
        assert_eq!(normalise_barcode(" \t\u{1d}"), None);
    }

    #[test]
    fn trimmed_gtin_is_still_a_gtin() {
        assert_eq!(
            normalise_barcode(" 9506682101352\n"),
            gtin("09506682101352")
        );
    }

    #[test]
    fn display_round_trips_to_the_stored_form() {
        for raw in [
            "9506682101352",
            "036000291452",
            "96385074",
            "00Ab-12",
            "A B",
        ] {
            let stored = standard_barcode(raw).unwrap();
            assert_eq!(display_barcode(&stored), raw);
            assert_eq!(standard_barcode(display_barcode(&stored)), Some(stored));
        }
        assert_eq!(display_barcode("no scheme"), "no scheme");
    }

    #[test]
    fn shortest_gtin_is_the_printed_form() {
        assert_eq!(shortest_gtin("09506682101352"), "9506682101352");
        assert_eq!(shortest_gtin("00036000291452"), "036000291452");
        assert_eq!(shortest_gtin("00000096385074"), "96385074");
        assert_eq!(shortest_gtin("19506682101359"), "19506682101359");
        for value in ["09506682101352", "00036000291452", "00000096385074"] {
            assert_eq!(normalise_barcode(shortest_gtin(value)), gtin(value));
        }
    }
}

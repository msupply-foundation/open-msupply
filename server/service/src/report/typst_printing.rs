use typst::{
    diag::{FileError, FileResult},
    foundations::{Bytes, Datetime},
    layout::PagedDocument,
    syntax::{FileId, Source},
    text::{Font, FontBook},
    utils::LazyHash,
    Library, LibraryExt, World,
};

/// A minimal Typst World implementation for rendering reports to PDF.
struct ReportWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    source: Source,
}

impl ReportWorld {
    fn new(typst_source: &str, data_json: &str) -> Self {
        let fonts: Vec<Font> = typst_assets::fonts()
            .flat_map(|data| {
                let bytes = Bytes::new(data);
                (0u32..).map_while(move |idx| Font::new(bytes.clone(), idx))
            })
            .collect();
        let book = FontBook::from_fonts(fonts.iter());

        // Replace the test data placeholder with real report data.
        // Templates define test data as: #let report_data = ( ... )
        // At generation time, we replace that line with the real JSON data.
        // If no placeholder is found, prepend the data declaration.
        let data_declaration = format!(
            "#let report_data = json.decode(\"{}\")",
            data_json.replace('\\', "\\\\").replace('"', "\\\""),
        );
        let full_source = if let Some(start) = typst_source.find("#let report_data =") {
            // Find the end of the statement — look for the next line that doesn't
            // continue the expression (handles multi-line test data).
            // We find the matching balanced parentheses/brackets.
            let rest = &typst_source[start..];
            let end = find_let_binding_end(rest);
            format!(
                "{}{}\n{}",
                &typst_source[..start],
                data_declaration,
                &typst_source[start + end..],
            )
        } else {
            format!("{}\n{}", data_declaration, typst_source)
        };

        Self {
            library: LazyHash::new(Library::default()),
            book: LazyHash::new(book),
            fonts,
            source: Source::detached(&full_source),
        }
    }
}

impl World for ReportWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.source.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        use chrono::{Datelike, Timelike};
        let now = chrono::Utc::now();
        let now = match offset {
            Some(hours) => now + chrono::Duration::hours(hours),
            None => now,
        };
        Datetime::from_ymd_hms(
            now.year(),
            now.month() as u8,
            now.day() as u8,
            now.hour() as u8,
            now.minute() as u8,
            now.second() as u8,
        )
    }
}

/// Find the end of a `#let report_data = ...` binding in Typst source.
/// Handles multi-line values by tracking balanced parens/brackets/braces.
/// Returns the byte offset just past the end of the binding (including trailing newline if present).
fn find_let_binding_end(source: &str) -> usize {
    let eq_pos = match source.find('=') {
        Some(pos) => pos,
        None => return source.len().min(source.find('\n').unwrap_or(source.len())),
    };

    let after_eq = &source[eq_pos + 1..];
    let mut depth = 0i32;
    let mut in_string = false;
    let mut prev_char = ' ';
    let mut pos = 0;
    let mut found_content = false;

    for ch in after_eq.chars() {
        pos += ch.len_utf8();

        if in_string {
            if ch == '"' && prev_char != '\\' {
                in_string = false;
            }
            prev_char = ch;
            continue;
        }

        match ch {
            '"' => {
                in_string = true;
                found_content = true;
            }
            '(' | '[' | '{' => {
                depth += 1;
                found_content = true;
            }
            ')' | ']' | '}' => {
                depth -= 1;
                if depth <= 0 && found_content {
                    // End of the balanced expression — consume trailing newline
                    let rest = &after_eq[pos..];
                    if rest.starts_with('\n') {
                        pos += 1;
                    } else if rest.starts_with("\r\n") {
                        pos += 2;
                    }
                    return eq_pos + 1 + pos;
                }
            }
            '\n' if depth == 0 && found_content => {
                return eq_pos + 1 + pos;
            }
            c if !c.is_whitespace() => {
                found_content = true;
            }
            _ => {}
        }
        prev_char = ch;
    }

    eq_pos + 1 + pos
}

/// Compile a Typst template with the given JSON data and produce PDF bytes.
pub fn typst_to_pdf(typst_source: &str, data_json: &str) -> Result<Vec<u8>, String> {
    let world = ReportWorld::new(typst_source, data_json);
    let result = typst::compile::<PagedDocument>(&world);

    match result.output {
        Ok(document) => {
            let options = typst_pdf::PdfOptions::default();
            typst_pdf::pdf(&document, &options).map_err(|errors| {
                let msgs: Vec<String> = errors.iter().map(|e| format!("{e:?}")).collect();
                format!("Typst PDF export errors: {}", msgs.join("; "))
            })
        }
        Err(errors) => {
            let msgs: Vec<String> = errors.iter().map(|e| format!("{e:?}")).collect();
            Err(format!("Typst compilation errors: {}", msgs.join("; ")))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_typst_to_pdf() {
        let source = r#"
= Hello, World!
This is a test document.
"#;
        let data_json = r#"{"data": {}, "arguments": null}"#;
        let result = typst_to_pdf(source, data_json);
        assert!(result.is_ok(), "Basic Typst compilation should succeed");
        let pdf_bytes = result.unwrap();
        assert!(!pdf_bytes.is_empty(), "PDF output should not be empty");
        // PDF files start with %PDF
        assert!(
            pdf_bytes.starts_with(b"%PDF"),
            "Output should be a valid PDF"
        );
    }

    #[test]
    fn test_typst_with_data() {
        let source = r#"
#let name = report_data.data.name
= Report for #name
"#;
        let data_json = r#"{"data": {"name": "Test Store"}, "arguments": null}"#;
        let result = typst_to_pdf(source, data_json);
        assert!(
            result.is_ok(),
            "Typst with data access should succeed: {:?}",
            result.err()
        );
    }

    #[test]
    fn test_test_data_replacement() {
        // Template with test data that should be replaced
        let source = r#"#let report_data = (
  data: (
    name: "Test Data",
  ),
)
= Report for #report_data.data.name
"#;
        let data_json = r#"{"data": {"name": "Real Store"}}"#;
        let result = typst_to_pdf(source, data_json);
        assert!(
            result.is_ok(),
            "Template with replaced test data should compile: {:?}",
            result.err()
        );
    }

    #[test]
    fn test_find_let_binding_end_single_line() {
        let source = "#let report_data = \"hello\"\n= Title";
        let end = find_let_binding_end(source);
        assert_eq!(&source[end..], "= Title");
    }

    #[test]
    fn test_find_let_binding_end_multiline() {
        let source = "#let report_data = (\n  data: (name: \"test\"),\n)\n= Title";
        let end = find_let_binding_end(source);
        assert_eq!(&source[end..], "= Title");
    }
}

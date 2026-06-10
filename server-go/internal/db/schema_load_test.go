package db

// WS3/WS4 experiment: prove the pure-Go SQLite driver (modernc.org/sqlite) can load the
// REAL production schema dump (../server/.../base_migrations/sqlite_latest.sql) and produce
// a schema identical to the sqlite3 C library (via the CLI reference).
//
// Run: go test ./internal/db/ -run SchemaLoad -v

import (
	"database/sql"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

const baseSchemaRel = "../../../server/repository/src/migrations/base_migrations/sqlite_latest.sql"

// schemaObject is one row of sqlite_master we care about for parity.
type schemaObject struct {
	Type string // table | index | trigger | view
	Name string
	SQL  string // normalized CREATE statement
}

var wsRe = regexp.MustCompile(`\s+`)

func normalizeSQL(s string) string {
	return strings.TrimSpace(wsRe.ReplaceAllString(s, " "))
}

// querySchema returns the normalized, sorted schema objects from an open DB.
func querySchema(t *testing.T, db *sql.DB) []schemaObject {
	t.Helper()
	rows, err := db.Query(`
		SELECT type, name, COALESCE(sql, '')
		FROM sqlite_master
		WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
		ORDER BY type, name`)
	if err != nil {
		t.Fatalf("query sqlite_master: %v", err)
	}
	defer rows.Close()
	var out []schemaObject
	for rows.Next() {
		var o schemaObject
		if err := rows.Scan(&o.Type, &o.Name, &o.SQL); err != nil {
			t.Fatalf("scan: %v", err)
		}
		o.SQL = normalizeSQL(o.SQL)
		out = append(out, o)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Type != out[j].Type {
			return out[i].Type < out[j].Type
		}
		return out[i].Name < out[j].Name
	})
	return out
}

func countByType(objs []schemaObject) map[string]int {
	m := map[string]int{}
	for _, o := range objs {
		m[o.Type]++
	}
	return m
}

// loadViaModernc loads the dump into a fresh temp DB using the pure-Go driver.
func loadViaModernc(t *testing.T, dump string) []schemaObject {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "modernc.sqlite")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open modernc: %v", err)
	}
	defer db.Close()
	if _, err := db.Exec(dump); err != nil {
		t.Fatalf("modernc failed to execute production schema dump: %v", err)
	}
	return querySchema(t, db)
}

// loadViaCLI loads the dump using the sqlite3 C library (reference behavior).
func loadViaCLI(t *testing.T, dumpPath string) []schemaObject {
	t.Helper()
	cli, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 CLI not found; skipping reference comparison")
	}
	dbPath := filepath.Join(t.TempDir(), "ref.sqlite")
	// `sqlite3 db.sqlite < dump.sql`
	f, err := os.Open(dumpPath)
	if err != nil {
		t.Fatalf("open dump: %v", err)
	}
	defer f.Close()
	cmd := exec.Command(cli, dbPath)
	cmd.Stdin = f
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("sqlite3 CLI load failed: %v\n%s", err, out)
	}
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("reopen ref via modernc: %v", err)
	}
	defer db.Close()
	return querySchema(t, db)
}

func TestSchemaLoad_ProductionDump(t *testing.T) {
	dumpPath, err := filepath.Abs(baseSchemaRel)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(dumpPath)
	if err != nil {
		t.Fatalf("cannot read base schema dump (%s): %v", dumpPath, err)
	}
	dump := string(raw)
	t.Logf("loaded production schema dump: %d bytes", len(dump))

	modernc := loadViaModernc(t, dump)
	mc := countByType(modernc)
	t.Logf("modernc.org/sqlite loaded schema: tables=%d indexes=%d triggers=%d views=%d (total %d objects)",
		mc["table"], mc["index"], mc["trigger"], mc["view"], len(modernc))

	if mc["table"] == 0 {
		t.Fatalf("expected production schema to contain tables, got none")
	}

	ref := loadViaCLI(t, dumpPath)
	rc := countByType(ref)
	t.Logf("sqlite3 CLI (C lib) loaded schema:  tables=%d indexes=%d triggers=%d views=%d (total %d objects)",
		rc["table"], rc["index"], rc["trigger"], rc["view"], len(ref))

	// Compare object-by-object.
	diffs := diffSchemas(ref, modernc)
	if len(diffs) > 0 {
		t.Errorf("schema parity FAILED: %d differences between sqlite3-CLI and modernc:\n%s",
			len(diffs), strings.Join(diffs, "\n"))
	} else {
		t.Logf("PARITY OK: modernc schema is identical to sqlite3 CLI across all %d objects", len(ref))
	}
}

func diffSchemas(ref, got []schemaObject) []string {
	refMap := map[string]schemaObject{}
	for _, o := range ref {
		refMap[o.Type+":"+o.Name] = o
	}
	gotMap := map[string]schemaObject{}
	for _, o := range got {
		gotMap[o.Type+":"+o.Name] = o
	}
	var diffs []string
	for k, r := range refMap {
		g, ok := gotMap[k]
		if !ok {
			diffs = append(diffs, fmt.Sprintf("  MISSING in modernc: %s", k))
			continue
		}
		if g.SQL != r.SQL {
			diffs = append(diffs, fmt.Sprintf("  SQL DIFFERS for %s:\n    ref:    %s\n    modernc:%s", k, r.SQL, g.SQL))
		}
	}
	for k := range gotMap {
		if _, ok := refMap[k]; !ok {
			diffs = append(diffs, fmt.Sprintf("  EXTRA in modernc: %s", k))
		}
	}
	sort.Strings(diffs)
	return diffs
}

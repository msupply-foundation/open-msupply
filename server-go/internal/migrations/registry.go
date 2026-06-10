package migrations

import (
	"strings"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
)

// expand substitutes the {TYPE} tokens that the Rust `sql!` migrations interpolate from
// migrations/types.rs. This is the Go equivalent of Rust's format!("{DOUBLE}", ...).
func expand(sql string, t db.TypeConstants) string {
	return strings.NewReplacer(
		"{DATE}", t.Date,
		"{DATETIME}", t.DateTime,
		"{DOUBLE}", t.Double,
		"{DEFAULT_TIMESTAMP}", t.DefaultTimestamp,
		"{JSON}", t.JSON,
		"{BINARY}", t.Binary,
	).Replace(sql)
}

// Registry returns the ordered migration list for the spike. The first entry must be at or
// below the lowest DB version we intend to upgrade from (mirrors Rust, whose list starts at
// v1.03.00). Here we start at the production "latest base" version (2.15.0) and demonstrate
// applying a real post-2.15.0 migration on top.
//
// NOTE: this is a representative SLICE. Porting the full v1.3.0 -> latest chain (~404 files)
// is the remaining mechanical work, quantified in docs/DECISION.md.
func Registry() []Migration {
	return []Migration{
		marker("2.15.0"), // base-schema version marker (no-op)
		v2_19_00{},       // real migration ported from the Rust source
	}
}

// marker is a no-op migration that just stakes a version (mirrors versions whose work is
// entirely in already-ported fragments, or pure version bumps).
func marker(v string) Migration { return markerMigration{ParseVersion(v)} }

type markerMigration struct{ v Version }

func (m markerMigration) Version() Version             { return m.v }
func (markerMigration) Migrate(Exec, db.Dialect) error { return nil }
func (markerMigration) Fragments() []Fragment          { return nil }

// --- v2_19_00 ----------------------------------------------------------------------------
// Ported from server/repository/src/migrations/v2_19_00/add_ancillary_item_table.rs

type v2_19_00 struct{ BaseMigration }

func (v2_19_00) Version() Version { return ParseVersion("2.19.0") }

func (v2_19_00) Fragments() []Fragment {
	return []Fragment{addAncillaryItemTable{}}
}

type addAncillaryItemTable struct{}

func (addAncillaryItemTable) Identifier() string { return "add_ancillary_item_table" }

func (addAncillaryItemTable) Migrate(exec Exec, d db.Dialect) error {
	stmt := expand(`
		CREATE TABLE IF NOT EXISTS ancillary_item (
			id TEXT NOT NULL PRIMARY KEY,
			item_link_id TEXT NOT NULL REFERENCES item_link(id),
			ancillary_item_link_id TEXT NOT NULL REFERENCES item_link(id),
			item_quantity {DOUBLE} NOT NULL,
			ancillary_quantity {DOUBLE} NOT NULL,
			deleted_datetime {DATETIME}
		);`, d.Types())
	if _, err := exec.Exec(stmt); err != nil {
		return err
	}
	if d == db.Postgres {
		if _, err := exec.Exec(`ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'ancillary_item';`); err != nil {
			return err
		}
	}
	return nil
}

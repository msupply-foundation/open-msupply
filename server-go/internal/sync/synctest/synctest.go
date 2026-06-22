// Package synctest is the shared test harness for the sync engine: record types and
// assertion helpers that mirror server/service/src/sync/test/mod.rs, plus DB bootstrap. It is
// a (non-test) helper package so fixtures can be shared between the per-translator unit tests
// (package translations) and the round-trip test. It deliberately does NOT import the
// translations or engine packages, so those can import it without a cycle.
package synctest

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// IncomingRecord mirrors TestSyncIncomingRecord: a sync_buffer row paired with the expected
// translation result. ExtraData (≈ extra_data: Option<MockData>) seeds FK prerequisites a
// translator reads from the DB during translation; nil means none.
type IncomingRecord struct {
	Buffer    synctypes.SyncBufferRow
	Expected  synctypes.PullTranslateResult
	ExtraData func(exec synctypes.Exec) error
}

// IncomingUpsert builds an upsert incoming record (≈ TestSyncIncomingRecord::new_pull_upsert).
func IncomingUpsert(table, recordID, data string, expected synctypes.PullTranslateResult) IncomingRecord {
	return IncomingRecord{
		Buffer: synctypes.SyncBufferRow{
			RecordID:  recordID,
			TableName: table,
			Action:    synctypes.SyncActionUpsert,
			Data:      data,
		},
		Expected: expected,
	}
}

// IncomingDelete builds a delete incoming record (≈ new_pull_delete).
func IncomingDelete(table, recordID string, expected synctypes.PullTranslateResult) IncomingRecord {
	return IncomingRecord{
		Buffer: synctypes.SyncBufferRow{
			RecordID:  recordID,
			TableName: table,
			Action:    synctypes.SyncActionDelete,
			Data:      "{}",
		},
		Expected: expected,
	}
}

// WithExtraData attaches an FK-seeding closure.
func (r IncomingRecord) WithExtraData(f func(exec synctypes.Exec) error) IncomingRecord {
	r.ExtraData = f
	return r
}

// OutgoingRecord mirrors TestSyncOutgoingRecord: the expected pushed sync record.
type OutgoingRecord struct {
	Table    string
	RecordID string
	PushData json.RawMessage
}

// BufferRows extracts the sync_buffer rows from a set of incoming records for bulk insert
// (≈ extract_sync_buffer_rows).
func BufferRows(records []IncomingRecord) []synctypes.SyncBufferRow {
	out := make([]synctypes.SyncBufferRow, 0, len(records))
	for _, r := range records {
		out = append(out, r.Buffer)
	}
	return out
}

// AssertPullEqual compares a translator's output against the expected result (deep equal),
// mirroring the assert_eq! in the Rust per-translator tests.
func AssertPullEqual(t *testing.T, got, want synctypes.PullTranslateResult) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Errorf("pull translation mismatch:\n got  = %#v\n want = %#v", got, want)
	}
}

// AssertJSONEqual compares two JSON payloads structurally (key order / whitespace independent),
// mirroring the serde_json::Value comparison in pull_and_push.rs.
func AssertJSONEqual(t *testing.T, got, want []byte) {
	t.Helper()
	var g, w any
	if err := json.Unmarshal(got, &g); err != nil {
		t.Fatalf("unmarshal got json: %v (%s)", err, got)
	}
	if err := json.Unmarshal(want, &w); err != nil {
		t.Fatalf("unmarshal want json: %v (%s)", err, want)
	}
	if !reflect.DeepEqual(g, w) {
		t.Errorf("json mismatch:\n got  = %s\n want = %s", got, want)
	}
}

// SetupSQLite opens a freshly-migrated SQLite DB in a temp dir (foreign_keys ON).
func SetupSQLite(t *testing.T) *sql.DB {
	t.Helper()
	conn, err := db.OpenSQLite(filepath.Join(t.TempDir(), "sync.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	if _, err := migrations.Migrate(conn, db.SQLite, migrations.Registry(), nil); err != nil {
		t.Fatalf("migrate sqlite: %v", err)
	}
	return conn
}

// SetupPostgres opens a freshly-migrated Postgres DB, skipping the test if PG_DSN is unset.
// It resets the public schema first so the runner bootstraps from the pg base (matching the
// crossdb harness).
func SetupPostgres(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("PG_DSN")
	if dsn == "" {
		t.Skip("set PG_DSN to run the Postgres sync parity suite")
	}
	conn, err := db.OpenPostgres(dsn)
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	if _, err := conn.Exec(`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`); err != nil {
		t.Fatalf("reset postgres schema: %v", err)
	}
	if _, err := migrations.Migrate(conn, db.Postgres, migrations.Registry(), nil); err != nil {
		t.Fatalf("migrate postgres: %v", err)
	}
	return conn
}

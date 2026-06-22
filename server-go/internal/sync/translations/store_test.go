package translations

import (
	"testing"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctest"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// Mirrors the #[cfg(test)] test in translations/store.rs: the translator reads name_link from
// the DB during translation, so seed it first (ExtraData), then assert the multi-op result and
// the ignored system stores.
func TestStoreTranslation(t *testing.T) {
	conn := synctest.SetupSQLite(t)
	tr := Store{}

	for _, rec := range synctest.StorePullUpsert() {
		if rec.ExtraData != nil {
			if err := rec.ExtraData(conn); err != nil {
				t.Fatalf("seed extra data for %s: %v", rec.Buffer.RecordID, err)
			}
		}
		if !synctypes.ShouldTranslateFrom(tr, &rec.Buffer) {
			t.Fatalf("store translator should match record %s", rec.Buffer.RecordID)
		}
		got, err := tr.TryTranslateFromUpsert(conn, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate upsert %s: %v", rec.Buffer.RecordID, err)
		}
		synctest.AssertPullEqual(t, got, rec.Expected)
	}

	for _, rec := range synctest.StorePullDelete() {
		got, err := tr.TryTranslateFromDelete(conn, db.SQLite, &rec.Buffer)
		if err != nil {
			t.Fatalf("translate delete %s: %v", rec.Buffer.RecordID, err)
		}
		synctest.AssertPullEqual(t, got, rec.Expected)
	}
}

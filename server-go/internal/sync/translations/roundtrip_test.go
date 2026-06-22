package translations_test

// End-to-end pull round-trip, mirroring server/service/src/sync/test/pull_and_push.rs (scoped
// to the slice). Runs on SQLite always and Postgres when PG_DSN is set, via the cross-DB
// harness pattern in internal/repository/crossdb_test.go. The push phase is exercised once
// tracked entities (stock_line/invoice/invoice_line) are added; for now it asserts the pull +
// integrate + delete path across all currently-registered entities.

import (
	"database/sql"
	"testing"

	"encoding/json"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/changelog"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/engine"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/syncbuffer"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctest"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/translations"
)

func runSyncRoundTrip(t *testing.T, conn *sql.DB, d db.Dialect) {
	t.Helper()
	translators := translations.AllTranslators()
	buf := syncbuffer.New(conn, d)
	clRepo := changelog.New(conn, d)

	// Snapshot the push cursor before integrating (so push only sees what we integrate; seeds
	// use raw SQL and don't write changelog). Mirrors pull_and_push.rs.
	pushCursor, err := clRepo.LatestCursor()
	if err != nil {
		t.Fatalf("latest cursor: %v", err)
	}

	// --- PULL UPSERT ---
	upserts := synctest.AllPullUpsert()
	for _, rec := range upserts {
		if rec.ExtraData != nil {
			if err := rec.ExtraData(conn); err != nil {
				t.Fatalf("seed extra data for %s: %v", rec.Buffer.RecordID, err)
			}
		}
	}
	if err := buf.Insert(synctest.BufferRows(upserts)); err != nil {
		t.Fatalf("insert sync buffer (upsert): %v", err)
	}
	res, err := engine.IntegrateBuffered(conn, d, translators, syncbuffer.CentralSource(0))
	if err != nil {
		t.Fatalf("integrate upserts: %v", err)
	}
	// unit(4) + reason(3) + store STORE_1(1) + stock_line(1) integrate; the 3 system stores
	// are Ignored (recorded but neither integrated nor counted as errors).
	if res.ErrorCount != 0 {
		t.Fatalf("integrate upserts: unexpected error count %d", res.ErrorCount)
	}
	if res.IntegratedCount != 9 {
		t.Fatalf("integrate upserts: integrated=%d, want 9", res.IntegratedCount)
	}

	// Spot-check translated rows landed (unit with a description, a reason enum).
	unitRepo := repository.NewUnitRowRepository(conn, d)
	bottle, err := unitRepo.FindOneByID("A02C91EB6C77400BA783C4CD7C565F29")
	if err != nil || bottle == nil {
		t.Fatalf("find bottle unit: %v (row=%v)", err, bottle)
	}
	if bottle.Name != "Bottle" || !bottle.Description.Valid ||
		bottle.Description.String != "This is a bottle unit type" || bottle.Index != 2 || !bottle.IsActive {
		t.Errorf("bottle unit mismatch: %+v", bottle)
	}

	reasonRepo := repository.NewReasonOptionRowRepository(conn, d)
	ret, err := reasonRepo.FindOneByID("return_reason")
	if err != nil || ret == nil {
		t.Fatalf("find return reason: %v (row=%v)", err, ret)
	}
	if ret.Type != repository.ReasonReturnReason || ret.Reason != "Damaged" || !ret.IsActive {
		t.Errorf("return reason mismatch: %+v", ret)
	}

	// Store STORE_1 integrated (two ops: lean row + logo); the system store DRG was Ignored.
	storeRepo := repository.NewStoreRowRepository(conn, d)
	gen, err := storeRepo.FindOneByID("4E27CEB263354EB7B1B33CEA8F7884D8")
	if err != nil || gen == nil {
		t.Fatalf("find GEN store: %v (row=%v)", err, gen)
	}
	if gen.NameLinkID != "1FB32324AF8049248D929CFB35F255BA" || gen.Code != "GEN" ||
		gen.SiteID != 1 || gen.StoreMode != repository.StoreModeStore {
		t.Errorf("GEN store mismatch: %+v", gen)
	}
	logo, err := storeRepo.Logo("4E27CEB263354EB7B1B33CEA8F7884D8")
	if err != nil || !logo.Valid || logo.String != "No logo" {
		t.Errorf("GEN store logo mismatch: %v valid=%v %q", err, logo.Valid, logo.String)
	}
	if drg, err := storeRepo.FindOneByID("9EDD3F83C3D64C22A3CC9C98CF4967C5"); err != nil || drg != nil {
		t.Errorf("system store DRG should not be integrated: %v (row=%v)", err, drg)
	}

	// --- PUSH ---
	// Integrating the tracked stock line wrote a changelog row (app-side). Read it back from
	// changelog_deduped and translate it to an outgoing legacy "item_line" record. The
	// changelog_deduped view is (re)created on both dialects by the migration view-rebuild step
	// (internal/migrations/views.go), so this runs on SQLite and Postgres alike.
	changelogs, err := clRepo.Changelogs(pushCursor, 100000)
	if err != nil {
		t.Fatalf("read changelogs: %v", err)
	}
	pushRecords, err := engine.TranslateChangelogsToSyncRecords(conn, d, translators, changelogs,
		[]synctypes.ToSyncRecordTranslationType{synctypes.PushToLegacyCentral})
	if err != nil {
		t.Fatalf("translate changelogs to sync records: %v", err)
	}
	var stockLinePush *synctypes.CommonSyncRecord
	for i := range pushRecords {
		if pushRecords[i].Record.RecordID == "stock_a" {
			stockLinePush = &pushRecords[i].Record
		}
	}
	if stockLinePush == nil {
		t.Fatalf("expected a push record for the integrated stock line; got %d records", len(pushRecords))
	}
	if stockLinePush.TableName != "item_line" || stockLinePush.Action != synctypes.TransportUpdate {
		t.Errorf("stock line push envelope mismatch: %+v", stockLinePush)
	}
	var pushData map[string]any
	if err := json.Unmarshal(stockLinePush.RecordData, &pushData); err != nil {
		t.Fatalf("unmarshal push data: %v", err)
	}
	if pushData["item_ID"] != "item_a" || pushData["store_ID"] != "store_a" {
		t.Errorf("stock line push data mismatch: %v", pushData)
	}

	runPullDelete(t, conn, d, buf, translators, unitRepo)
}

// runPullDelete integrates the pull-delete buffer rows and asserts the unit soft delete.
func runPullDelete(t *testing.T, conn *sql.DB, d db.Dialect, buf *syncbuffer.Repository,
	translators []synctypes.SyncTranslation, unitRepo *repository.UnitRowRepository) {
	t.Helper()
	deletes := synctest.AllPullDelete()
	if err := buf.Insert(synctest.BufferRows(deletes)); err != nil {
		t.Fatalf("insert sync buffer (delete): %v", err)
	}
	if _, err := engine.IntegrateBuffered(conn, d, translators, syncbuffer.CentralSource(0)); err != nil {
		t.Fatalf("integrate deletes: %v", err)
	}
	// Unit delete is a soft delete (is_active = false).
	deleted, err := unitRepo.FindOneByID("A02C91EB6C77400BA783C4CD7C565F2A")
	if err != nil {
		t.Fatalf("find deleted unit: %v", err)
	}
	if deleted == nil || deleted.IsActive {
		t.Errorf("unit should be soft-deleted (is_active=false), got %+v", deleted)
	}
}

func TestSyncRoundTrip_SQLite(t *testing.T) {
	runSyncRoundTrip(t, synctest.SetupSQLite(t), db.SQLite)
}

func TestSyncRoundTrip_Postgres(t *testing.T) {
	runSyncRoundTrip(t, synctest.SetupPostgres(t), db.Postgres)
}

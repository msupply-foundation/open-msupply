package engine

import (
	"database/sql"
	"fmt"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/changelog"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/syncbuffer"
	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// savepointName is reused per record; each is RELEASE'd or ROLLBACK'd before the next.
const savepointName = "oms_sync_integrate"

// Result mirrors TranslationAndIntegrationResult (aggregated across tables).
type Result struct {
	IntegratedCount int
	ErrorCount      int
}

func (r *Result) add(other Result) {
	r.IntegratedCount += other.IntegratedCount
	r.ErrorCount += other.ErrorCount
}

type opWithSource struct {
	op     synctypes.IntegrationOperation
	source sql.NullInt32
}

// TranslateAndIntegrate translates and integrates an already-ordered batch of buffer rows on
// exec, recording per-row success/error in the buffer. Mirrors
// translate_and_integrate_sync_records. exec must be a *sql.Tx when d == Postgres (the
// per-record error isolation uses SAVEPOINTs).
func TranslateAndIntegrate(exec synctypes.Exec, d db.Dialect, translators []synctypes.SyncTranslation, rows []synctypes.SyncBufferRow) (Result, error) {
	buf := syncbuffer.New(exec, d)
	cl := changelog.New(exec, d)
	var result Result

	for i := range rows {
		row := rows[i]

		results, err := translateSyncRecord(exec, d, &row, translators)
		if err != nil {
			if rErr := buf.RecordError(&row, err.Error()); rErr != nil {
				return result, rErr
			}
			result.ErrorCount++
			continue
		}

		var ops []opWithSource
		ignored := false
		for _, res := range results {
			switch res.Kind {
			case synctypes.PullOperations:
				for _, op := range res.Operations {
					ops = append(ops, opWithSource{op: op, source: row.SourceSiteID})
				}
			case synctypes.PullIgnored:
				ignored = true
				if rErr := buf.RecordError(&row, "Ignored: "+res.IgnoreMessage); rErr != nil {
					return result, rErr
				}
				// Not counted as an error: ignoring is valid translation logic.
			case synctypes.PullNotMatched:
				// silent
			}
		}

		if ignored {
			continue
		}

		// No translator produced operations: record "translator not found" (not counted).
		if len(ops) == 0 {
			if rErr := buf.RecordError(&row, "Translator for record not found"); rErr != nil {
				return result, rErr
			}
			continue
		}

		if err := integrate(exec, d, cl, ops); err != nil {
			if rErr := buf.RecordError(&row, err.Error()); rErr != nil {
				return result, rErr
			}
			result.ErrorCount++
			continue
		}
		if err := buf.RecordSuccess(&row); err != nil {
			return result, err
		}
		result.IntegratedCount++
	}

	return result, nil
}

// translateSyncRecord runs every matching translator for a record, dispatching by action.
// Mirrors translate_sync_record.
func translateSyncRecord(exec synctypes.Exec, d db.Dialect, row *synctypes.SyncBufferRow, translators []synctypes.SyncTranslation) ([]synctypes.PullTranslateResult, error) {
	var out []synctypes.PullTranslateResult
	for _, t := range translators {
		if !synctypes.ShouldTranslateFrom(t, row) {
			continue
		}
		var res synctypes.PullTranslateResult
		var err error
		switch row.Action {
		case synctypes.SyncActionUpsert:
			res, err = t.TryTranslateFromUpsert(exec, d, row)
		case synctypes.SyncActionDelete:
			res, err = t.TryTranslateFromDelete(exec, d, row)
		case synctypes.SyncActionMerge:
			res, err = t.TryTranslateFromMerge(exec, d, row)
		}
		if err != nil {
			return nil, err
		}
		out = append(out, res)
	}
	return out, nil
}

// integrate executes each operation. Under Postgres each op runs inside a SAVEPOINT so a
// single FK violation doesn't poison the outer transaction (the reason the Rust code branches
// on cfg!(feature="postgres")); under SQLite a statement error leaves the tx usable so ops run
// directly. Mirrors translation_and_integration::integrate.
func integrate(exec synctypes.Exec, d db.Dialect, cl *changelog.Repository, ops []opWithSource) error {
	for _, o := range ops {
		if d == db.Postgres {
			if _, err := exec.Exec("SAVEPOINT " + savepointName); err != nil {
				return err
			}
			if err := runOne(exec, d, cl, o); err != nil {
				if _, rbErr := exec.Exec("ROLLBACK TO SAVEPOINT " + savepointName); rbErr != nil {
					return fmt.Errorf("rollback to savepoint after %v: %w", err, rbErr)
				}
				return err
			}
			if _, err := exec.Exec("RELEASE SAVEPOINT " + savepointName); err != nil {
				return err
			}
		} else {
			if err := runOne(exec, d, cl, o); err != nil {
				return err
			}
		}
	}
	return nil
}

// runOne applies one upsert/delete and, if the entity is tracked (a changelog cursor was
// produced), stamps the source-site id / is_sync_update flag on that changelog row.
func runOne(exec synctypes.Exec, d db.Dialect, cl *changelog.Repository, o opWithSource) error {
	switch {
	case o.op.Upsert != nil:
		cursor, tracked, err := o.op.Upsert.Upsert(exec, d)
		if err != nil {
			return err
		}
		if tracked {
			return cl.SetSourceSiteIDAndIsSyncUpdate(cursor, o.source)
		}
	case o.op.Delete != nil:
		cursor, tracked, err := o.op.Delete.Delete(exec, d)
		if err != nil {
			return err
		}
		if tracked {
			return cl.SetSourceSiteIDAndIsSyncUpdate(cursor, o.source)
		}
	}
	return nil
}

// IntegrateBuffered is the high-level pull entry point: it orders translators by dependency,
// then within a single transaction fetches and integrates the un-integrated buffer rows for
// each action (upserts in dependency order, deletes in reverse, then merges). Mirrors the
// integrate step of the synchroniser.
func IntegrateBuffered(conn *sql.DB, d db.Dialect, translators []synctypes.SyncTranslation, src syncbuffer.Source) (Result, error) {
	var result Result

	order, err := PullIntegrationOrder(translators)
	if err != nil {
		return result, err
	}

	tx, err := conn.Begin()
	if err != nil {
		return result, err
	}
	defer func() { _ = tx.Rollback() }()

	buf := syncbuffer.New(tx, d)
	for _, action := range []synctypes.SyncAction{synctypes.SyncActionUpsert, synctypes.SyncActionDelete, synctypes.SyncActionMerge} {
		rows, err := buf.GetOrdered(action, order, src)
		if err != nil {
			return result, err
		}
		res, err := TranslateAndIntegrate(tx, d, translators, rows)
		if err != nil {
			return result, err
		}
		result.add(res)
	}

	if err := tx.Commit(); err != nil {
		return result, err
	}
	return result, nil
}

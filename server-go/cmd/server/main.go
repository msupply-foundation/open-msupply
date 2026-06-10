// Command server runs the spike Go GraphQL server.
//
// SQLite (migrates on startup):
//   go run ./cmd/server -driver sqlite -db path.sqlite -addr :8001
// Postgres against an already-initialised DB (skip migration, read as-is):
//   go run ./cmd/server -driver postgres -dsn "host=localhost port=5433 dbname=afg_lt sslmode=disable" -migrate=false -addr :8001
package main

import (
	"database/sql"
	"flag"
	"log"
	"net/http"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	gql "github.com/msupply-foundation/open-msupply/server-go/internal/graphql"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	_ "modernc.org/sqlite"
)

func main() {
	driver := flag.String("driver", "sqlite", "sqlite | postgres")
	dbPath := flag.String("db", "oms-go.sqlite", "SQLite database path")
	dsn := flag.String("dsn", "", "Postgres DSN")
	addr := flag.String("addr", ":8001", "listen address")
	doMigrate := flag.Bool("migrate", true, "run migrations on startup (set false for an already-initialised DB)")
	flag.Parse()

	var (
		conn    *sql.DB
		dialect db.Dialect
		err     error
	)
	switch *driver {
	case "postgres":
		dialect = db.Postgres
		conn, err = db.OpenPostgres(*dsn)
	default:
		dialect = db.SQLite
		conn, err = db.OpenSQLite(*dbPath)
	}
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer conn.Close()
	if err := conn.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	if *doMigrate {
		res, err := migrations.Migrate(conn, dialect, migrations.Registry(), nil)
		if err != nil {
			log.Fatalf("migrate: %v", err)
		}
		log.Printf("migrated to %s", res.FinalVersion)
	} else {
		log.Printf("skipping migration (reading already-initialised %s DB)", dialect)
	}

	http.Handle("/graphql", gql.NewHandler(conn, dialect))
	log.Printf("Go GraphQL server (%s) listening on %s/graphql", dialect, *addr)
	log.Fatal(http.ListenAndServe(*addr, nil))
}

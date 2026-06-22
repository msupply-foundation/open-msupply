// Command server runs the spike Go GraphQL server.
//
// SQLite (migrates on startup):
//
//	go run ./cmd/server -driver sqlite -db path.sqlite -addr :8001
//
// Postgres against an already-initialised DB (skip migration, read as-is):
//
//	go run ./cmd/server -driver postgres -dsn "host=localhost port=5433 dbname=afg_lt sslmode=disable" -migrate=false -addr :8001
package main

import (
	"database/sql"
	"flag"
	"log"
	"net/http"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	gql "github.com/msupply-foundation/open-msupply/server-go/internal/graphql"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
	"github.com/msupply-foundation/open-msupply/server-go/internal/seed"
	_ "modernc.org/sqlite"
)

func main() {
	driver := flag.String("driver", "sqlite", "sqlite | postgres")
	dbPath := flag.String("db", "oms-go.sqlite", "SQLite database path")
	dsn := flag.String("dsn", "", "Postgres DSN")
	addr := flag.String("addr", ":8001", "listen address")
	doMigrate := flag.Bool("migrate", true, "run migrations on startup (set false for an already-initialised DB)")
	jwtSecret := flag.String("jwt-secret", "dev-insecure-secret-change-me", "HS256 secret for auth tokens")
	corsOrigin := flag.String("cors-origin", "http://localhost:3003", "allowed frontend origin for CORS")
	noSSL := flag.Bool("no-ssl", true, "dev mode: serve plain HTTP and omit the Secure cookie attribute")
	doSeed := flag.Bool("seed", false, "seed a demo admin user + store on startup (idempotent)")
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

	if *doSeed {
		if err := seed.Seed(conn, dialect); err != nil {
			log.Fatalf("seed: %v", err)
		}
		if err := seed.Demo(conn, dialect); err != nil {
			log.Fatalf("seed demo data: %v", err)
		}
		log.Printf("seeded demo admin user (%s/%s) + store + demo dataset", seed.AdminUsername, seed.AdminPassword)
	}

	handler := gql.NewHandler(conn, dialect, gql.Config{
		JWTSecret:    []byte(*jwtSecret),
		AllowOrigin:  *corsOrigin,
		SecureCookie: !*noSSL,
	})
	http.Handle("/graphql", handler)
	log.Printf("Go GraphQL server (%s) listening on %s/graphql (cors origin %s)", dialect, *addr, *corsOrigin)
	log.Fatal(http.ListenAndServe(*addr, nil))
}

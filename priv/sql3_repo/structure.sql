CREATE TABLE IF NOT EXISTS "schema_migrations" ("version" INTEGER PRIMARY KEY, "inserted_at" TEXT);
CREATE TABLE IF NOT EXISTS "airports" ("id" INTEGER, "airport_id" TEXT, "name" TEXT, "city" TEXT, "country" TEXT, "latitude" NUMERIC, "longitude" NUMERIC, "hash" TEXT, PRIMARY KEY ("id","airport_id"));
CREATE TABLE IF NOT EXISTS "yjs_documents" ("id" TEXT DEFAULT 'yjs-doc' NOT NULL PRIMARY KEY, "y_doc" BLOB);
INSERT INTO schema_migrations VALUES(20250408185725,'2025-05-18T12:34:51');
INSERT INTO schema_migrations VALUES(20250515145916,'2025-05-18T12:34:51');

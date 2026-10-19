#!/bin/bash
# Dựng lại cơ sở dữ liệu thử từ đầu: stub Supabase + 4 file SQL.
set -e
cd "$(dirname "$0")/.."
P="psql -h /var/tmp/pgtest-vet -p 5544 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "DROP DATABASE IF EXISTS vettest" -c "CREATE DATABASE vettest"
$P -d vettest -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END \$\$"
sed -e '/^CREATE ROLE/d' test/00_stub_supabase.sql | $P -d vettest
for f in 01_schema.sql 02_logic.sql 03_rls.sql 04_storage.sql; do
  [ -f "$f" ] && { echo "== $f"; $P -d vettest -f "$f"; }
done
echo RESET_OK

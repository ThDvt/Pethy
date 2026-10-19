#!/bin/bash
# Bật PostgreSQL thử nghiệm nếu chưa chạy (cổng 5544).
pg_isready -q -h /var/tmp/pgtest-vet -p 5544 && exit 0
chown -R postgres /var/tmp/pgtest-vet 2>/dev/null
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/pgtest-vet/data -o '-p 5544 -k /var/tmp/pgtest-vet' -l /var/tmp/pgtest-vet/pg.log start" >/dev/null 2>&1
sleep 2

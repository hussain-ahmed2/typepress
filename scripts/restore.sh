#!/bin/bash
# Typepress Database Restore Script
#
# Restores a database from a backup file.
# Usage: ./scripts/restore.sh <backup_file>
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/typepress_*.sql.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

# Parse DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|://\([^:]*\):.*|\1|p')

echo "WARNING: This will overwrite the current database '${DB_NAME}'."
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Restoring from: ${BACKUP_FILE}"

# Decompress and restore
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DATABASE_URL##*:}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-acl

echo "Restore complete."

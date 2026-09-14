#!/bin/bash
# Typepress Database Backup Script
#
# Creates a timestamped backup of the PostgreSQL database.
# Usage: ./scripts/backup.sh
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string
#   BACKUP_DIR   - Directory to store backups (default: ./backups)
#   BACKUP_RETAIN - Number of backups to keep (default: 7)

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETAIN="${BACKUP_RETAIN:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/typepress_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Extract database connection details from DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

# Parse DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|://\([^:]*\):.*|\1|p')

echo "Backing up database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"

# Create backup
PGPASSWORD="${DATABASE_URL##*:}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_FILE}"

echo "Backup created: ${BACKUP_FILE}"
echo "Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Rotate old backups
echo "Rotating backups (keeping last ${BACKUP_RETAIN})..."
cd "${BACKUP_DIR}"
ls -t typepress_*.sql.gz 2>/dev/null | tail -n +$((BACKUP_RETAIN + 1)) | xargs -r rm --

echo "Backup complete. Files in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/typepress_*.sql.gz 2>/dev/null || echo "  (none)"

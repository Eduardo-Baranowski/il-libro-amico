#!/usr/bin/env sh
set -eu

echo "Aguardando banco de dados..."

MAX_ATTEMPTS="${DB_WAIT_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${DB_WAIT_SLEEP_SECONDS:-2}"
ATTEMPT=1

while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  if flask db upgrade >/dev/null 2>&1; then
    echo "Migrações aplicadas com sucesso."
    break
  fi

  echo "Banco indisponível (tentativa ${ATTEMPT}/${MAX_ATTEMPTS})."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$SLEEP_SECONDS"
done

if [ "$ATTEMPT" -gt "$MAX_ATTEMPTS" ]; then
  echo "Falha ao conectar no banco após ${MAX_ATTEMPTS} tentativas."
  exit 1
fi

python -c "from run import criar_admin_inicial; criar_admin_inicial()"

exec gunicorn --bind 0.0.0.0:5000 --workers "${GUNICORN_WORKERS:-2}" run:app

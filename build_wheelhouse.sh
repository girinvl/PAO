#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "[1/6] Python:"
$PYTHON_BIN --version

echo "[2/6] Пересоздаю виртуальное окружение..."
rm -rf .venv_wheelhouse .venv_wheelhouse_verify
$PYTHON_BIN -m venv .venv_wheelhouse

echo "[3/6] Обновляю pip только внутри venv..."
.venv_wheelhouse/bin/python -m pip install --upgrade pip setuptools wheel

echo "[4/6] Пересоздаю папку wheels с нуля..."
rm -rf wheels
mkdir -p wheels
.venv_wheelhouse/bin/python -m pip download --prefer-binary --dest wheels -r requirements.txt

echo "[5/6] Проверяю, что зависимости ставятся полностью офлайн..."
$PYTHON_BIN -m venv .venv_wheelhouse_verify
.venv_wheelhouse_verify/bin/python -m pip install --no-index --find-links=./wheels -r requirements.txt

echo "[6/6] Готово. Wheelhouse полный."
echo "Теперь переносите проект вместе с папкой wheels/ и запускайте:"
echo "  docker compose build --no-cache"
echo "  docker compose up"

# ==============================================================================
# Makefile for FlowTyping (SvelteKit)
#
# Единая точка входа для всех команд проекта.
# npm-скрипты намеренно вычищены — все таски только здесь.
# ==============================================================================

SHELL := /bin/bash

.PHONY: all help install sync clean dev build preview check test coverage lint lint-fix \
        spell knip storybook storybook-build check-all \
        corpus-process build-corpus import-corpus rebuild-selection-index ladder-report \
        next-batch reinstall-gemini-cli convex

all: help


# ==============================================================================
# HELP
# ==============================================================================

help:
	@echo "------------------------------------------------------------------"
	@echo " ✨ FlowTyping Makefile (SvelteKit) ✨"
	@echo "------------------------------------------------------------------"
	@echo "Доступные команды:"
	@echo ""
	@echo "  make install          - Установить зависимости + svelte-kit sync"
	@echo "  make sync             - Только svelte-kit sync (regenerate .svelte-kit/)"
	@echo "  make clean            - Удалить артефакты и зависимости"
	@echo ""
	@echo "  make dev              - vite dev (http://localhost:5173)"
	@echo "  make build            - Сборка статического SPA в build/"
	@echo "  make preview          - Preview production-сборки"
	@echo ""
	@echo "  make convex           - npx convex dev (sync с cloud dev deployment + auto-deploy функций)"
	@echo ""
	@echo "  make check            - svelte-check (типы Svelte+TS)"
	@echo "  make test             - vitest run"
	@echo "  make coverage         - vitest run --coverage (text-отчёт в консоли)"
	@echo "  make lint             - eslint ."
	@echo "  make lint-fix         - eslint . --fix"
	@echo "  make spell            - cspell на src + dictionaries + static + **/*.md (см. cspell.json)"
	@echo "  make knip             - knip: аудит неиспользуемых файлов/экспортов/зависимостей (см. knip.json)"
	@echo "  make check-all        - lint + check + test + spell + build + convex dev --once"
	@echo ""
	@echo "  make storybook        - storybook dev (http://localhost:6006)"
	@echo "  make storybook-build  - storybook static build"
	@echo ""
	@echo "  make corpus-process   - Auto-Flow: весь цикл — сборка + заливка + пересчёт таблицы отбора"
	@echo "  make build-corpus     - Auto-Flow: собрать drills.jsonl из корпуса (LAYOUT/INPUT/OUTPUT)"
	@echo "  make import-corpus    - Auto-Flow: залить drills.jsonl (replace) + пересчёт таблицы отбора"
	@echo "  make rebuild-selection-index - Auto-Flow: пересобрать drillSelectionIndex (после правки нарезки ladderStep)"
	@echo "  make ladder-report    - Auto-Flow: распределение корпуса по ступеням лестницы"
	@echo "  make next-batch       - Auto-Flow: дымовой вызов выдачи порции (LAYOUT/BUDGET_CHARS/SEED)"
	@echo "------------------------------------------------------------------"


# ==============================================================================
# PROJECT SETUP
# ==============================================================================

# node_modules - файл-маркер. Пересоздаётся только при изменении package*.json.
# После npm install обязательно дёргаем svelte-kit sync, т.к. lifecycle-hook
# `prepare` в package.json удалён.
node_modules: package.json package-lock.json
	@echo "📦 npm install..."
	npm install
	@echo "🔄 svelte-kit sync..."
	npx svelte-kit sync
	@touch node_modules

install: node_modules

sync: install
	@echo "🔄 svelte-kit sync..."
	npx svelte-kit sync

clean:
	@echo "🧹 Очистка проекта..."
	rm -rf node_modules .svelte-kit build dist coverage storybook-static tmp


# ==============================================================================
# DEVELOPMENT & PRODUCTION
# ==============================================================================

dev: install
	@echo "🚀 vite dev..."
	npx convex dev --once
	npx vite dev

build: install
	@echo "🏗️  vite build..."
	npx vite build

preview: build
	@echo "▶️  vite preview..."
	npx vite preview


# ==============================================================================
# TESTING & QUALITY
# ==============================================================================

test: install
	@echo "🧪 vitest run..."
	npx vitest run

coverage: install
	@echo "📊 vitest run --coverage..."
	npx vitest run --coverage

check: install
	@echo "🧐 svelte-check..."
	npx svelte-kit sync
	npx svelte-check --tsconfig ./tsconfig.json

lint: install
	@echo "🎨 eslint..."
	npx eslint .

lint-fix: install
	@echo "🔧 eslint --fix..."
	npx eslint . --fix

# CSpell сканирует код + витрину + словари + всю проектную документацию (README,
# CLAUDE.md, docs/**/*.md). Внешние артефакты (.agents/, .gemini/, convex/README.md
# auto-gen, tmp/, build/, dist/) выключены через ignorePaths в cspell.json.
spell: install
	@echo "🔤 cspell..."
	npx cspell --no-progress --show-suggestions\
		'src/**/*.{svelte,ts,css}' \
		'dictionaries/*.json' \
		'static/*.html' \
		'**/*.md'

# knip — аудит неиспользуемых файлов / экспортов / зависимостей. Конфиг в knip.json
# (alias @/, entry-скрипты, Makefile-инструменты в ignoreDependencies). Советующий,
# не гейт: часть находок — намеренная конвенция (типы *ContractToken, единый язык
# types.ts), поэтому knip не в check-all и target не падает на находках.
knip: install
	@echo "🔍 knip..."
	npx knip || true

check-dev: install
	npx eslint . --quiet --cache --cache-location node_modules/.cache/eslint/
	npx svelte-kit sync
	npx svelte-check --tsconfig ./tsconfig.json
	npx vitest run --reporter=dot --passWithNoTests
	@echo "✅ DEVELOPMENT проверки завершены!"

check-all: install
	npx eslint . --max-warnings 0
	$(MAKE) check test spell build
	npx convex dev --once
	@echo "✅ Все проверки завершены!"


# ==============================================================================
# DATA GENERATION
# ==============================================================================

# Auto-Flow: конвейер корпуса (Node нативно запускает .ts, без tsc/dist).
# INPUT — каталог со всеми *.txt (или один файл). LAYOUT/INPUT/OUTPUT переопределяемы.
LAYOUT ?= йцукен
INPUT ?= auto-flow/data
OUTPUT ?= auto-flow/data/drills.jsonl

# Весь цикл одной командой: сборка корпуса → заливка → пересчёт таблицы отбора.
corpus-process:
	@$(MAKE) build-corpus LAYOUT=$(LAYOUT) INPUT=$(INPUT) OUTPUT=$(OUTPUT)
	@$(MAKE) import-corpus LAYOUT=$(LAYOUT) OUTPUT=$(OUTPUT)

build-corpus:
	@echo "🏗️  Сборка корпуса из $(INPUT) под раскладку $(LAYOUT)..."
	node auto-flow/scripts/build-corpus.ts --layout "$(LAYOUT)" --input "$(INPUT)" --output "$(OUTPUT)"

# Заливка — APPEND (не replace): таблица drills общая для всех раскладок (билингва),
# --replace стёр бы чужую раскладку. rebuild берёт только свои drill'ы (membership,
# selectionIndex). ВНИМАНИЕ: append ДОБАВЛЯЕТ — повторная заливка ТОЙ ЖЕ раскладки
# дублирует drill'ы; при ре-курировании раскладку надо сперва очистить вручную.
import-corpus:
	@echo "☁️  Заливка $(OUTPUT) в drills (append) + пересчёт таблицы отбора ($(LAYOUT))..."
	npx convex import --table drills --append --format jsonLines --yes "$(OUTPUT)"
	@$(MAKE) rebuild-selection-index LAYOUT=$(LAYOUT)

# Auto-Flow: таблица отбора считается на сервере (drills не уезжают из Convex).
# Серверный rebuild берёт раскладку с шагами (src/data/layouts/*.json, ladderStep)
# напрямую, листает drills постранично и пишет drillSelectionIndex.
rebuild-selection-index:
	@echo "☁️  Пересборка drillSelectionIndex на сервере ($(LAYOUT))..."
	npx convex run selectionIndex:rebuild '{"symbolLayoutId":"$(LAYOUT)"}'

# Контентный радар: распределение корпуса по ступеням лестницы.
ladder-report:
	@npx convex run selectionIndex:ladderReport '{"symbolLayoutId":"$(LAYOUT)"}'

# Дымовой вызов выдачи порции (этап 1: фильтр по openedSteps + случайный выбор).
# Контракт в символах (ADR 0006): бюджет считает клиент, сервер про cpm не знает.
SEED ?= 1
BUDGET_CHARS ?= 300
next-batch:
	@npx convex run drill:drillNext '{"symbolLayoutId":"$(LAYOUT)","budgetChars":$(BUDGET_CHARS),"seed":$(SEED)}'


# ==============================================================================
# STORYBOOK
# ==============================================================================

storybook: install
	@echo "🎨 storybook dev..."
	npx storybook dev -p 6006

storybook-build: install
	@echo "📚 storybook build..."
	npx storybook build


# ==============================================================================
# CONVEX
# ==============================================================================

convex:
	npx convex dev

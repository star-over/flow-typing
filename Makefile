# ==============================================================================
# Makefile for FlowTyping (SvelteKit)
#
# Единая точка входа для всех команд проекта.
# npm-скрипты намеренно вычищены — все таски только здесь.
# ==============================================================================

SHELL := /bin/bash

.PHONY: all help install sync clean dev build preview check test lint lint-fix \
        storybook storybook-build check-all compile-verses generate-verses \
        normalize-rus-corp reinstall-gemini-cli

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
	@echo "  make check            - svelte-check (типы Svelte+TS)"
	@echo "  make test             - vitest run"
	@echo "  make lint             - eslint ."
	@echo "  make lint-fix         - eslint . --fix"
	@echo "  make check-all        - lint + check + test + build"
	@echo ""
	@echo "  make storybook        - storybook dev (http://localhost:6006)"
	@echo "  make storybook-build  - storybook static build"
	@echo ""
	@echo "  make generate-verses  - Сгенерировать данные стихов"
	@echo "  make normalize-rus-corp - Нормализовать русский корпус"
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

check-dev: install
	npx eslint . --quiet --cache --cache-location node_modules/.cache/eslint/
	npx svelte-kit sync
	npx svelte-check --tsconfig ./tsconfig.json
	npx vitest run --reporter=dot --passWithNoTests
	@echo "✅ DEVELOPMENT проверки завершены!"

check-all: install
	lint check test build
	@echo "✅ Все проверки завершены!"


# ==============================================================================
# DATA GENERATION
# ==============================================================================

compile-verses: install
	@echo "📄 Компиляция скрипта генерации стихов..."
	npx tsc --project tsconfig.scripts.json

generate-verses: compile-verses
	@echo "📝 Генерация данных стихов..."
	node dist/src/scripts/generate-verses.js

normalize-rus-corp:
	@echo "⚙️  Компиляция и запуск скрипта нормализации..."
	npx tsc --project tsconfig.scripts.json
	node dist/src/scripts/normalize-file.js


# ==============================================================================
# STORYBOOK
# ==============================================================================

storybook: install
	@echo "🎨 storybook dev..."
	npx storybook dev -p 6006

storybook-build: install
	@echo "📚 storybook build..."
	npx storybook build

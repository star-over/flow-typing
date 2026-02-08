# ==============================================================================
# Makefile for FlowTyping
#
# Этот файл централизует и упрощает запуск скриптов проекта.
# ==============================================================================

# SHELL - определяет оболочку для выполнения команд.
# Используем bash для лучшей совместимости и функциональности.
SHELL := /bin/bash

# .PHONY - объявляет цели, которые не связаны с файлами.
# Это предотвращает конфликты с одноименными файлами и ускоряет выполнение.
.PHONY: all help install clean dev build start test lint lint-fix type-check storybook storybook-build check-all compile-verses generate-verses
# Default - цель по умолчанию, которая выполняется при вызове `make` без аргументов.
all: help


# ==============================================================================
# HELP
# ==============================================================================

# help - отображает справку по доступным командам.
# Символ @ в начале строки подавляет вывод самой команды.
help:
	@echo "------------------------------------------------------------------"
	@echo " ✨ FlowTyping Makefile ✨"
	@echo "------------------------------------------------------------------"
	@echo "Доступные команды:"
	@echo ""
	@echo "  make install           - Установить все зависимости проекта (npm install)"
	@echo "  make clean             - Удалить сгенерированные артефакты и зависимости"
	@echo ""
	@echo "  make dev              - Запустить сервер для разработки (Next.js)"
	@echo "  make build            - Собрать проект для продакшена"
	@echo "  make start            - Запустить продакшен-сборку"
	@echo ""
	@echo "  make test             - Запустить тесты (Vitest)"
	@echo "  make lint             - Проверить код c помощью линтера (ESLint)"
	@echo "  make lint-fix         - Автоматически исправить ошибки линтера"
	@echo "  make type-check       - Проверить типы TypeScript (tsc)"
	@echo "  make check-all        - Выполнить все проверки (lint, type-check, test, build)"
	@echo ""
	@echo "  make storybook        - Запустить Storybook для разработки компонентов"
	@echo "  make storybook-build  - Собрать Storybook для публикации"
	@echo "------------------------------------------------------------------"


# ==============================================================================
# PROJECT SETUP
# ==============================================================================

# install - устанавливает зависимости через npm.
# node_modules является "файлом-маркером". Команда выполнится, только если
# эта директория отсутствует, что предотвращает лишние установки.
node_modules: package.json package-lock.json
	@echo "📦 Установка зависимостей..."
	npm install
	@touch node_modules # Создаем файл-маркер

install: node_modules


# clean - удаляет временные файлы, директории сборки и зависимости.
clean:
	@echo "🧹 Очистка проекта..."
	rm -rf .next
	rm -rf node_modules
	rm -rf coverage
	rm -rf storybook-static
	rm -rf dist


# ==============================================================================
# DEVELOPMENT & PRODUCTION
# ==============================================================================

# dev - запускает сервер разработки Next.js.
dev: install
	@echo "🚀 Запуск сервера для разработки..."
	npx next dev

# build - собирает production-версию приложения.
build: install generate-verses
	@echo "🏗️  Сборка проекта..."
	npx next build

# start - запускает собранное production-приложение.
start: build
	@echo "▶️  Запуск продакшен-сборки..."
	npx next start


# ==============================================================================
# TESTING & QUALITY
# ==============================================================================

# test - запускает тесты.
test: install
	@echo "🧪 Запуск тестов..."
	npx vitest run

# lint - проверяет стиль кода.
lint: install
	@echo "🎨 Проверка стиля кода..."
	npx eslint .

# lint-fix - автоматически исправляет ошибки стиля.
lint-fix: install
	@echo "🔧 Исправление ошибок стиля..."
	npx eslint . --fix

# type-check - запускает проверку типов TypeScript.
type-check: install
	@echo "🧐 Проверка типов TypeScript..."
	npx tsc --noEmit

# check-all - запускает все проверки: линтер, проверку типов, тесты, сборку проекта и сборку Storybook.
check-all: lint type-check test
	@echo "✅ Все проверки завершены!"


# ==============================================================================
# DATA GENERATION
# ==============================================================================

# compile-verses - компилирует TypeScript скрипт для генерации стихов.
compile-verses: install
	@echo "📄 Компиляция скрипта генерации стихов..."
	npx tsc --project tsconfig.scripts.json

# generate-verses - запускает скрипт для генерации и обновления данных стихов.
generate-verses: compile-verses
	@echo "📝 Генерация и обновление данных стихов..."
	node dist/src/scripts/generate-verses.js


# ==============================================================================
# STORYBOOK
# ==============================================================================

# storybook - запускает Storybook.
storybook: install
	@echo "🎨 Запуск Storybook..."
	npx storybook dev -p 6006

# storybook-build - собирает статическую версию Storybook.
storybook-build: install
	@echo "📚 Сборка Storybook..."
	npx storybook build


# ==============================================================================
# EXTERNAL TOOLS
# ==============================================================================

# reinstall-gemini-cli - выполняет принудительную переустановку @google/gemini-cli.
# Эта команда решает проблему с ошибкой ENOTEMPTY, которая возникает из-за
# поврежденного состояния пакета, принудительно удаляя его директорию.
.PHONY: reinstall-gemini-cli
reinstall-gemini-cli:
	@echo "🔥 Принудительная переустановка @google/gemini-cli..."
	@echo "1/3: Очистка кэша npm..."
	npm cache clean --force
	@echo "2/3: Определение пути к глобальным модулям и принудительное удаление пакета..."
	$(eval NPM_GLOBAL_ROOT := $(shell npm root -g))
	rm -rf "$(NPM_GLOBAL_ROOT)/@google/gemini-cli"
	@echo "3/3: Установка последней версии..."
	npm install -g @google/gemini-cli@latest
	@echo "✅ @google/gemini-cli успешно переустановлен."

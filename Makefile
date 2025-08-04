# Chrome TabBoost Extension Makefile

.PHONY: help dev build clean test release package version format

# Default target
help:
	@echo "TabBoost Chrome Extension Build System"
	@echo ""
	@echo "Development:"
	@echo "  dev        - Build for development"
	@echo "  start      - Start webpack dev server"
	@echo "  clean      - Clean build directories"
	@echo ""
	@echo "Production:"
	@echo "  build      - Build for production"
	@echo "  package    - Build and package extension"
	@echo "  zip        - Build and create ZIP for Chrome Web Store"
	@echo "  release    - Validate and create release ZIP"
	@echo ""
	@echo "Testing:"
	@echo "  test       - Run Jest test suite"
	@echo "  test-watch - Run tests in watch mode"
	@echo "  test-ci    - Run tests for CI environment"
	@echo "  coverage   - Run tests with coverage report"
	@echo ""
	@echo "Version Management:"
	@echo "  patch      - Bump patch version (x.x.X)"
	@echo "  minor      - Bump minor version (x.X.x)"
	@echo "  major      - Bump major version (X.x.x)"
	@echo "  changelog  - Generate changelog"
	@echo ""
	@echo "Code Quality:"
	@echo "  format     - Format code with Prettier"
	@echo "  format-check - Check code formatting"
	@echo "  validate   - Validate build output"
	@echo ""
	@echo "Publishing:"
	@echo "  publish    - Publish to Chrome Web Store"
	@echo "  publish-test - Publish to trusted testers"

# Development targets
dev:
	npm run dev

start:
	npm run start

clean:
	npm run clean

# Production targets
build:
	npm run build

package: build
	npm run package

zip: build
	npm run zip

release:
	npm run release

validate: build
	npm run validate

# Testing targets
test:
	npm run test

test-watch:
	npm run test:watch

test-ci:
	npm run test:ci

coverage:
	npm run test:coverage

# Version management
patch:
	npm run version:patch

minor:
	npm run version:minor

major:
	npm run version:major

changelog:
	npm run changelog

# Code quality
format:
	npm run format

format-check:
	npm run format:check

# Publishing
publish:
	npm run publish

publish-test:
	npm run publish:test

# Convenience aliases
watch: test-watch
fmt: format
check: format-check
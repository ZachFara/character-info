# `make check` is the single gate. The pre-commit hook and CI both run exactly this.
.PHONY: check setup format

check:
	npx prettier --check .
	npx eslint . --max-warnings 0
	npx tsc --noEmit
	npx knip
	npx depcruise src test --config .dependency-cruiser.cjs
	node scripts/check-layout.mjs
	npm test
	npm run build

setup:
	npm install
	git config core.hooksPath .githooks

format:
	npx prettier --write .

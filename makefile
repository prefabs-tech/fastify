build:
	@printf "\033[0;32m>>> Build packages\033[0m\n"
	pnpm build

install:
	@printf "\033[0;32m>>> Installing dependencies\033[0m\n"
	pnpm -r install

lint:
	@printf "\033[0;32m>>> Lint code\033[0m\n"
	pnpm lint

lint.fix:
	@printf "\033[0;32m>>> Lint code\033[0m\n"
	pnpm lint:fix

outdated:
	@printf "\033[0;32m>>> Check for outdated dependencies\033[0m\n"
	pnpm -r outdated

publish:
	@printf "\033[0;32m>>> Publish packages\033[0m\n"
	npx shipjs trigger

release:
	@printf "\033[0;32m>>> Prepare packages for release\033[0m\n"
	npx shipjs prepare

sort-package:
	@printf "\033[0;32m>>> Format package.json\033[0m\n"
	pnpm sort-package

test:
	@printf "\033[0;32m>>> Running tests\033[0m\n"
	pnpm test

test.ci:
	@printf "\033[0;32m>>> Running tests\033[0m\n"
	pnpm test:ci

test.integration:
	@printf "\033[0;32m>>> Running integration tests\033[0m\n"
	pnpm test:integration

test.unit:
	@printf "\033[0;32m>>> Running unit tests\033[0m\n"
	pnpm test:unit

typecheck:
	@printf "\033[0;32m>>> Running Type check\033[0m\n"
	pnpm typecheck

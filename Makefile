# Configuration
SERVICE=foodyapp
DOCKER_COMPOSE=docker-compose
ENV_FILE=.env
DOCKER_ENV_FILE=.env.docker

# Colors for pretty output
GREEN := $(shell tput setaf 2)
YELLOW := $(shell tput setaf 3)
RESET := $(shell tput sgr0)

.PHONY: help build up down restart logs clean-db clean-volumes clean check-env install dev test
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${YELLOW}%-15s${RESET} %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check-env: ## Verify that required environment variables are set
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Warning: $(ENV_FILE) file not found$(RESET)"; \
		exit 1; \
	fi

build: check-env ## Build or rebuild services
	@echo "$(GREEN)Building services...$(RESET)"
	$(DOCKER_COMPOSE) build --no-cache

up: check-env ## Start services in detached mode
	@echo "$(GREEN)Starting services...$(RESET)"
	$(DOCKER_COMPOSE) up --pull always -d --wait

down: ## Stop and remove containers, networks
	@echo "$(GREEN)Stopping services...$(RESET)"
	$(DOCKER_COMPOSE) down

restart: down up ## Restart all services

logs: ## View output from containers
	$(DOCKER_COMPOSE) logs -f $(SERVICE)

dev: up ## Start development environment
	@echo "$(GREEN)Development environment is ready!$(RESET)"
	@echo "$(YELLOW)Watching logs... Press Ctrl+C to stop$(RESET)"
	$(MAKE) logs

clean-db: down ## Remove database volume and containers
	@echo "$(YELLOW)Removing database volume...$(RESET)"
	docker volume rm $$(docker volume ls -q | grep pgdata) || true

clean-volumes: ## Remove all unused volumes
	@echo "$(YELLOW)Removing unused volumes...$(RESET)"
	docker volume prune -f

clean: clean-volumes ## Remove unused containers, networks, volumes, and images
	@echo "$(YELLOW)Cleaning up Docker resources...$(RESET)"
	docker system prune -f

# Database commands
db-shell: ## Open database shell
	@echo "$(GREEN)Opening database shell...$(RESET)"
	$(DOCKER_COMPOSE) exec db psql -U myuser -d foodmanager

# Prisma commands
prisma-generate: ## Generate Prisma client
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma generate

prisma-migrate: ## Create a new migration
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma migrate dev

prisma-migrate-name: ## Create a new migration with a specific name (usage: make prisma-migrate-name name=migration_name)
	@if [ -z "$(name)" ]; then \
		echo "$(YELLOW)Error: Please provide a migration name (e.g., make prisma-migrate-name name=add_users_table)$(RESET)"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma migrate dev --name $(name)

prisma-seed: ## Seed the database
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma db seed

prisma-migrate-deploy: ## Deploy migrations in production
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma migrate deploy

prisma-studio: ## Start Prisma Studio
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma studio

# Testing and linting
test: ## Run tests
	$(DOCKER_COMPOSE) exec $(SERVICE) npm test

lint: ## Run linter
	$(DOCKER_COMPOSE) exec $(SERVICE) npm run lint

lint-fix: ## Fix linting issues
	$(DOCKER_COMPOSE) exec $(SERVICE) npm run lint:fix

# Application commands
npm-install: ## Install npm dependencies
	$(DOCKER_COMPOSE) exec $(SERVICE) npm install

shell: ## Open a shell in the application container
	$(DOCKER_COMPOSE) exec $(SERVICE) /bin/bash

# PDF Manager Docker Commands

.PHONY: help build up down restart logs clean install-backend install-frontend shell-backend shell-frontend test

help: ## Show this help message
	@echo "PDF Manager Development Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker containers
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs only
	docker-compose logs -f backend

logs-celery: ## View celery worker logs only
	docker-compose logs -f celery

clean: ## Stop containers and remove volumes
	docker-compose down -v
	docker system prune -f

install-backend: ## Install backend dependencies
	docker-compose exec backend pip install -r requirements.txt

install-frontend: ## Install frontend dependencies
	docker-compose exec frontend npm install

shell-backend: ## Access backend container shell
	docker-compose exec backend bash

shell-frontend: ## Access frontend container shell
	docker-compose exec frontend sh

shell-db: ## Access PostgreSQL shell
	docker-compose exec db psql -U postgres -d pdf_manager

shell-redis: ## Access Redis CLI
	docker-compose exec redis redis-cli

test-backend: ## Run backend tests
	docker-compose exec backend pytest

migrate: ## Run database migrations
	docker-compose exec backend alembic upgrade head

create-migration: ## Create new migration (usage: make create-migration NAME=migration_name)
	docker-compose exec backend alembic revision --autogenerate -m "$(NAME)"

dev: ## Start development environment
	@echo "Starting PDF Manager development environment..."
	@make up
	@echo ""
	@echo "✅ Development environment is ready!"
	@echo ""
	@echo "📊 Service URLs:"
	@echo "   - Backend API: http://localhost:8000"
	@echo "   - Frontend: http://localhost:3000"
	@echo "   - API Docs: http://localhost:8000/docs"
	@echo "   - Flower (Celery): http://localhost:5555"
	@echo ""
	@echo "📝 View logs with: make logs"

status: ## Show status of all services
	docker-compose ps

stop-backend: ## Stop only backend service
	docker-compose stop backend

stop-frontend: ## Stop only frontend service
	docker-compose stop frontend

rebuild-backend: ## Rebuild and restart backend
	docker-compose stop backend celery
	docker-compose build backend
	docker-compose up -d backend celery

rebuild-frontend: ## Rebuild and restart frontend
	docker-compose stop frontend
	docker-compose build frontend
	docker-compose up -d frontend
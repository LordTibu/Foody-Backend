SERVICE=foodyapp
DOCKER_COMPOSE=docker-compose

build:
	$(DOCKER_COMPOSE) build --no-cache

up:
	$(DOCKER_COMPOSE) up --pull always -d --wait

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) down && $(DOCKER_COMPOSE) up --build

logs:
	$(DOCKER_COMPOSE) logs -f $(SERVICE)

clean-db:
	$(DOCKER_COMPOSE) down
	docker volume rm $$(docker volume ls -q | grep pgdata) || true

clean-volumes:
	docker volume prune -f

clean:
	docker volume prune -f
	docker system prune -f

prisma-generate:
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma generate

prisma-migrate:
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma migrate dev --name init

prisma-seed:
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma db seed

prisma-migrate-deploy:
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma migrate deploy

prisma-studio:
	$(DOCKER_COMPOSE) exec $(SERVICE) npx prisma studio

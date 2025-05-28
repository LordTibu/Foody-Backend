SERVICE=foodyapp

build:
	docker-compose build --no-cache

up:
	docker-compose up --pull always -d --wait

down:
	docker-compose down

restart:
	docker-compose down && docker-compose up --build

clean-db:
	-docker volume rm $$(docker volume ls -q | grep pgdata) || true

clean-volumes:
	docker volume prune -f

clean:
	docker volume prune -f
	docker system prune -f

prisma-generate:
	docker-compose exec $(SERVICE) npx prisma generate

prisma-migrate:
	docker-compose exec $(SERVICE) npx prisma migrate dev --name init

prisma-seed:
	docker-compose exec $(SERVICE) npx prisma db seed

prisma-migrate-deploy:
	docker-compose exec $(SERVICE) npx prisma migrate deploy

prisma-studio:
	docker-compose exec $(SERVICE) npx prisma studio

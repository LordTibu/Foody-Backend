# Foody Backend

A modern Node.js/Express backend for managing recipes and ingredients with AI-powered recipe suggestions.

## Features

- 🔐 User Authentication (JWT with refresh tokens)
- 📝 Recipe Management
  - Create, read, update, and delete recipes
  - AI-powered recipe suggestions based on available ingredients
  - Structured recipe format with preparation, cooking, and plating steps
- 🥕 Ingredient Management
  - Track available ingredients
  - Automatic ingredient creation for recipes
  - Ingredient-recipe relationships
- 🔄 Database Integration
  - PostgreSQL with Prisma ORM
  - Transaction support for data consistency
- 🐳 Docker Support
  - Containerized application and database
  - Easy development setup
- 🧪 API Testing
  - Bruno API collection included
  - Test scripts for endpoints

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Make (optional, for using Makefile commands)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Foody-Backend
   ```

2. Create a `.env` file:
   ```env
   DATABASE_URL="postgres://myuser:mypassword@localhost:5432/foodmanager"
   JWT_SECRET="your-jwt-secret"
   REFRESH_SECRET="your-refresh-secret"
   COOKIE_SECRET="your-cookie-secret"
   GROQ_API_KEY="your-groq-api-key"
   ```

3. Start the application:
   ```bash
   # Using Make
   make dev

   # Or using Docker Compose directly
   docker-compose up --build
   ```

The API will be available at `http://localhost:3000`.

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/refresh` - Refresh access token
- POST `/api/auth/logout` - Logout user

### Recipes
- GET `/api/recipes` - Get all recipes
- POST `/api/recipes` - Create a new recipe
- GET `/api/recipes/:id` - Get recipe by ID
- PUT `/api/recipes/:id` - Update recipe
- DELETE `/api/recipes/:id` - Delete recipe
- POST `/api/recipes/suggestions` - Get AI-powered recipe suggestions
- POST `/api/recipes/save-suggestion` - Save an AI-generated recipe

### Ingredients
- GET `/api/ingredients` - Get all ingredients
- POST `/api/ingredients` - Add new ingredient
- PUT `/api/ingredients/:id` - Update ingredient
- DELETE `/api/ingredients/:id` - Delete ingredient

### Recipe Ingredients
- POST `/api/recipe-ingredients` - Add ingredients to recipe
- DELETE `/api/recipe-ingredients` - Remove ingredient from recipe

## Development

### Database Management
```bash
# Generate Prisma client
make prisma-generate

# Run migrations
make prisma-migrate

# Seed database
make prisma-seed
```

### Testing API Endpoints
The project includes a Bruno API collection in the `Foody-App` directory for testing endpoints.

### Available Make Commands
- `make build` - Build services
- `make up` - Start services
- `make down` - Stop services
- `make dev` - Start development environment
- `make logs` - View logs
- `make clean` - Clean up Docker resources
- `make db-shell` - Open database shell
- `make prisma-studio` - Start Prisma Studio

## Project Structure

```
.
├── Foody-App/          # Bruno API collection
├── prisma/             # Database schema and migrations
├── routes/             # API routes
│   ├── auth.js         # Authentication routes
│   ├── recipes.js      # Recipe management
│   ├── ingredients.js  # Ingredient management
│   └── ...
├── utils/             # Utility functions
├── app.js            # Express application setup
├── Dockerfile        # Application container
└── docker-compose.yml # Container orchestration
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection URL | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| REFRESH_SECRET | Secret for refresh tokens | Yes |
| COOKIE_SECRET | Secret for cookie signing | Yes |
| GROQ_API_KEY | API key for Groq AI | Yes |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
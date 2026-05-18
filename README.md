# Warehouse Management System (WMS)

A full-stack warehouse management system built with Node.js, Express, Prisma, PostgreSQL, and React.

## Project Structure

```
warehouse-wms/
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── config/   # Configuration files
│   │   ├── middleware/ # Express middleware
│   │   ├── modules/  # Feature modules (auth, inventory, orders, etc.)
│   │   └── app.ts    # Main application entry
│   └── prisma/       # Database schema and migrations
├── frontend/         # React frontend application
└── docker-compose.yml # Docker setup for local development
```

## Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens and RBAC
- **Inventory Management**: Track stock levels, locations, and movements
- **Order Processing**: Manage incoming and outgoing orders
- **Customer Management**: Handle customer data and addresses
- **Audit Trail**: Track all inventory adjustments
- **Real-time Stock**: Automatic stock level updates

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/inventory` - Get all inventory items
- `POST /api/orders` - Create new order
- `GET /api/customers` - Get all customers
- `GET /api/health` - Health check endpoint

## License

MIT
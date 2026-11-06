# ReconIQ

**Intelligent Financial Reconciliation for Indian E-Commerce**

ReconIQ automates the reconciliation of orders, settlements, freight charges, COD remittances, and returns across marketplace partners like Amazon, Flipkart, Myntra, and Meesho. Built for Indian e-commerce sellers and D2C brands to recover lost revenue and eliminate manual spreadsheet work.

---

## ✨ Features

- **Multi-Partner Reconciliation** — Reconcile across Amazon, Flipkart, Myntra, Meesho, and more
- **Smart Column Mapping** — AI-assisted mapping of partner-specific CSV/Excel formats to a canonical schema
- **Automated Matching** — Multi-pass matching engine (exact → fuzzy → manual review)
- **Discrepancy Detection** — Automatic identification of short payments, overcharges, missing settlements, and weight discrepancies
- **Claims Management** — Generate, track, and manage recovery claims with full lifecycle support
- **Financial Accuracy** — All calculations use Decimal/NUMERIC — never floating-point
- **Multi-Tenant** — Organization-scoped data isolation with role-based access control
- **Real-Time Dashboard** — Visual overview of reconciliation status, recovery metrics, and trends
- **Audit Trail** — Complete history of every reconciliation run, match, and resolution

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Auth | Argon2 + JWT (python-jose) |
| AI | Ollama (local LLM, optional) |
| Infrastructure | Docker, Docker Compose |

---

## 📋 Prerequisites

- **Python** 3.12+
- **Node.js** 20+
- **Docker** & **Docker Compose** (for PostgreSQL and Redis)
- **Git**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/reconiq.git
cd reconiq
```

### 2. Start Infrastructure Services

```bash
docker-compose up -d
```

This starts PostgreSQL 16 and Redis 7 in containers.

### 3. Set Up the Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (already provided for dev)
# Edit .env if needed

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

### 4. Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc

---

## 📁 Project Structure

```
reconiq/
├── backend/
│   ├── app/
│   │   ├── core/              # Config, database, security, dependencies
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication & authorization
│   │   │   ├── uploads/       # File upload & parsing
│   │   │   ├── mappings/      # Column mapping & templates
│   │   │   ├── normalization/ # Data normalization
│   │   │   ├── reconciliation/# Matching engine
│   │   │   ├── discrepancies/ # Discrepancy detection
│   │   │   ├── claims/        # Claims management
│   │   │   └── ai/           # AI-assisted features
│   │   └── main.py           # FastAPI application entry point
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Test suite
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client
│   │   └── types/             # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── docs/                      # Architecture & design documentation
├── sample_data/               # Sample CSV files for testing
├── storage/
│   ├── uploads/               # Uploaded files
│   └── exports/               # Generated exports
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 📊 API Documentation

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login and get access token |
| POST | `/api/v1/uploads` | Upload a CSV/Excel file |
| GET | `/api/v1/uploads` | List uploaded files |
| POST | `/api/v1/mappings` | Create column mapping |
| POST | `/api/v1/reconciliation/runs` | Start a reconciliation run |
| GET | `/api/v1/discrepancies` | List discrepancies |
| POST | `/api/v1/claims` | Generate a claim |

---

## 📂 Sample Data

The `sample_data/` directory contains realistic test datasets:

| File | Description | Rows |
|---|---|---|
| `orders.csv` | E-commerce orders (Amazon, Flipkart) | 20 |
| `settlements.csv` | Partner settlement data with commissions & deductions | 20 |
| `cod_remittances.csv` | Cash-on-delivery remittance records | 15 |
| `freight_invoices.csv` | Courier freight invoices with weight details | 20 |
| `returns.csv` | Product return and refund records | 10 |

The data includes intentional discrepancies for testing:
- Short payments in settlements
- Weight overcharges in freight invoices
- Missing settlements for some orders
- Partial COD remittances
- Duplicate settlement entries

---

## 🔧 Development Workflow

### Running the Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Creating a Database Migration

```bash
cd backend
alembic revision --autogenerate -m "description of changes"
alembic upgrade head
```

### Running the Frontend

```bash
cd frontend
npm run dev
```

### Code Formatting

```bash
# Backend
ruff check --fix .
ruff format .

# Frontend
npm run lint
npm run format
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test module
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Run with coverage
npm run test:coverage
```

---

## 📄 Documentation

- [Architecture](docs/architecture.md) — System design, modules, and principles
- [Database Design](docs/database_design.md) — ER diagrams, schema, and indexing
- [Data Flow](docs/data_flow.md) — Detailed flow diagrams for all processes
- [Deployment](deployment.md) — Setup and deployment guide

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

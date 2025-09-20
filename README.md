# PDF Manager - AI-Powered Document Management System

A full-stack web application that allows users to upload, manage, and interact with PDF documents using AI-powered features including OCR, document analysis, and intelligent chat capabilities.

## Features

- **Document Upload & Management**: Upload and organize PDF documents
- **OCR Processing**: Extract text from scanned documents using advanced OCR technology
- **AI-Powered Chat**: Interact with your documents using AI assistants (Ollama, Local AI)
- **Multi-language Support**: Available in English and French with i18n support
- **Dark/Light Theme**: Toggle between dark and light themes
- **User Authentication**: Secure user registration and login system
- **Real-time Processing**: Background task processing with Celery
- **Responsive Design**: Modern, responsive UI built with Tailwind CSS

## Technologies Used

### Backend

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and Object-Relational Mapping (ORM)
- **Alembic**: Database migration tool
- **Celery**: Distributed task queue for background processing
- **Redis**: Message broker for Celery
- **PostgreSQL**: Primary database
- **Python 3.9+**: Programming language

### Frontend

- **Next.js**: React framework for production
- **React**: JavaScript library for building user interfaces
- **TypeScript**: Typed superset of JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **next-i18next**: Internationalization framework

### AI Services

- **Ollama**: Local AI model serving
- **Local AI**: Alternative local AI service
- **Custom AI Service**: Abstraction layer for AI providers

### DevOps & Tools

- **Docker**: Containerization platform
- **Docker Compose**: Multi-container Docker applications
- **JWT**: JSON Web Tokens for authentication

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** and **Docker Compose**
- **Node.js** (v16 or higher)
- **Python** (v3.9 or higher)
- **Git**

## Quick Start with Docker

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pdf-manager
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**

   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Manual Setup

### Backend Setup

1. **Navigate to backend directory**

   ```bash
   cd backend
   ```

2. **Create virtual environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up database**

   ```bash
   # Make sure PostgreSQL is running
   alembic upgrade head
   ```

5. **Start Redis (for Celery)**

   ```bash
   redis-server
   ```

6. **Start Celery worker**

   ```bash
   celery -A app.celery_app worker --loglevel=info
   ```

7. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## AI Services Setup

### Ollama Setup

1. Install Ollama following the instructions in `OLLAMA_SETUP.md`
2. Pull required models:
   ```bash
   ollama pull llama2
   ollama pull mistral
   ```

### Local AI Setup

1. Follow the instructions in `LOCAL_AI_SETUP.md`
2. Configure the service in your `.env` file

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost/pdf_manager

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_URL=redis://localhost:6379

# AI Services
OLLAMA_BASE_URL=http://localhost:11434
LOCAL_AI_BASE_URL=http://localhost:8080
```

## API Documentation

Once the backend is running, you can access the interactive API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
pdf-manager/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── services/       # AI and file services
│   │   ├── tasks/          # Celery tasks
│   │   ├── models.py       # Database models
│   │   ├── auth.py         # Authentication
│   │   └── main.py         # FastAPI app
│   ├── alembic/            # Database migrations
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend
│   ├── components/         # React components
│   ├── pages/              # Next.js pages
│   ├── context/            # React contexts
│   ├── styles/             # CSS styles
│   └── public/locales/     # i18n translations
├── docker-compose.yml      # Docker services
└── README.md              # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

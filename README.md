# 📑 Intelligent Document Q&A System

A RAG (Retrieval-Augmented Generation) platform designed to ingest multiple document formats and provide natural language answers backed by verifiable source citations.

## 🏗️ Architecture & Design Thinking

This project focuses on a modular architecture that separates data ingestion from the query interface, ensuring the system remains performant even as document libraries grow.

### 1. The Core Tech Stack

**Frontend**: React.js (State Management, Typewriter UI, Auth-Guards).

**Backend**: FastAPI (Async endpoints for high-concurrency document processing).

**LLM**: Google Gemini Pro (Used for its 1M+ token context window and reasoning capabilities).

**Vector Database:** ChromaDB (Handles high-dimensional similarity searches).

**Authentication:** Firebase Auth (Provides secure Role-Based Access Control).

## 🔐 Key Features & Design Decisions

### 1. Verifiable Source Citations

**The Problem:** LLMs can "hallucinate" information that isn't in the documents.

**Our Solution:** When documents are embedded into ChromaDB, we attach metadata to every text chunk.

**Execution:** During retrieval, the most relevant chunks are sent to the LLM. We then extract the source names from the metadata and display them as "Source Chips" in the UI. This allows the user to click and verify exactly which file provided the answer.

### 2. Role-Based Access Control (RBAC)

**Admin Mode:** Full access to the "Knowledge Base." Admins can upload new documents, view the file inventory, and clear the database.

**User Mode:** Restricted to "Query Only." Users can ask questions but cannot modify the underlying data, ensuring system integrity.

### 3. Asynchronous Ingestion Pipeline

To prevent the UI from freezing during large file uploads, the backend uses FastAPI's background_tasks. This allows the Admin to continue using the app while the system splits, embeds, and stores the new data in the background.

## 🚀 Getting Started (The Single Command)

This system is fully containerized. Docker-compose handles the networking between the React frontend and Python backend automatically.

### Prerequisites

Docker & Docker Compose installed.

A Google Gemini API Key.

### Quick Start

Clone this repository.

Open docker-compose.yml and paste your GOOGLE_API_KEY in the environment section.

Run:

```bash
docker-compose up --build

Frontend Access: http://localhost:3000

API Documentation: http://localhost:8000/docs

```

## 💡 Trade-offs & Future Roadmap

**The Challenge:** As the number of uploaded documents increases, the "Top-K" retrieval process can sometimes fetch irrelevant context from similar but unrelated files. This "noise" can lead to less precise answers from the LLM.

**Trade-off:** To keep the system simple and fast for this assignment, we used a standard Vector-Only Retrieval.

**Design Thinking:** In a production environment, we would mitigate this by implementing Reranking (using a Cross-Encoder to score the chunks before sending them to the LLM) or Metadata Filtering to narrow the search to specific document categories.

**Future - Hybrid Search:** Implementation of BM25 Keyword Search alongside Vector Search to improve accuracy for specific technical terms or unique IDs that semantic search sometimes misses.

**Future - Persistence:** Currently, the vector store persists to a Docker volume. Moving to a dedicated managed database would improve disaster recovery for enterprise-scale deployments.

# How to Run

1. **Clone the repo:** `git clone <your-url>`
2. **Configure:** Open `docker-compose.yml` and add your `GOOGLE_API_KEY`.
3. **Launch:** Run `docker-compose up --build`.
4. **Access:** - Frontend: `http://localhost:3000`
   - API Docs: `http://localhost:8000/docs`

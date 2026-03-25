from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from sentence_transformers import SentenceTransformer
#from sentence_transformers import CrossEncoder
from pypdf import PdfReader
from docx import Document
from typing import List
from io import BytesIO
from google.genai import Client

# Initialize Gemini Client
clients = Client(api_key="AIzaSyBvcTDRFPIpBxzpJLwnn1BY4k1xZVrm33U") 
model_name = "models/gemini-flash-latest"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB Client
db_client = chromadb.Client()
# We don't define 'collection' globally here to avoid stale references

# Embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
#embedding_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
@app.post("/upload")
async def upload(files: List[UploadFile] = File(...)):
    # Always get or create the collection inside the route
    collection = db_client.get_or_create_collection(name="docs")
    
    # 1. Safer way to clear previous documents
    try:
        all_docs = collection.get()
        if all_docs['ids']:
            collection.delete(ids=all_docs['ids'])
    except:
        pass # Collection might be empty or fresh

    all_chunks = []
    all_embeddings = []
    all_ids = []
    all_metadata = []

    for file in files:
        content = await file.read()
        text = ""

        if file.filename.endswith(".pdf"):
            reader = PdfReader(BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() or ""
        elif file.filename.endswith(".docx"):
            doc = Document(BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            try:
                text = content.decode("utf-8")
            except:
                text = ""

        # Chunking
        chunks = [text[i:i+500] for i in range(0, len(text), 500)]
        if not chunks:
            continue

        embeddings = embedding_model.encode(chunks).tolist()
        ids = [f"{file.filename}_{i}" for i in range(len(chunks))]

        all_chunks.extend(chunks)
        all_embeddings.extend(embeddings)
        all_ids.extend(ids)
        all_metadata.extend([{"source": file.filename}] * len(chunks))

    if not all_chunks:
        return {"message": "No readable text found"}

    collection.add(
        documents=all_chunks,
        embeddings=all_embeddings,
        ids=all_ids,
        metadatas=all_metadata
    )

    return {"message": f"{len(files)} files uploaded successfully"}

@app.post("/query")
def query(q: str):
    # Get collection dynamically
    collection = db_client.get_or_create_collection(name="docs")
    
    query_embedding = embedding_model.encode([q]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=3)

    all_chunks = results["documents"][0] if results["documents"] else []
    all_metadatas = results["metadatas"][0] if results["metadatas"] else []

    if not all_chunks:
        return {"answer": "No relevant info found in docs.", "sources": []}

    context = "\n\n".join(all_chunks)
    
    prompt = f"""
    You are a strict filtering assistant. 
The user is asking ONLY about: "{q}".
RULES:
Using ONLY the context below, provide a structured summary. 
If context is about specific person limits within the person information,
If the context contains information about different people or documents list any one relevent to the question,
If the context does not contain the answer, or if the context is empty, respond ONLY with: "I'm sorry, I couldn't find any information regarding that in the uploaded documents."
Do NOT mention "Based on the provided context" or "There is no information,
Do NOT hallucinate or use outside knowledge
Context:
{context}

Question: {q}
"""
    
    response = clients.models.generate_content(model=model_name, contents=prompt)
    unique_sources = list({meta.get('source', 'Unknown') for meta in all_metadatas})

    return {
        "answer": response.text.strip() if response.text else "No answer found",
        "sources": unique_sources
    }
    
@app.post("/clear")
async def clear_data():
    try:
        # Delete and recreate to wipe everything physically
        db_client.delete_collection(name="docs") 
        db_client.get_or_create_collection(name="docs")
        return {"message": "Database and chat history cleared successfully"}
    except Exception as e:
        # If it fails (e.g. doesn't exist), just ensure it's created
        db_client.get_or_create_collection(name="docs")
        return {"message": "Database was already empty or has been reset"}
    
@app.get("/files")
async def get_files():
    """✅ NEW: Returns a unique list of uploaded filenames for the Admin Sidebar"""
    try:
        collection = db_client.get_or_create_collection(name="docs")
        results = collection.get(include=['metadatas'])
        metadatas = results.get('metadatas', [])
        
        # Extract unique filenames from 'source' key
        unique_files = list(set([m.get('source') for m in metadatas if m.get('source')]))
        return {"files": unique_files}
    except Exception as e:
        return {"files": [], "error": str(e)}
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
from docx import Document
from typing import List
from io import BytesIO
from google.genai import Client

clients = Client(api_key="AIzaSyDGi-oM1FcYhiGu0aoA0Q23i86ArgK2u28")
model_name = "models/gemini-flash-latest"  # choose one of your available models

app = FastAPI()

# Allow frontend
app.add_middleware(
    CORSMiddleware,
    #allow_origins=["*"],
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vector DB
client = chromadb.Client()
collection = client.get_or_create_collection(name="docs")

# Embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Store documents
@app.post("/upload")
async def upload(files: List[UploadFile] = File(...)):
   
   # Delete all previous documents before adding new ones
    all_docs = collection.get()
    all_ids = all_docs['ids']
    if all_ids:
        collection.delete(where={"id": {"$in": all_ids}})


    all_chunks = []
    all_embeddings = []
    all_ids = []
    all_metadata = []

    for file in files:
    
        content = await file.read()

        text = ""

        # ✅ PDF
        if file.filename.endswith(".pdf"):
            reader = PdfReader(BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() or ""

        # ✅ DOCX (WORD)
        elif file.filename.endswith(".docx"):
            doc = Document(BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"

        # ✅ TXT
        else:
            try:
                text = content.decode("utf-8")
            except:
                text = ""

        # Split
        chunks = [text[i:i+500] for i in range(0, len(text), 500)]

        if not chunks:
            print(f"Skipping {file.filename} (no text found)")
            continue

        embeddings = model.encode(chunks).tolist()
        ids = [f"{file.filename}_{i}" for i in range(len(chunks))]

        all_chunks.extend(chunks)
        all_embeddings.extend(embeddings)
        all_ids.extend(ids)
        all_metadata.extend([{"source": file.filename}] * len(chunks))

    # 🚨 final safety
    if not all_chunks:
        return {"message": "No readable text found in uploaded files"}

    collection.add(
        documents=all_chunks,
        embeddings=all_embeddings,
        ids=all_ids,
        metadatas=all_metadata
    )

    return {"message": f"{len(files)} files uploaded successfully"}

@app.post("/query")
def query(q: str):
    query_embedding = model.encode([q]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=3)

    # 1. Grab the actual data (Chroma returns lists of lists)
    all_chunks = results["documents"][0] if results["documents"] else []
    all_metadatas = results["metadatas"][0] if results["metadatas"] else []

    if not all_chunks:
        return {"answer": "No relevant info found in docs.", "sources": []}

    #2. Combine all 5 chunks into ONE context
    context = "\n\n".join(all_chunks)
    
    prompt = f"""
You are a strict filtering assistant. 
The user is asking ONLY about: "{q}".
RULES:
Using ONLY the context below, provide a structured summary. 
If context is about specific person limits within the person information,
If the context contains information about different people or documents, 
list them separately.

Context:
{context}

Question: {q}
"""
    
    response = clients.models.generate_content(
        model=model_name,
        contents=prompt
    )

    # 3. Extract unique filenames from the "source" key
    unique_sources = list({meta.get('source', 'Unknown') for meta in all_metadatas})

    return {
        "answer": response.text.strip() if response.text else "No answer found",
        "sources": unique_sources
    }
    
@app.post("/clear")
async def clear_data():
    try:
        # Replace 'docs' with whatever your collection name is
        client.delete_collection(name="docs") 
        client.get_or_create_collection(name="docs")
        return {"message": "Database and chat history cleared successfully"}
    except Exception as e:
        return {"error": str(e)}, 500

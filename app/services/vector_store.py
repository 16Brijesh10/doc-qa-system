#Vector Store (Chroma)
import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.Client()
collection = client.get_or_create_collection(name="docs")

model = SentenceTransformer("all-MiniLM-L6-v2")

def store_chunks(chunks, filename):
    embeddings = model.encode(chunks).tolist()

    ids = [f"{filename}_{i}" for i in range(len(chunks))]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=[{"source": filename}] * len(chunks)
    )
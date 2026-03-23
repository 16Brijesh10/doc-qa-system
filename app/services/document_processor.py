#Document Processing
from utils.loader import extract_text
from utils.chunking import chunk_text
from services.vector_store import store_chunks

def process_document(filename, content):
    text = extract_text(filename, content)
    chunks = chunk_text(text)
    store_chunks(chunks, filename)
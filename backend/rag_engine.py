import os
import json
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

# Load Environment Variables
load_dotenv()

# We also import the colleges raw data for fallback mock queries
# to keep the app working 100% offline or if no Gemini key is provided.
try:
    from generate_kb import colleges as RAW_COLLEGES
except ImportError:
    RAW_COLLEGES = []

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class DummyEmbeddings:
    """Mock embeddings for running without a Gemini API Key."""
    def embed_documents(self, texts):
        return [[0.1] * 768 for _ in texts]
    def embed_query(self, text):
        return [0.1] * 768

class RAGEngine:
    def __init__(self, kb_dir="pdf_kb", persist_dir="chroma_db"):
        self.kb_dir = kb_dir
        self.persist_dir = persist_dir
        self.vector_store = None
        self.is_mock = False
        
        # Check if we can use real Gemini
        if not GEMINI_API_KEY:
            print("WARNING: GEMINI_API_KEY not found in environment. Running RAG in Mock Fallback Mode.")
            self.is_mock = True
        else:
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                self.embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/gemini-embedding-001",
                    google_api_key=GEMINI_API_KEY
                )
            except Exception as e:
                print(f"Error initializing Google Embeddings: {e}. Falling back to Mock Mode.")
                self.is_mock = True

        if self.is_mock:
            self.embeddings = DummyEmbeddings()

    def build_or_load_vector_db(self):
        """Indexes PDF files into ChromaDB. Rebuilds if new PDFs are detected."""
        if not os.path.exists(self.kb_dir) or len(os.listdir(self.kb_dir)) == 0:
            print(f"Knowledge base directory '{self.kb_dir}' is empty or does not exist.")
            return False

        try:
            # Get current PDF list and count
            pdf_files = sorted([f for f in os.listdir(self.kb_dir) if f.endswith('.pdf')])
            pdf_count = len(pdf_files)

            # Check if a rebuild is needed by comparing stored PDF count
            tracker_file = os.path.join(self.persist_dir, "pdf_tracker.json")
            needs_rebuild = True

            if os.path.exists(self.persist_dir) and len(os.listdir(self.persist_dir)) > 0:
                if os.path.exists(tracker_file):
                    with open(tracker_file, 'r') as f:
                        tracker = json.load(f)
                    if tracker.get("pdf_files") == pdf_files:
                        needs_rebuild = False

            if not needs_rebuild:
                print("Loading existing Chroma vector database...")
                self.vector_store = Chroma(
                    persist_directory=self.persist_dir,
                    embedding_function=self.embeddings
                )
            else:
                print(f"Building/Rebuilding Chroma vector database from {pdf_count} PDFs...")
                # Clear old DB if exists
                import shutil
                if os.path.exists(self.persist_dir):
                    shutil.rmtree(self.persist_dir)

                loader = PyPDFDirectoryLoader(self.kb_dir)
                documents = loader.load()

                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=100
                )
                chunks = text_splitter.split_documents(documents)

                self.vector_store = Chroma.from_documents(
                    documents=chunks,
                    embedding=self.embeddings,
                    persist_directory=self.persist_dir
                )
                self.vector_store.persist()

                # Save tracker so we know which PDFs are indexed
                os.makedirs(self.persist_dir, exist_ok=True)
                with open(tracker_file, 'w') as f:
                    json.dump({"pdf_files": pdf_files, "count": pdf_count}, f)

                print(f"Indexed {len(chunks)} text chunks from {pdf_count} PDFs into ChromaDB.")
            return True
        except Exception as e:
            print(f"Error loading ChromaDB: {e}. Falling back to keyword search.")
            self.is_mock = True
            return False

    def query(self, text_query, limit=3):
        """Queries the vector store or runs a simulated word-matching search on raw colleges data."""
        if not self.is_mock and self.vector_store is not None:
            try:
                docs = self.vector_store.similarity_search(text_query, k=limit)
                return [doc.page_content for doc in docs]
            except Exception as e:
                print(f"Vector search failed ({e}). Falling back to manual search.")
        
        # Fallback manual keyword-matching over raw colleges data
        print("Executing Manual Keyword Search...")
        results = []
        keywords = text_query.lower().split()
        
        scored_colleges = []
        for college in RAW_COLLEGES:
            score = 0
            # Combine all fields into a single text block
            content = f"{college['name']} {college['location']} {college['branches']} {college['fees']} {college['scholarships']} {college['recruiters']}".lower()
            for kw in keywords:
                if kw in content:
                    score += 1
            if score > 0:
                scored_colleges.append((score, college))
                
        # Sort by match score
        scored_colleges.sort(key=lambda x: x[0], reverse=True)
        
        for score, col in scored_colleges[:limit]:
            formatted_text = (
                f"College Name: {col['name']}\n"
                f"Location: {col['location']}\n"
                f"Website: {col['website']}\n"
                f"Accreditation: {col['accreditation']} | NAAC: {col['naac']} | NIRF: {col.get('nirf', 'N/A')}\n"
                f"Type: {col['type']}\n"
                f"Branches Offered: {col['branches']}\n"
                f"Fees: {col['fees']} | Hostel: {col['hostel_fee']}\n"
                f"Cutoffs: {col['cutoffs']}\n"
                f"Placements: Avg {col['placements_avg']}, Highest {col['placements_highest']}, Percent {col['placements_pct']}\n"
                f"Recruiters: {col['recruiters']}\n"
                f"Scholarships: {col['scholarships']}\n"
            )
            results.append(formatted_text)
            
        # If no keywords matched, return top 3 colleges
        if not results and RAW_COLLEGES:
            for col in RAW_COLLEGES[:limit]:
                formatted_text = (
                    f"College Name: {col['name']}\n"
                    f"Location: {col['location']}\n"
                    f"Website: {col['website']}\n"
                    f"Accreditation: {col['accreditation']} | NAAC: {col['naac']} | NIRF: {col.get('nirf', 'N/A')}\n"
                    f"Type: {col['type']}\n"
                    f"Branches Offered: {col['branches']}\n"
                    f"Fees: {col['fees']} | Hostel: {col['hostel_fee']}\n"
                    f"Cutoffs: {col['cutoffs']}\n"
                    f"Placements: Avg {col['placements_avg']}, Highest {col['placements_highest']}\n"
                    f"Scholarships: {col['scholarships']}\n"
                )
                results.append(formatted_text)
                
        return results

if __name__ == "__main__":
    # Test script
    engine = RAGEngine()
    engine.build_or_load_vector_db()
    res = engine.query("AU College of Engineering fees")
    print("Test Query Result:")
    print(res[0] if res else "No results")

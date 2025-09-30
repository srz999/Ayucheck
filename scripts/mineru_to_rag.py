#!/usr/bin/env python3
"""
MinerU to RAG Converter
Converts MinerU PDF extraction JSON output to clean, RAG-friendly formats.

This script takes the complex layout-preserving JSON from MinerU and converts it to:
1. Clean text chunks suitable for vector embeddings
2. JSONL format for vector databases
3. Structured JSON for web applications
4. Markdown for human readability

Usage:
    python mineru_to_rag.py input.json -o output_prefix

Author: GitHub Copilot
"""

import json
import re
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
import math

@dataclass
class RAGChunk:
    """Represents a clean text chunk suitable for RAG"""
    id: str
    text: str
    type: str
    page: int
    section: Optional[str] = None
    subsection: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    bbox: Optional[List[float]] = None  # [x1, y1, x2, y2] for highlighting
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "id": self.id,
            "text": self.text,
            "type": self.type,
            "page": self.page
        }
        
        if self.section:
            result["section"] = self.section
        if self.subsection:
            result["subsection"] = self.subsection
        if self.metadata:
            result["metadata"] = self.metadata
        if self.bbox:
            result["bbox"] = self.bbox
            
        return result

class MinerUToRAGConverter:
    """Converts MinerU JSON output to RAG-friendly formats"""
    
    def __init__(self, min_chunk_length: int = 50, max_chunk_length: int = 2000):
        self.min_chunk_length = min_chunk_length
        self.max_chunk_length = max_chunk_length
        self.current_section = None
        self.current_subsection = None
        self.chunks = []
        
    def extract_text_from_spans(self, spans: List[Dict[str, Any]]) -> str:
        """Extract clean text from MinerU spans"""
        text_parts = []
        
        for span in spans:
            span_type = span.get("type", "text")
            content = span.get("content", "").strip()
            
            if not content:
                continue
                
            if span_type == "text":
                text_parts.append(content)
            elif span_type == "inline_equation":
                # Clean up LaTeX formatting for readability
                clean_equation = self.clean_equation(content)
                text_parts.append(f"({clean_equation})")
            elif span_type == "formula":
                clean_equation = self.clean_equation(content)
                text_parts.append(f"\n{clean_equation}\n")
            else:
                # Include other types as text
                if content not in text_parts:  # Avoid duplicates
                    text_parts.append(content)
        
        return " ".join(text_parts).strip()
    
    def clean_equation(self, equation: str) -> str:
        """Clean LaTeX equations for better readability"""
        if not equation:
            return ""
            
        # Remove common LaTeX formatting for readability
        equation = re.sub(r'\\mathrm\s*\{\s*([^}]+)\s*\}', r'\1', equation)
        equation = re.sub(r'\\text\s*\{\s*([^}]+)\s*\}', r'\1', equation)
        equation = re.sub(r'\{\s*([^}]+)\s*\}', r'\1', equation)
        equation = re.sub(r'\\([a-zA-Z]+)', r'\1', equation)  # Remove backslashes
        equation = re.sub(r'\s+', ' ', equation).strip()
        
        return equation
    
    def extract_text_from_lines(self, lines: List[Dict[str, Any]]) -> str:
        """Extract text from MinerU lines structure"""
        text_parts = []
        
        for line in lines:
            spans = line.get("spans", [])
            line_text = self.extract_text_from_spans(spans)
            if line_text:
                text_parts.append(line_text)
        
        return " ".join(text_parts).strip()
    
    def is_page_number(self, text: str) -> bool:
        """Check if text is likely a page number"""
        text = text.strip()
        return (
            text.isdigit() and len(text) <= 3 or
            re.match(r'^\d+$', text) or
            text.lower() in ['page', 'p.', 'pg.']
        )
    
    def is_header_footer(self, text: str) -> bool:
        """Check if text is likely a header or footer"""
        text = text.lower().strip()
        header_footer_indicators = [
            'ayurvedic pharmacopoeia',
            'government of india',
            'ministry of health',
            'department of ayush',
            'contents', 'monographs', 'abbreviations', 'appendices'
        ]
        
        return any(indicator in text for indicator in header_footer_indicators)
    
    def normalize_text(self, text: str) -> str:
        """Normalize text for better processing"""
        if not text:
            return ""
        
        # Fix common OCR issues
        text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single space
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between lowercase and uppercase
        text = re.sub(r'(\d+)([A-Za-z])', r'\1 \2', text)  # Add space between digits and letters
        
        # Clean up punctuation spacing
        text = re.sub(r'\s*([,.;:!?])\s*', r'\1 ', text)
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def extract_from_content_array(self, content_array: List[Dict[str, Any]]) -> List[RAGChunk]:
        """Extract chunks from MinerU content array (simple format)"""
        chunks = []
        
        for i, item in enumerate(content_array):
            text = item.get("text", "").strip()
            if not text or len(text) < self.min_chunk_length:
                continue
                
            if self.is_page_number(text) or self.is_header_footer(text):
                continue
                
            text = self.normalize_text(text)
            item_type = item.get("type", "text")
            page = item.get("page_idx", 0)
            bbox = item.get("bbox")
            
            chunk = RAGChunk(
                id=f"chunk_{i}",
                text=text,
                type=item_type,
                page=page,
                bbox=bbox,
                section=self.current_section,
                subsection=self.current_subsection
            )
            
            chunks.append(chunk)
        
        return chunks
    
    def extract_from_para_blocks(self, pdf_pages: List[Dict[str, Any]]) -> List[RAGChunk]:
        """Extract chunks from MinerU para_blocks (detailed format)"""
        chunks = []
        chunk_id = 0
        
        for page_data in pdf_pages:
            page_idx = page_data.get("page_idx", 0)
            para_blocks = page_data.get("para_blocks", [])
            
            for block in para_blocks:
                block_type = block.get("type", "text")
                lines = block.get("lines", [])
                
                if not lines:
                    continue
                
                text = self.extract_text_from_lines(lines)
                
                if not text or len(text) < 10:  # Skip very short blocks
                    continue
                
                # Skip page numbers and headers/footers
                if self.is_page_number(text) or self.is_header_footer(text):
                    continue
                
                text = self.normalize_text(text)
                
                # Update section tracking
                if block_type == "title":
                    if len(text) > 100:  # Long titles are probably subsections
                        self.current_subsection = text[:100] + "..." if len(text) > 100 else text
                    else:
                        self.current_section = text
                        self.current_subsection = None
                
                # Create chunk
                bbox = block.get("bbox")
                
                chunk = RAGChunk(
                    id=f"page_{page_idx}_block_{chunk_id}",
                    text=text,
                    type=block_type,
                    page=page_idx,
                    bbox=bbox,
                    section=self.current_section,
                    subsection=self.current_subsection
                )
                
                chunks.append(chunk)
                chunk_id += 1
        
        return chunks
    
    def merge_small_chunks(self, chunks: List[RAGChunk]) -> List[RAGChunk]:
        """Merge small text chunks together for better RAG performance"""
        if not chunks:
            return chunks
        
        merged_chunks = []
        current_chunk = None
        
        for chunk in chunks:
            # Always keep titles separate
            if chunk.type == "title":
                if current_chunk:
                    merged_chunks.append(current_chunk)
                    current_chunk = None
                merged_chunks.append(chunk)
                continue
            
            # If no current chunk or different page/section, start new chunk
            if (not current_chunk or 
                current_chunk.page != chunk.page or 
                current_chunk.section != chunk.section or
                len(current_chunk.text) > self.max_chunk_length):
                
                if current_chunk:
                    merged_chunks.append(current_chunk)
                current_chunk = chunk
                continue
            
            # Merge with current chunk
            if len(current_chunk.text) + len(chunk.text) <= self.max_chunk_length:
                current_chunk.text += " " + chunk.text
                current_chunk.id += f"_{chunk.id.split('_')[-1]}"  # Combine IDs
                
                # Expand bounding box if both chunks have bbox
                if current_chunk.bbox and chunk.bbox:
                    current_chunk.bbox = [
                        min(current_chunk.bbox[0], chunk.bbox[0]),  # min x1
                        min(current_chunk.bbox[1], chunk.bbox[1]),  # min y1
                        max(current_chunk.bbox[2], chunk.bbox[2]),  # max x2
                        max(current_chunk.bbox[3], chunk.bbox[3])   # max y2
                    ]
            else:
                # Current chunk is full, start new one
                merged_chunks.append(current_chunk)
                current_chunk = chunk
        
        if current_chunk:
            merged_chunks.append(current_chunk)
        
        return merged_chunks
    
    def extract_tables_and_formulas(self, mineru_data: Dict[str, Any]) -> List[RAGChunk]:
        """Extract tables and formulas as separate chunks"""
        chunks = []
        
        # Extract from tables array
        tables = mineru_data.get("tables", [])
        for i, table in enumerate(tables):
            table_text = ""
            
            # Extract table content (MinerU usually provides HTML or structured data)
            if isinstance(table, dict):
                if "html" in table:
                    # Convert HTML table to plain text
                    table_text = self.html_table_to_text(table["html"])
                elif "content" in table:
                    table_text = str(table["content"])
                elif "text" in table:
                    table_text = table["text"]
            
            if table_text and len(table_text) > self.min_chunk_length:
                chunk = RAGChunk(
                    id=f"table_{i}",
                    text=self.normalize_text(table_text),
                    type="table",
                    page=table.get("page", 0),
                    section="Tables",
                    metadata={"table_index": i}
                )
                chunks.append(chunk)
        
        # Extract from formulas array
        formulas = mineru_data.get("formulas", [])
        for i, formula in enumerate(formulas):
            formula_text = ""
            
            if isinstance(formula, dict):
                if "latex" in formula:
                    formula_text = f"Formula: {self.clean_equation(formula['latex'])}"
                elif "content" in formula:
                    formula_text = f"Formula: {self.clean_equation(str(formula['content']))}"
                elif "text" in formula:
                    formula_text = f"Formula: {formula['text']}"
            elif isinstance(formula, str):
                formula_text = f"Formula: {self.clean_equation(formula)}"
            
            if formula_text and len(formula_text) > 10:
                chunk = RAGChunk(
                    id=f"formula_{i}",
                    text=formula_text,
                    type="formula",
                    page=formula.get("page", 0) if isinstance(formula, dict) else 0,
                    section="Formulas",
                    metadata={"formula_index": i}
                )
                chunks.append(chunk)
        
        return chunks
    
    def html_table_to_text(self, html: str) -> str:
        """Convert HTML table to readable text"""
        # Simple HTML to text conversion
        import re
        
        # Remove HTML tags but preserve structure
        text = re.sub(r'<tr[^>]*>', '\n', html)
        text = re.sub(r'<td[^>]*>|<th[^>]*>', ' | ', text)
        text = re.sub(r'</td>|</th>', '', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\n\s*\n', '\n', text)
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def convert(self, mineru_data: Dict[str, Any]) -> List[RAGChunk]:
        """Main conversion method"""
        chunks = []
        
        # Method 1: Try to extract from content array (simple format)
        content_array = mineru_data.get("content", [])
        if content_array:
            print(f"Extracting from content array ({len(content_array)} items)...")
            chunks.extend(self.extract_from_content_array(content_array))
        
        # Method 2: Extract from detailed para_blocks in metadata
        pdf_info = mineru_data.get("metadata", {}).get("processing_data", {}).get("pdf_info", [])
        if pdf_info and not chunks:  # Only if content array didn't work
            print(f"Extracting from para_blocks ({len(pdf_info)} pages)...")
            chunks.extend(self.extract_from_para_blocks(pdf_info))
        
        # Method 3: Extract tables and formulas separately
        special_chunks = self.extract_tables_and_formulas(mineru_data)
        chunks.extend(special_chunks)
        
        # Filter out very short chunks
        chunks = [chunk for chunk in chunks if len(chunk.text) >= self.min_chunk_length]
        
        # Merge small chunks for better RAG performance
        chunks = self.merge_small_chunks(chunks)
        
        print(f"Extracted {len(chunks)} chunks total")
        
        return chunks

def save_as_jsonl(chunks: List[RAGChunk], output_path: str):
    """Save chunks as JSONL for vector databases"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for chunk in chunks:
            # JSONL format for vector DB
            jsonl_entry = {
                "id": chunk.id,
                "text": chunk.text,
                "metadata": {
                    "type": chunk.type,
                    "page": chunk.page,
                    "section": chunk.section,
                    "subsection": chunk.subsection
                }
            }
            if chunk.bbox:
                jsonl_entry["metadata"]["bbox"] = chunk.bbox
            
            f.write(json.dumps(jsonl_entry, ensure_ascii=False) + '\n')

def save_as_structured_json(chunks: List[RAGChunk], output_path: str, mineru_data: Dict[str, Any]):
    """Save as structured JSON for web applications"""
    
    # Group chunks by page and section
    structured_data = {
        "title": mineru_data.get("title", "Document"),
        "source": mineru_data.get("source", ""),
        "total_pages": max([chunk.page for chunk in chunks], default=0) + 1,
        "total_chunks": len(chunks),
        "extraction_stats": {
            "text_chunks": len([c for c in chunks if c.type == "text"]),
            "title_chunks": len([c for c in chunks if c.type == "title"]),
            "table_chunks": len([c for c in chunks if c.type == "table"]),
            "formula_chunks": len([c for c in chunks if c.type == "formula"]),
            "list_chunks": len([c for c in chunks if c.type == "list"])
        },
        "pages": {}
    }
    
    # Group by page
    for chunk in chunks:
        page_key = f"page_{chunk.page}"
        if page_key not in structured_data["pages"]:
            structured_data["pages"][page_key] = {
                "page_number": chunk.page,
                "sections": {},
                "chunks": []
            }
        
        # Group by section
        section_key = chunk.section or "main"
        if section_key not in structured_data["pages"][page_key]["sections"]:
            structured_data["pages"][page_key]["sections"][section_key] = []
        
        chunk_data = chunk.to_dict()
        structured_data["pages"][page_key]["sections"][section_key].append(chunk_data)
        structured_data["pages"][page_key]["chunks"].append(chunk_data)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(structured_data, f, indent=2, ensure_ascii=False)

def save_as_markdown(chunks: List[RAGChunk], output_path: str, mineru_data: Dict[str, Any]):
    """Save as Markdown for human readability"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"# {mineru_data.get('title', 'Document')}\n\n")
        f.write(f"**Source:** {mineru_data.get('source', 'Unknown')}\n\n")
        f.write(f"**Total Chunks:** {len(chunks)}\n\n")
        f.write("---\n\n")
        
        current_page = None
        current_section = None
        
        for chunk in chunks:
            # Page header
            if current_page != chunk.page:
                current_page = chunk.page
                f.write(f"\n## Page {chunk.page + 1}\n\n")
                current_section = None
            
            # Section header
            if chunk.section and current_section != chunk.section:
                current_section = chunk.section
                f.write(f"### {chunk.section}\n\n")
            
            # Chunk content
            if chunk.type == "title":
                f.write(f"#### {chunk.text}\n\n")
            elif chunk.type == "table":
                f.write(f"**Table:**\n\n```\n{chunk.text}\n```\n\n")
            elif chunk.type == "formula":
                f.write(f"**{chunk.text}**\n\n")
            else:
                f.write(f"{chunk.text}\n\n")
            
            # Add metadata comment
            f.write(f"<!-- ID: {chunk.id}, Type: {chunk.type} -->\n\n")

def main():
    parser = argparse.ArgumentParser(
        description="Convert MinerU JSON output to RAG-friendly formats",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic conversion
  python mineru_to_rag.py ayurcheck_mineru_output.json
  
  # Custom output prefix
  python mineru_to_rag.py ayurcheck_mineru_output.json -o ayurcheck_rag
  
  # Custom chunk size
  python mineru_to_rag.py ayurcheck_mineru_output.json --min-chunk 100 --max-chunk 1500

Output files:
  - {prefix}_rag.jsonl     # For vector databases (FAISS, Pinecone, etc.)
  - {prefix}_rag.json      # Structured JSON for web apps
  - {prefix}_rag.md        # Human-readable Markdown
        """
    )
    
    parser.add_argument("input", help="Path to MinerU JSON output file")
    parser.add_argument("-o", "--output", help="Output prefix (default: input filename)")
    parser.add_argument("--min-chunk", type=int, default=50, 
                       help="Minimum chunk length (default: 50)")
    parser.add_argument("--max-chunk", type=int, default=2000,
                       help="Maximum chunk length (default: 2000)")
    
    args = parser.parse_args()
    
    # Load MinerU JSON
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file '{args.input}' not found!")
        return
    
    print(f"Loading MinerU JSON from: {input_path}")
    
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            mineru_data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON file: {e}")
        return
    
    # Determine output prefix
    if args.output:
        output_prefix = args.output
    else:
        output_prefix = input_path.stem
    
    # Convert to RAG format
    converter = MinerUToRAGConverter(
        min_chunk_length=args.min_chunk,
        max_chunk_length=args.max_chunk
    )
    
    print("Converting MinerU data to RAG format...")
    chunks = converter.convert(mineru_data)
    
    if not chunks:
        print("Warning: No chunks extracted! Check your input data.")
        return
    
    # Save in multiple formats
    output_dir = input_path.parent
    
    # JSONL for vector databases
    jsonl_path = output_dir / f"{output_prefix}_rag.jsonl"
    print(f"Saving JSONL to: {jsonl_path}")
    save_as_jsonl(chunks, str(jsonl_path))
    
    # Structured JSON for web apps
    json_path = output_dir / f"{output_prefix}_rag.json"
    print(f"Saving structured JSON to: {json_path}")
    save_as_structured_json(chunks, str(json_path), mineru_data)
    
    # Markdown for humans
    md_path = output_dir / f"{output_prefix}_rag.md"
    print(f"Saving Markdown to: {md_path}")
    save_as_markdown(chunks, str(md_path), mineru_data)
    
    # Print summary
    print("\n" + "="*60)
    print("🎉 Conversion completed successfully!")
    print("="*60)
    print(f"📊 Statistics:")
    print(f"   Total chunks: {len(chunks)}")
    print(f"   Text chunks: {len([c for c in chunks if c.type == 'text'])}")
    print(f"   Title chunks: {len([c for c in chunks if c.type == 'title'])}")
    print(f"   Table chunks: {len([c for c in chunks if c.type == 'table'])}")
    print(f"   Formula chunks: {len([c for c in chunks if c.type == 'formula'])}")
    print(f"   List chunks: {len([c for c in chunks if c.type == 'list'])}")
    
    avg_length = sum(len(c.text) for c in chunks) / len(chunks) if chunks else 0
    print(f"   Average chunk length: {avg_length:.0f} characters")
    
    print(f"\n📁 Output files:")
    print(f"   🔍 For vector DB: {jsonl_path}")
    print(f"   🌐 For web app:   {json_path}")
    print(f"   📖 For humans:    {md_path}")
    
    print(f"\n🚀 Next steps:")
    print(f"   1. Use {jsonl_path.name} with your vector database")
    print(f"   2. Use {json_path.name} in your RAG web application")
    print(f"   3. Review {md_path.name} to verify extraction quality")

if __name__ == "__main__":
    main()
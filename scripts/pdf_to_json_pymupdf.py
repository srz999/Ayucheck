#!/usr/bin/env python3
"""
Script to convert AyurCheck_API-Vol-1.pdf to JSON using PyMuPDF
PyMuPDF is more reliable for text extraction than Docling
"""

import json
import os
import sys
from pathlib import Path
import pymupdf  # imports the pymupdf library

def convert_pdf_to_json_pymupdf(pdf_path: str, output_path: str = None):
    """
    Convert PDF to JSON using PyMuPDF
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_path (str): Path for the output JSON file (optional)
    """
    
    # Check if PDF file exists
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file '{pdf_path}' not found!")
        return False
    
    try:
        print(f"Converting {pdf_path} to JSON using PyMuPDF...")
        
        # Open the PDF document
        doc = pymupdf.open(pdf_path)
        
        # Create JSON structure
        json_data = {
            "title": "AyurCheck API Vol-1",
            "source": pdf_path,
            "conversion_info": {
                "pages": len(doc),
                "converter": "pymupdf"
            },
            "content": [],
            "full_text": ""  # Combined text from all pages
        }
        
        full_text_parts = []
        
        # Extract content from each page
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get plain text from the page
            text = page.get_text().strip()
            
            page_data = {
                "page_number": page_num + 1,
                "text": text,
                "word_count": len(text.split()) if text else 0
            }
            
            json_data["content"].append(page_data)
            
            # Add to full text if not empty
            if text:
                full_text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
        
        # Close the document
        doc.close()
        
        # Combine all text
        json_data["full_text"] = "\n\n".join(full_text_parts)
        json_data["total_word_count"] = sum(page["word_count"] for page in json_data["content"])
        
        # Determine output path
        if output_path is None:
            base_name = Path(pdf_path).stem
            output_path = f"src/data/{base_name}_pymupdf.json"
        
        # Ensure output directory exists
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Write JSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Successfully converted PDF to JSON: {output_path}")
        print(f"📄 Pages processed: {len(json_data['content'])}")
        print(f"📝 Total words extracted: {json_data['total_word_count']}")
        
        # Show sample of extracted text
        if json_data["full_text"]:
            sample_text = json_data["full_text"][:500] + "..." if len(json_data["full_text"]) > 500 else json_data["full_text"]
            print(f"📖 Sample text:\n{sample_text}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error converting PDF: {str(e)}")
        return False

def extract_structured_content(json_data):
    """
    Extract and structure content for better RAG usage
    """
    structured_content = {
        "herbs": [],
        "formulations": [],
        "properties": [],
        "indications": [],
        "general_content": []
    }
    
    # Simple keyword-based categorization
    herb_keywords = ["herb", "plant", "botanical", "leaf", "root", "bark", "flower", "seed"]
    formulation_keywords = ["churna", "kwath", "taila", "ghrita", "vata", "pitta", "kapha", "rasa"]
    property_keywords = ["property", "rasa", "virya", "prabhava", "guna", "karma"]
    indication_keywords = ["indication", "use", "benefit", "treatment", "therapy", "disease"]
    
    for page in json_data["content"]:
        text = page["text"].lower()
        
        if any(keyword in text for keyword in herb_keywords):
            structured_content["herbs"].append({
                "page": page["page_number"],
                "content": page["text"]
            })
        elif any(keyword in text for keyword in formulation_keywords):
            structured_content["formulations"].append({
                "page": page["page_number"],
                "content": page["text"]
            })
        elif any(keyword in text for keyword in property_keywords):
            structured_content["properties"].append({
                "page": page["page_number"],
                "content": page["text"]
            })
        elif any(keyword in text for keyword in indication_keywords):
            structured_content["indications"].append({
                "page": page["page_number"],
                "content": page["text"]
            })
        else:
            structured_content["general_content"].append({
                "page": page["page_number"],
                "content": page["text"]
            })
    
    return structured_content

def main():
    """Main function to handle command line arguments"""
    
    # Default paths
    pdf_path = "/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/AyurCheck_API-Vol-1.pdf"
    output_path = "src/data/ayurcheck_api_vol1_pymupdf.json"
    
    # Check if custom paths provided via command line
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    
    print("🔄 PyMuPDF PDF to JSON Converter")
    print("=" * 40)
    print(f"Input PDF: {pdf_path}")
    print(f"Output JSON: {output_path}")
    print("=" * 40)
    
    # Convert the PDF
    success = convert_pdf_to_json_pymupdf(pdf_path, output_path)
    
    if success:
        print("\n✨ Conversion completed successfully!")
        print(f"You can now use the JSON file in your RAG application.")
        
        # Also create a structured version
        with open(output_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        structured = extract_structured_content(json_data)
        structured_path = output_path.replace('.json', '_structured.json')
        
        with open(structured_path, 'w', encoding='utf-8') as f:
            json.dump(structured, f, indent=2, ensure_ascii=False)
        
        print(f"📚 Also created structured version: {structured_path}")
        
    else:
        print("\n💥 Conversion failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
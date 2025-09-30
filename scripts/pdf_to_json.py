#!/usr/bin/env python3
"""
Script to convert AyurCheck_API-Vol-1.pdf to JSON using Docling
"""

import json
import os
import sys
from pathlib import Path

try:
    from docling.document_converter import DocumentConverter
    DOCLING_AVAILABLE = True
except ImportError as e:
    print(f"❌ Error: Docling not properly installed: {e}")
    print("Please install docling: pip install docling")
    DOCLING_AVAILABLE = False

def convert_pdf_to_json(pdf_path: str, output_path: str = None):
    """
    Convert PDF to JSON using Docling
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_path (str): Path for the output JSON file (optional)
    """
    
    # Check if PDF file exists
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file '{pdf_path}' not found!")
        return False
    
    try:
        print(f"Converting {pdf_path} to JSON...")
        
        # Initialize the document converter
        converter = DocumentConverter()
        
        # Convert the PDF
        result = converter.convert(pdf_path)
        
        # Extract the document content
        document = result.document
        
        # Create JSON structure
        json_data = {
            "title": getattr(document, 'title', 'AyurCheck API Vol-1'),
            "source": pdf_path,
            "conversion_info": {
                "pages": len(document.pages) if hasattr(document, 'pages') else 0,
                "converter": "docling"
            },
            "content": []
        }
        
        # Extract content from pages
        if hasattr(document, 'pages'):
            for i, page in enumerate(document.pages):
                page_data = {
                    "page_number": i + 1,
                    "text": str(page) if page else "",
                    "elements": []
                }
                
                # Extract different elements if available
                if hasattr(page, 'elements'):
                    for element in page.elements:
                        element_data = {
                            "type": getattr(element, 'type', 'unknown'),
                            "text": str(element) if element else "",
                            "bbox": getattr(element, 'bbox', None)
                        }
                        page_data["elements"].append(element_data)
                
                json_data["content"].append(page_data)
        else:
            # Fallback: treat entire document as single content block
            json_data["content"] = [{
                "page_number": 1,
                "text": str(document),
                "elements": []
            }]
        
        # Determine output path
        if output_path is None:
            base_name = Path(pdf_path).stem
            output_path = f"src/data/{base_name}.json"
        
        # Ensure output directory exists
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Write JSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Successfully converted PDF to JSON: {output_path}")
        print(f"📄 Pages processed: {len(json_data['content'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error converting PDF: {str(e)}")
        return False

def main():
    """Main function to handle command line arguments"""
    
    # Default paths
    pdf_path = "/Users/prabhanjanakumar/Documents/MENTOR_PAD/nextjs-rag-langchain/src/data/AyurCheck_API-Vol-1.pdf"
    output_path = "src/data/ayurcheck_api_vol1.json"
    
    # Check if custom paths provided via command line
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    
    print("🔄 Docling PDF to JSON Converter")
    print("=" * 40)
    print(f"Input PDF: {pdf_path}")
    print(f"Output JSON: {output_path}")
    print("=" * 40)
    
    # Convert the PDF
    success = convert_pdf_to_json(pdf_path, output_path)
    
    if success:
        print("\n✨ Conversion completed successfully!")
        print(f"You can now use the JSON file in your RAG application.")
    else:
        print("\n💥 Conversion failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
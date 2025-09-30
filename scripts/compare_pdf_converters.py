#!/usr/bin/env python3
"""
Compare different PDF to JSON conversion methods
This script demonstrates the differences between PyMuPDF and MinerU converters
"""

import json
import os
import sys
from pathlib import Path
import time

def compare_converters():
    """Compare different PDF conversion methods"""
    
    current_dir = Path(__file__).parent
    pdf_path = current_dir.parent / "src" / "data" / "AyurCheck_API-Vol-1.pdf"
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found at {pdf_path}")
        return
    
    print("🔍 PDF Conversion Method Comparison")
    print("=" * 50)
    print(f"📄 Source PDF: {pdf_path}")
    print(f"📊 File size: {pdf_path.stat().st_size / (1024*1024):.2f} MB")
    print()
    
    # Add scripts directory to path
    sys.path.insert(0, str(current_dir))
    
    converters = [
        {
            "name": "PyMuPDF",
            "module": "pdf_to_json_pymupdf",
            "function": "convert_pdf_to_json_pymupdf",
            "output": current_dir.parent / "src" / "data" / "ayurcheck_pymupdf_test.json"
        },
        {
            "name": "MinerU",
            "module": "pdf_to_json_mineru_enhanced", 
            "function": "convert_pdf_to_json_mineru",
            "output": current_dir.parent / "src" / "data" / "ayurcheck_mineru_test.json"
        }
    ]
    
    results = {}
    
    for converter in converters:
        print(f"🔄 Testing {converter['name']}...")
        
        try:
            # Import the converter module
            module = __import__(converter["module"])
            convert_func = getattr(module, converter["function"])
            
            # Time the conversion
            start_time = time.time()
            
            if converter['name'] == 'MinerU':
                # MinerU needs config parameter
                success = convert_func(str(pdf_path), str(converter["output"]), {"verbose": False})
            else:
                # PyMuPDF doesn't need config
                success = convert_func(str(pdf_path), str(converter["output"]))
            
            end_time = time.time()
            
            if success and converter["output"].exists():
                # Analyze output
                with open(converter["output"], 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                results[converter['name']] = {
                    "success": True,
                    "time_seconds": end_time - start_time,
                    "output_size_mb": converter["output"].stat().st_size / (1024*1024),
                    "text_length": len(data.get("full_text", "")),
                    "content_items": len(data.get("content", [])) if isinstance(data.get("content"), list) else 1,
                    "has_images": len(data.get("extracted_images", [])) > 0,
                    "has_tables": len(data.get("tables", [])) > 0,
                    "has_formulas": len(data.get("formulas", [])) > 0
                }
                
                print(f"   ✅ Success in {end_time - start_time:.1f}s")
                print(f"   📊 Output: {converter['output'].stat().st_size / (1024*1024):.2f} MB")
                print(f"   📝 Text: {len(data.get('full_text', '')):,} characters")
            else:
                results[converter['name']] = {
                    "success": False,
                    "error": "Conversion failed or no output file"
                }
                print(f"   ❌ Failed")
                
        except Exception as e:
            results[converter['name']] = {
                "success": False,
                "error": str(e)
            }
            print(f"   ❌ Error: {e}")
        
        print()
    
    # Print comparison table
    print("📋 Comparison Results")
    print("=" * 80)
    
    header = f"{'Method':<15} {'Success':<8} {'Time(s)':<8} {'Size(MB)':<10} {'Text Len':<10} {'Features':<20}"
    print(header)
    print("-" * 80)
    
    for method, data in results.items():
        if data.get("success"):
            features = []
            if data.get("has_images"):
                features.append("Images")
            if data.get("has_tables"):
                features.append("Tables") 
            if data.get("has_formulas"):
                features.append("Formulas")
            
            features_str = ", ".join(features) if features else "Text only"
            
            row = (f"{method:<15} {'✅':<8} {data.get('time_seconds', 0):<8.1f} "
                  f"{data.get('output_size_mb', 0):<10.2f} {data.get('text_length', 0):<10,} "
                  f"{features_str:<20}")
        else:
            row = f"{method:<15} {'❌':<8} {'N/A':<8} {'N/A':<10} {'N/A':<10} {data.get('error', 'Unknown'):<20}"
        
        print(row)
    
    print("\n🏆 Recommendations:")
    print("=" * 40)
    print("• PyMuPDF: Fast, lightweight, good for simple text extraction")
    print("• MinerU: Advanced parsing, structured content, tables, formulas, images")
    print("• Use MinerU for complex documents with tables and formulas")
    print("• Use PyMuPDF for simple text extraction and better performance")

def main():
    """Main function"""
    try:
        compare_converters()
    except KeyboardInterrupt:
        print("\n⏹️ Conversion stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
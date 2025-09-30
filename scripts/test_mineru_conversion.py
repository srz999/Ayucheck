#!/usr/bin/env python3
"""
Test script to convert AyurCheck_API-Vol-1.pdf using MinerU
This script demonstrates the usage of the MinerU PDF to JSON converter
"""

import os
import sys
from pathlib import Path

def main():
    """Test the MinerU PDF to JSON conversion"""
    
    # Get the path to the PDF file
    current_dir = Path(__file__).parent
    pdf_path = current_dir.parent / "src" / "data" / "AyurCheck_API-Vol-1.pdf"
    
    if not pdf_path.exists():
        print(f"Error: PDF file not found at {pdf_path}")
        print("Please ensure the AyurCheck_API-Vol-1.pdf file exists in src/data/")
        return False
    
    # Output path in the data directory
    output_path = current_dir.parent / "src" / "data" / "ayurcheck_api_vol1_mineru.json"
    
    print("🚀 Starting MinerU PDF to JSON conversion...")
    print(f"📄 Input PDF: {pdf_path}")
    print(f"💾 Output JSON: {output_path}")
    
    # Import and run the converter
    try:
        # Add the scripts directory to Python path so we can import our module
        sys.path.insert(0, str(current_dir))
        
        from pdf_to_json_mineru_enhanced import convert_pdf_to_json_mineru
        
        # Run the conversion with verbose output
        config = {
            "verbose": True,
            "ocr_only": False
        }
        
        success = convert_pdf_to_json_mineru(
            str(pdf_path), 
            str(output_path), 
            config
        )
        
        if success:
            print("\n🎉 Conversion completed successfully!")
            print(f"✅ Check the output file: {output_path}")
            
            # Show file size
            if output_path.exists():
                size_mb = output_path.stat().st_size / (1024 * 1024)
                print(f"📊 Output file size: {size_mb:.2f} MB")
        else:
            print("\n❌ Conversion failed!")
            return False
            
    except ImportError as e:
        print(f"Error importing converter module: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
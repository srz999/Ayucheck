#!/usr/bin/env python3
"""
Script to convert PDF to JSON using MinerU
MinerU is a powerful tool that converts PDFs into machine-readable formats
Reference: https://github.com/opendatalab/MinerU
"""

import json
import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List
import argparse

def install_mineru():
    """Install MinerU if not already installed"""
    try:
        import mineru
        print("MinerU is already installed.")
        return True
    except ImportError:
        print("MinerU not found. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-U", "mineru[core]"])
            print("MinerU installed successfully!")
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to install MinerU: {e}")
            return False

def run_mineru_conversion(pdf_path: str, output_dir: str) -> bool:
    """
    Run MinerU conversion on the PDF file
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_dir (str): Directory for MinerU output
        
    Returns:
        bool: True if conversion successful, False otherwise
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Run MinerU command
        cmd = ["mineru", "-p", pdf_path, "-o", output_dir]
        print(f"Running MinerU command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("MinerU conversion completed successfully!")
        print(f"MinerU output: {result.stdout}")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"MinerU conversion failed: {e}")
        print(f"Error output: {e.stderr}")
        return False
    except Exception as e:
        print(f"Unexpected error during MinerU conversion: {e}")
        return False

def process_mineru_output(mineru_output_dir: str, pdf_path: str) -> Dict[str, Any]:
    """
    Process MinerU output files and create a structured JSON
    
    Args:
        mineru_output_dir (str): Directory containing MinerU output
        pdf_path (str): Original PDF path
        
    Returns:
        Dict[str, Any]: Structured JSON data
    """
    json_data = {
        "title": "AyurCheck API Vol-1",
        "source": pdf_path,
        "conversion_info": {
            "converter": "mineru",
            "version": "2.5.4"
        },
        "content": [],
        "full_text": "",
        "metadata": {}
    }
    
    try:
        # Look for common MinerU output files
        output_files = []
        for root, dirs, files in os.walk(mineru_output_dir):
            for file in files:
                if file.endswith(('.json', '.md', '.markdown')):
                    output_files.append(os.path.join(root, file))
        
        print(f"Found MinerU output files: {output_files}")
        
        # Process JSON files first (content_list.json is the main structured file)
        for file_path in output_files:
            if file_path.endswith('.json'):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_data = json.load(f)
                    
                    # Check if this is the main content file
                    if 'content_list.json' in file_path or isinstance(file_data, list):
                        # This is likely the main content structure
                        json_data["content"] = file_data
                        json_data["metadata"]["main_content_file"] = file_path
                        
                    elif isinstance(file_data, dict):
                        # This might be metadata or middle.json
                        json_data["metadata"][os.path.basename(file_path)] = file_data
                        
                except Exception as e:
                    print(f"Error processing JSON file {file_path}: {e}")
        
        # Process Markdown files
        markdown_content = []
        for file_path in output_files:
            if file_path.endswith(('.md', '.markdown')):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        md_content = f.read()
                    markdown_content.append({
                        "file": os.path.basename(file_path),
                        "content": md_content
                    })
                except Exception as e:
                    print(f"Error processing Markdown file {file_path}: {e}")
        
        if markdown_content:
            json_data["markdown_content"] = markdown_content
            # Use first markdown file as full text if no other full text found
            if not json_data["full_text"] and markdown_content:
                json_data["full_text"] = markdown_content[0]["content"]
        
        # If we have structured content, extract text for full_text
        if json_data["content"] and not json_data["full_text"]:
            full_text_parts = []
            if isinstance(json_data["content"], list):
                for item in json_data["content"]:
                    if isinstance(item, dict):
                        # Extract text from various possible fields
                        text_content = ""
                        if "text" in item:
                            text_content = item["text"]
                        elif "content" in item:
                            text_content = item["content"]
                        elif "raw_text" in item:
                            text_content = item["raw_text"]
                        
                        if text_content:
                            full_text_parts.append(text_content)
            
            json_data["full_text"] = "\n\n".join(full_text_parts)
        
        return json_data
        
    except Exception as e:
        print(f"Error processing MinerU output: {e}")
        return json_data

def convert_pdf_to_json_mineru(pdf_path: str, output_path: str = None) -> bool:
    """
    Convert PDF to JSON using MinerU
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_path (str): Path for the output JSON file (optional)
        
    Returns:
        bool: True if conversion successful, False otherwise
    """
    
    # Check if PDF file exists
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file '{pdf_path}' not found!")
        return False
    
    # Install MinerU if needed
    if not install_mineru():
        return False
    
    # Set up output paths
    if output_path is None:
        pdf_name = Path(pdf_path).stem
        output_path = f"{pdf_name}_mineru.json"
    
    # Create temporary directory for MinerU output
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Using temporary directory: {temp_dir}")
        
        # Run MinerU conversion
        if not run_mineru_conversion(pdf_path, temp_dir):
            return False
        
        # Process MinerU output
        json_data = process_mineru_output(temp_dir, pdf_path)
        
        # Save the structured JSON
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
            
            print(f"Conversion completed successfully!")
            print(f"Output saved to: {output_path}")
            print(f"Total content items: {len(json_data.get('content', []))}")
            print(f"Full text length: {len(json_data.get('full_text', ''))}")
            
            return True
            
        except Exception as e:
            print(f"Error saving JSON output: {e}")
            return False

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(
        description="Convert PDF to JSON using MinerU",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python pdf_to_json_mineru.py input.pdf
  python pdf_to_json_mineru.py input.pdf -o output.json
  python pdf_to_json_mineru.py ../src/data/AyurCheck_API-Vol-1.pdf -o ayurcheck_mineru.json
        """
    )
    
    parser.add_argument("pdf_path", help="Path to the input PDF file")
    parser.add_argument("-o", "--output", help="Path for the output JSON file")
    
    args = parser.parse_args()
    
    # Convert the PDF
    success = convert_pdf_to_json_mineru(args.pdf_path, args.output)
    
    if success:
        print("\n✅ PDF to JSON conversion completed successfully using MinerU!")
    else:
        print("\n❌ PDF to JSON conversion failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
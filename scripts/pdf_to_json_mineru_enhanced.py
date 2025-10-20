#!/usr/bin/env python3
"""
Enhanced script to convert PDF to JSON using MinerU with configuration setup
This script includes automatic configuration setup and better error handling
"""

import json
import os
import sys
import subprocess
import tempfile
import shutil
import platform
from pathlib import Path
from typing import Dict, Any, List, Optional
import argparse

# MinerU configuration paths
# Primary config location (where mineru-models-download stores config)
MINERU_CONFIG_PATH = Path(r"C:\Users\vinit\mineru.json")
# Fallback config directory
MINERU_CONFIG_DIR = Path.home() / ".config" / "mineru"

def setup_mineru_config():
    r"""
    Setup MinerU configuration file
    Uses the config created by mineru-models-download at C:\Users\vinit\mineru.json
    """
    try:
        # Check if the primary config exists (created by mineru-models-download)
        if MINERU_CONFIG_PATH.exists():
            print(f"✅ MinerU config found at: {MINERU_CONFIG_PATH}")
            print(f"   Models downloaded via mineru-models-download are ready to use")
            
            # Verify config has model paths
            with open(MINERU_CONFIG_PATH, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                if "models-dir" in config_data:
                    print(f"   Pipeline models: {config_data['models-dir'].get('pipeline', 'Not set')}")
                    print(f"   VLM models: {config_data['models-dir'].get('vlm', 'Not set')}")
                else:
                    print("   ⚠️  Warning: 'models-dir' not found in config")
            
            return True
        else:
            print(f"⚠️  MinerU config not found at: {MINERU_CONFIG_PATH}")
            print(f"   Please run 'mineru-models-download' first to download models")
            print(f"   This will create the config file with proper model paths")
            
            # Create fallback config directory if needed
            MINERU_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            fallback_config = MINERU_CONFIG_DIR / "mineru.json"
            
            if not fallback_config.exists():
                print(f"   Creating fallback config at: {fallback_config}")
                print(f"   Note: You should still run mineru-models-download for better performance")
            
            return False
            
    except Exception as e:
        print(f"Warning: Could not setup MinerU config: {e}")
        return False

def install_mineru():
    """Install MinerU if not already installed"""
    try:
        # Try to import mineru to check if it's installed
        result = subprocess.run([sys.executable, "-c", "import mineru"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("MinerU is already installed.")
            return True
    except:
        pass
    
    print("MinerU not found. Installing...")
    try:
        # Install MinerU with core dependencies
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-U", 
            "mineru[core]", "--no-cache-dir"
        ])
        print("MinerU installed successfully!")
        
        # Setup configuration
        setup_mineru_config()
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install MinerU: {e}")
        print("You may need to install manually with: pip install -U mineru[core]")
        return False

def check_mineru_command():
    """Check if mineru command is available"""
    try:
        result = subprocess.run(["mineru", "--help"], 
                              capture_output=True, text=True, timeout=30)
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def run_mineru_conversion(pdf_path: str, output_dir: str, config: Dict[str, Any] = None) -> bool:
    """
    Run MinerU conversion on the PDF file
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_dir (str): Directory for MinerU output
        config (Dict[str, Any]): Additional configuration options
        
    Returns:
        bool: True if conversion successful, False otherwise
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Build MinerU command with all logging and verbosity options
        # For Windows PowerShell: Set multiple environment variables
        # For bash/sh: Set multiple environment variables
        if platform.system() == "Windows":
            env_vars = [
                "$env:MINERU_LOG_LEVEL='DEBUG'",
                "$env:MINERU_DEBUG='true'",
                "$env:ORT_LOG_LEVEL='0'",  # ONNX Runtime log level (0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal)
                "$env:ORT_LOG_VERBOSITY='1'",  # ONNX Runtime verbosity level
            ]
            cmd = ["powershell", "-Command", 
                   "; ".join(env_vars) + f"; mineru -p '{pdf_path}' -o '{output_dir}'"]
        else:
            env_vars = [
                "MINERU_LOG_LEVEL=DEBUG",
                "ORT_LOG_LEVEL=0",  # ONNX Runtime log level (0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal)
                "ORT_LOG_VERBOSITY=1",  # ONNX Runtime verbosity level
            ]
            cmd = ["sh", "-c", 
                   " ".join(env_vars) + f" mineru -p '{pdf_path}' -o '{output_dir}'"]
        
        # Add config file path if it exists
        if MINERU_CONFIG_PATH.exists():
            if platform.system() == "Windows":
                cmd[2] += f" --config '{MINERU_CONFIG_PATH}'"
            else:
                cmd[2] += f" --config '{MINERU_CONFIG_PATH}'"
            print(f"📄 Using config: {MINERU_CONFIG_PATH}")
        
        # Add additional options if specified
        if config:
            if config.get("verbose"):
                cmd[2] += " --verbose"
            if config.get("ocr_only"):
                cmd[2] += " --mode ocr"
        
        print(f"🔧 Enabled logging options:")
        print(f"   MINERU_LOG_LEVEL=DEBUG")
        print(f"   ORT_LOG_LEVEL=0 (Verbose)")
        print(f"   ORT_LOG_VERBOSITY=1")
        print(f"Running MinerU command with maximum verbosity")
        print("⏳ Processing PDF with downloaded models...")
        print()  # Empty line for better readability
        
        # Run with real-time output - combine stdout and stderr
        # Note: MinerU and ONNX Runtime emit most logs on stderr. We redirect
        # stderr to stdout so we can capture and stream all MinerU output in
        # real time. We also accumulate lines in a buffer so that if the
        # process fails we can print the captured output (process.stderr is
        # None when redirected to STDOUT, so attempting to read it causes
        # AttributeErrors).
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        # Capture and stream output lines as they arrive
        output_lines: List[str] = []
        if process.stdout is not None:
            for line in iter(process.stdout.readline, ''):
                if line:
                    stripped = line.rstrip()
                    output_lines.append(stripped)
                    print(stripped)

        # Wait for completion and evaluate return code
        process.wait()
        return_code = process.returncode

        output_text = "\n".join(output_lines)

        if return_code == 0:
            print("MinerU conversion completed successfully!")
            return True
        else:
            print(f"MinerU conversion failed with return code {return_code}")
            if output_text:
                print("--- MinerU output (last captured) ---")
                print(output_text)
                print("--- end MinerU output ---")
            return False
        
    except subprocess.TimeoutExpired:
        print("MinerU conversion timed out (30 minutes). The PDF might be too large or complex.")
        return False
    except subprocess.CalledProcessError as e:
        print(f"MinerU conversion failed: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        return False
    except Exception as e:
        print(f"Unexpected error during MinerU conversion: {e}")
        return False

def find_mineru_output_files(output_dir: str) -> Dict[str, List[str]]:
    """Find and categorize MinerU output files"""
    files = {
        "json": [],
        "markdown": [],
        "images": [],
        "other": []
    }
    
    for root, dirs, file_list in os.walk(output_dir):
        for file in file_list:
            file_path = os.path.join(root, file)
            if file.endswith('.json'):
                files["json"].append(file_path)
            elif file.endswith(('.md', '.markdown')):
                files["markdown"].append(file_path)
            elif file.endswith(('.png', '.jpg', '.jpeg', '.gif')):
                files["images"].append(file_path)
            else:
                files["other"].append(file_path)
    
    return files

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
        "title": Path(pdf_path).stem.replace("_", " ").title(),
        "source": pdf_path,
        "conversion_info": {
            "converter": "mineru",
            "version": "2.5.x",
            "output_directory": mineru_output_dir
        },
        "content": [],
        "full_text": "",
        "metadata": {},
        "extracted_images": [],
        "tables": [],
        "formulas": []
    }
    
    try:
        # Find output files
        output_files = find_mineru_output_files(mineru_output_dir)
        print(f"Found files: {sum(len(files) for files in output_files.values())} total")
        for category, files in output_files.items():
            if files:
                print(f"  {category}: {len(files)} files")
        
        # Process JSON files (main structured content)
        for file_path in output_files["json"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_data = json.load(f)
                
                filename = os.path.basename(file_path)
                
                # Handle different types of JSON files that MinerU might produce
                if 'content_list.json' in filename or 'layout.json' in filename:
                    # Main content structure
                    if isinstance(file_data, list):
                        json_data["content"] = file_data
                    elif isinstance(file_data, dict) and 'pages' in file_data:
                        json_data["content"] = file_data
                    json_data["metadata"]["main_content_file"] = filename
                    
                elif 'middle.json' in filename:
                    # Intermediate processing data
                    json_data["metadata"]["processing_data"] = file_data
                    
                elif 'meta.json' in filename or 'metadata.json' in filename:
                    # Document metadata
                    json_data["metadata"]["document_info"] = file_data
                    
                else:
                    # Other JSON files
                    json_data["metadata"][filename.replace('.json', '')] = file_data
                    
            except Exception as e:
                print(f"Error processing JSON file {file_path}: {e}")
        
        # Process Markdown files
        markdown_content = []
        for file_path in output_files["markdown"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    md_content = f.read()
                markdown_content.append({
                    "file": os.path.basename(file_path),
                    "path": file_path,
                    "content": md_content
                })
            except Exception as e:
                print(f"Error processing Markdown file {file_path}: {e}")
        
        if markdown_content:
            json_data["markdown_content"] = markdown_content
            # Use markdown as full text if available
            if markdown_content and not json_data["full_text"]:
                json_data["full_text"] = markdown_content[0]["content"]
        
        # Process images
        if output_files["images"]:
            json_data["extracted_images"] = [
                {
                    "filename": os.path.basename(img_path),
                    "path": img_path,
                    "size": os.path.getsize(img_path)
                }
                for img_path in output_files["images"]
            ]
        
        # Extract structured data from content
        if json_data["content"]:
            text_parts = []
            tables = []
            formulas = []
            
            def extract_from_item(item):
                if isinstance(item, dict):
                    # Extract text
                    for text_field in ["text", "content", "raw_text", "markdown"]:
                        if text_field in item and item[text_field]:
                            text_parts.append(str(item[text_field]))
                    
                    # Extract tables
                    if item.get("type") == "table" or "table" in str(item).lower():
                        tables.append(item)
                    
                    # Extract formulas
                    if item.get("type") == "formula" or "formula" in str(item).lower():
                        formulas.append(item)
                    
                    # Recursively process nested items
                    for key, value in item.items():
                        if isinstance(value, (list, dict)):
                            if isinstance(value, list):
                                for sub_item in value:
                                    extract_from_item(sub_item)
                            else:
                                extract_from_item(value)
                
                elif isinstance(item, list):
                    for sub_item in item:
                        extract_from_item(sub_item)
            
            extract_from_item(json_data["content"])
            
            # Set extracted data
            if text_parts and not json_data["full_text"]:
                json_data["full_text"] = "\n\n".join(text_parts)
            
            json_data["tables"] = tables
            json_data["formulas"] = formulas
        
        # Add statistics
        json_data["metadata"]["statistics"] = {
            "total_text_length": len(json_data["full_text"]),
            "content_items": len(json_data["content"]) if isinstance(json_data["content"], list) else 1,
            "extracted_images": len(json_data["extracted_images"]),
            "tables_found": len(json_data["tables"]),
            "formulas_found": len(json_data["formulas"])
        }
        
        return json_data
        
    except Exception as e:
        print(f"Error processing MinerU output: {e}")
        return json_data

def convert_pdf_to_json_mineru(pdf_path: str, output_path: str = None, 
                              config: Dict[str, Any] = None) -> bool:
    """
    Convert PDF to JSON using MinerU
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_path (str): Path for the output JSON file (optional)
        config (Dict[str, Any]): Configuration options
        
    Returns:
        bool: True if conversion successful, False otherwise
    """
    
    # Check if PDF file exists
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file '{pdf_path}' not found!")
        return False
    
    print(f"Converting PDF: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path) / (1024*1024):.2f} MB")
    
    # Install MinerU if needed
    if not install_mineru():
        return False
    
    # Check if mineru command is available
    if not check_mineru_command():
        print("Error: mineru command not found. Please check your installation.")
        return False
    
    # Set up output paths
    if output_path is None:
        pdf_name = Path(pdf_path).stem
        output_path = f"{pdf_name}_mineru.json"
    
    # Create temporary directory for MinerU output
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Using temporary directory: {temp_dir}")
        
        # Run MinerU conversion
        if not run_mineru_conversion(pdf_path, temp_dir, config):
            return False
        
        # Process MinerU output
        print("Processing MinerU output...")
        json_data = process_mineru_output(temp_dir, pdf_path)
        
        # Save the structured JSON
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ Conversion completed successfully!")
            print(f"📄 Output saved to: {output_path}")
            
            # Print statistics
            stats = json_data.get("metadata", {}).get("statistics", {})
            if stats:
                print(f"📊 Statistics:")
                print(f"   - Text length: {stats.get('total_text_length', 0):,} characters")
                print(f"   - Content items: {stats.get('content_items', 0)}")
                print(f"   - Images: {stats.get('extracted_images', 0)}")
                print(f"   - Tables: {stats.get('tables_found', 0)}")
                print(f"   - Formulas: {stats.get('formulas_found', 0)}")
            
            return True
            
        except Exception as e:
            print(f"Error saving JSON output: {e}")
            return False

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(
        description="Convert PDF to JSON using MinerU - Advanced document parsing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic conversion
  python pdf_to_json_mineru.py input.pdf
  
  # Specify output file
  python pdf_to_json_mineru.py input.pdf -o output.json
  
  # Convert the AyurCheck PDF
  python pdf_to_json_mineru.py ../src/data/AyurCheck_API-Vol-1.pdf -o ayurcheck_mineru.json
  
  # Verbose output
  python pdf_to_json_mineru.py input.pdf --verbose
  
  # OCR-only mode (for scanned PDFs)
  python pdf_to_json_mineru.py scanned.pdf --ocr-only

About MinerU:
  MinerU is a powerful document parsing tool that can extract:
  - Text content with proper reading order
  - Tables in HTML format
  - Mathematical formulas in LaTeX
  - Images and figures
  - Document structure and layout
  - Supports multiple languages and complex layouts
        """
    )
    
    parser.add_argument("pdf_path", help="Path to the input PDF file")
    parser.add_argument("-o", "--output", help="Path for the output JSON file")
    parser.add_argument("--verbose", action="store_true", 
                       help="Enable verbose output")
    parser.add_argument("--ocr-only", action="store_true",
                       help="Use OCR-only mode for scanned PDFs")
    
    args = parser.parse_args()
    
    # Prepare configuration
    config = {
        "verbose": args.verbose,
        "ocr_only": args.ocr_only
    }
    
    # Convert the PDF
    success = convert_pdf_to_json_mineru(args.pdf_path, args.output, config)
    
    if not success:
        print("\n❌ PDF to JSON conversion failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
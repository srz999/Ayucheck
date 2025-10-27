#!/usr/bin/env python3
"""
Colab-compatible script to convert PDF to JSON using MinerU
This version handles Jupyter/Colab kernel arguments and provides both
function-based and command-line interfaces
"""

import json
import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
import argparse

# MinerU configuration template
MINERU_CONFIG_TEMPLATE = {
    "layout": {
        "model": "layoutlmv3"
    },
    "formula": {
        "enable": True,
        "model": "unimernet"
    },
    "table": {
        "enable": True,
        "model": "rapidtable"
    },
    "ocr": {
        "enable": True,
        "model": "paddleocr"
    }
}

def setup_mineru_config():
    """Setup MinerU configuration file"""
    try:
        # Create config directory
        config_dir = Path.home() / ".config" / "mineru"
        config_dir.mkdir(parents=True, exist_ok=True)
        
        config_file = config_dir / "mineru.json"
        
        # Only create config if it doesn't exist
        if not config_file.exists():
            with open(config_file, 'w') as f:
                json.dump(MINERU_CONFIG_TEMPLATE, f, indent=2)
            print(f"Created MinerU config at: {config_file}")
        else:
            print(f"MinerU config already exists at: {config_file}")
            
        return True
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
        
        # Build MinerU command
        cmd = ["mineru", "-p", pdf_path, "-o", output_dir]
        
        # Add additional options if specified
        if config:
            if config.get("verbose"):
                cmd.append("--verbose")
            if config.get("ocr_only"):
                cmd.extend(["--mode", "ocr"])
        
        print(f"Running MinerU command: {' '.join(cmd)}")
        print("⏳ This may take several minutes, especially on first run (downloading models)...")
        
        # Run with real-time output
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
                                 text=True, universal_newlines=True)
        
        # Print real-time output
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(f"   {output.strip()}")
        
        # Wait for completion
        return_code = process.poll()
        
        if return_code == 0:
            print("MinerU conversion completed successfully!")
            return True
        else:
            # Get error output
            stderr_output = process.stderr.read()
            print(f"MinerU conversion failed with return code {return_code}")
            if stderr_output:
                print(f"Error output: {stderr_output}")
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

# ============================================================================
# COLAB-FRIENDLY FUNCTION INTERFACE
# ============================================================================

def convert_pdf(pdf_path: str, output_path: str = None, verbose: bool = False, 
                ocr_only: bool = False) -> bool:
    """
    Colab-friendly function to convert PDF to JSON
    
    Args:
        pdf_path (str): Path to the input PDF file
        output_path (str): Path for the output JSON file (optional)
        verbose (bool): Enable verbose output
        ocr_only (bool): Use OCR-only mode for scanned PDFs
        
    Returns:
        bool: True if conversion successful, False otherwise
        
    Example:
        # Basic usage
        convert_pdf('/content/document.pdf')
        
        # With output path
        convert_pdf('/content/document.pdf', '/content/output.json')
        
        # With options
        convert_pdf('/content/document.pdf', verbose=True, ocr_only=False)
    """
    config = {
        "verbose": verbose,
        "ocr_only": ocr_only
    }
    
    return convert_pdf_to_json_mineru(pdf_path, output_path, config)

# ============================================================================
# COMMAND LINE INTERFACE (with Jupyter/Colab compatibility)
# ============================================================================

def is_running_in_jupyter():
    """Check if running in Jupyter/Colab environment"""
    try:
        get_ipython()
        return True
    except NameError:
        return False

def filter_jupyter_args(args):
    """Filter out Jupyter/Colab specific arguments"""
    filtered = []
    i = 0
    while i < len(args):
        arg = args[i]
        # Skip Jupyter kernel connection file arguments
        if arg in ['-f', '--f', '--ip', '--stdin', '--control', '--hb', '--shell', '--iopub', '--Session.signature_scheme', '--Session.key']:
            # Skip this argument and potentially its value
            i += 2 if i + 1 < len(args) and not args[i + 1].startswith('-') else 1
            continue
        elif arg.startswith(('-f=', '--f=', '--ip=', '--stdin=', '--control=', '--hb=', '--shell=', '--iopub=')):
            # Skip arguments with = syntax
            i += 1
            continue
        else:
            filtered.append(arg)
            i += 1
    return filtered

def main():
    """Main function to handle command line arguments (Jupyter/Colab compatible)"""
    
    # Detect Jupyter environment
    in_jupyter = is_running_in_jupyter()
    
    if in_jupyter:
        print("📓 Jupyter/Colab environment detected!")
        print("\n💡 TIP: You can use the convert_pdf() function directly:")
        print("   convert_pdf('/path/to/document.pdf', '/path/to/output.json')")
        print("\nOr continue with command-line style arguments...\n")
    
    # Filter Jupyter-specific arguments
    filtered_argv = filter_jupyter_args(sys.argv)
    
    # If only script name remains after filtering, show help
    if len(filtered_argv) <= 1 and in_jupyter:
        print("=" * 70)
        print("COLAB/JUPYTER USAGE EXAMPLES:")
        print("=" * 70)
        print("\n# Method 1: Direct function call (recommended)")
        print("convert_pdf('/content/document.pdf')")
        print("\n# Method 2: With output path")
        print("convert_pdf('/content/document.pdf', '/content/output.json')")
        print("\n# Method 3: With options")
        print("convert_pdf('/content/document.pdf', verbose=True)")
        print("\n# Method 4: Magic command (command-line style)")
        print("%run pdf_to_json_mineru_colab.py /content/document.pdf -o output.json")
        print("=" * 70)
        return
    
    parser = argparse.ArgumentParser(
        description="Convert PDF to JSON using MinerU - Colab Compatible Version",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples (Command Line):
  # Basic conversion
  python pdf_to_json_mineru_colab.py input.pdf
  
  # Specify output file
  python pdf_to_json_mineru_colab.py input.pdf -o output.json
  
  # Verbose output
  python pdf_to_json_mineru_colab.py input.pdf --verbose
  
  # OCR-only mode (for scanned PDFs)
  python pdf_to_json_mineru_colab.py scanned.pdf --ocr-only

Examples (Colab/Jupyter):
  # Direct function call
  convert_pdf('/content/document.pdf')
  
  # With options
  convert_pdf('/content/document.pdf', '/content/output.json', verbose=True)
  
  # Using magic command
  %run pdf_to_json_mineru_colab.py /content/document.pdf -o output.json

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
    
    # Parse filtered arguments
    try:
        args = parser.parse_args(filtered_argv[1:])
    except SystemExit as e:
        if in_jupyter and e.code != 0:
            print("\n💡 Hint: Try using the convert_pdf() function instead:")
            print("   convert_pdf('/path/to/document.pdf')")
        raise
    
    # Prepare configuration
    config = {
        "verbose": args.verbose,
        "ocr_only": args.ocr_only
    }
    
    # Convert the PDF
    success = convert_pdf_to_json_mineru(args.pdf_path, args.output, config)
    
    if not success:
        print("\n❌ PDF to JSON conversion failed!")
        if not in_jupyter:
            sys.exit(1)
        return False
    
    return True

if __name__ == "__main__":
    main()

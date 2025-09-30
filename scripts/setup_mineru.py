#!/usr/bin/env python3
"""
Setup and verification script for MinerU PDF converter
This script checks dependencies and provides setup instructions
"""

import sys
import subprocess
import importlib
import platform
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"🐍 Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major == 3 and version.minor >= 10:
        print("   ✅ Python version is compatible with MinerU")
        return True
    else:
        print("   ❌ MinerU requires Python 3.10+")
        print("   Please upgrade Python or use a compatible environment")
        return False

def check_system_info():
    """Display system information"""
    print(f"💻 System: {platform.system()} {platform.release()}")
    print(f"🏗️  Architecture: {platform.machine()}")
    
    # Check available RAM (rough estimate)
    try:
        if platform.system() == "Darwin":  # macOS
            result = subprocess.run(["sysctl", "-n", "hw.memsize"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                ram_bytes = int(result.stdout.strip())
                ram_gb = ram_bytes / (1024**3)
                print(f"💾 RAM: {ram_gb:.1f} GB")
                
                if ram_gb >= 16:
                    print("   ✅ Sufficient RAM for MinerU")
                else:
                    print("   ⚠️  MinerU recommends 16GB+ RAM")
        elif platform.system() == "Linux":
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        ram_kb = int(line.split()[1])
                        ram_gb = ram_kb / (1024**2)
                        print(f"💾 RAM: {ram_gb:.1f} GB")
                        break
    except:
        print("💾 RAM: Could not detect")

def check_package(package_name, import_name=None):
    """Check if a package is installed"""
    if import_name is None:
        import_name = package_name
    
    try:
        importlib.import_module(import_name)
        print(f"   ✅ {package_name} is installed")
        return True
    except ImportError:
        print(f"   ❌ {package_name} is not installed")
        return False

def install_package(package_spec):
    """Install a package using pip"""
    try:
        print(f"🔄 Installing {package_spec}...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-U", package_spec
        ])
        print(f"   ✅ {package_spec} installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install {package_spec}: {e}")
        return False

def check_dependencies():
    """Check and install required dependencies"""
    print("\n📦 Checking dependencies...")
    
    # Check basic packages first
    basic_packages = [
        ("json", "json"),      # Built-in
        ("pathlib", "pathlib"), # Built-in  
        ("tempfile", "tempfile"), # Built-in
        ("subprocess", "subprocess") # Built-in
    ]
    
    all_basic_ok = True
    for pkg_name, import_name in basic_packages:
        if not check_package(pkg_name, import_name):
            all_basic_ok = False
    
    if not all_basic_ok:
        print("❌ Some basic Python packages are missing")
        return False
    
    # Check MinerU
    print("\n🔍 Checking MinerU...")
    mineru_installed = False
    
    try:
        # Try to run mineru command
        result = subprocess.run(["mineru", "--help"], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("   ✅ MinerU command is available")
            mineru_installed = True
        else:
            print("   ❌ MinerU command not found")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("   ❌ MinerU command not found")
    
    if not mineru_installed:
        print("\n🔧 Installing MinerU...")
        if install_package("mineru[core]"):
            print("   ✅ MinerU installation completed")
            mineru_installed = True
        else:
            print("   ❌ MinerU installation failed")
    
    return mineru_installed

def check_pdf_file():
    """Check if the reference PDF file exists"""
    print("\n📄 Checking reference PDF file...")
    
    current_dir = Path(__file__).parent
    pdf_path = current_dir.parent / "src" / "data" / "AyurCheck_API-Vol-1.pdf"
    
    if pdf_path.exists():
        size_mb = pdf_path.stat().st_size / (1024 * 1024)
        print(f"   ✅ Found: {pdf_path}")
        print(f"   📊 Size: {size_mb:.2f} MB")
        return True
    else:
        print(f"   ❌ Not found: {pdf_path}")
        print("   Please ensure AyurCheck_API-Vol-1.pdf is in src/data/")
        return False

def run_quick_test():
    """Run a quick test to verify everything works"""
    print("\n🧪 Running quick verification test...")
    
    try:
        # Test basic import
        sys.path.insert(0, str(Path(__file__).parent))
        from pdf_to_json_mineru_enhanced import check_mineru_command
        
        if check_mineru_command():
            print("   ✅ MinerU command test passed")
            return True
        else:
            print("   ❌ MinerU command test failed")
            return False
    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        return False

def main():
    """Main setup verification function"""
    print("🔧 MinerU PDF Converter - Setup Verification")
    print("=" * 50)
    
    # Check system compatibility
    if not check_python_version():
        return False
    
    check_system_info()
    
    # Check dependencies
    if not check_dependencies():
        return False
    
    # Check PDF file
    pdf_exists = check_pdf_file()
    
    # Run verification test
    test_passed = run_quick_test()
    
    # Summary
    print("\n📋 Setup Summary")
    print("=" * 30)
    
    if test_passed:
        print("✅ All checks passed! You're ready to use MinerU.")
        print("\n🚀 Quick start:")
        print("   cd scripts")
        print("   python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf")
        print("   # or")
        print("   ./convert_with_mineru.sh")
        
        if not pdf_exists:
            print("\n📄 Note: Place your PDF file in src/data/ directory first")
    else:
        print("❌ Setup incomplete. Please resolve the issues above.")
        print("\n🔧 Manual installation:")
        print("   pip install -U mineru[core]")
    
    return test_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
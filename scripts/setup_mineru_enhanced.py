#!/usr/bin/env python3
"""
Enhanced setup script for MinerU PDF converter with virtual environment support
This script handles externally managed Python environments by creating a venv
"""

import sys
import subprocess
import importlib
import platform
import os
import shutil
from pathlib import Path

VENV_NAME = "mineru_venv"

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

def create_virtual_environment(base_dir):
    """Create a virtual environment for MinerU"""
    venv_path = base_dir / VENV_NAME
    
    if venv_path.exists():
        print(f"   📂 Virtual environment already exists at: {venv_path}")
        return venv_path
    
    try:
        print(f"🔧 Creating virtual environment at: {venv_path}")
        subprocess.check_call([sys.executable, "-m", "venv", str(venv_path)])
        print("   ✅ Virtual environment created successfully")
        return venv_path
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to create virtual environment: {e}")
        return None

def get_venv_python(venv_path):
    """Get the Python executable path for the virtual environment"""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "python.exe"
    else:
        return venv_path / "bin" / "python"

def get_venv_pip(venv_path):
    """Get the pip executable path for the virtual environment"""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "pip"
    else:
        return venv_path / "bin" / "pip"

def install_mineru_in_venv(venv_path):
    """Install MinerU in the virtual environment"""
    pip_path = get_venv_pip(venv_path)
    python_path = get_venv_python(venv_path)
    
    try:
        print("🔄 Installing MinerU in virtual environment...")
        
        # Upgrade pip first
        subprocess.check_call([str(python_path), "-m", "pip", "install", "--upgrade", "pip"])
        
        # Install MinerU
        subprocess.check_call([str(pip_path), "install", "-U", "mineru[core]"])
        
        print("   ✅ MinerU installed successfully in virtual environment")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install MinerU: {e}")
        return False

def test_mineru_in_venv(venv_path):
    """Test MinerU installation in the virtual environment"""
    python_path = get_venv_python(venv_path)
    
    try:
        # Test if mineru can be imported
        result = subprocess.run([
            str(python_path), "-c", 
            "import mineru; print('MinerU import successful')"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("   ✅ MinerU import test passed")
            return True
        else:
            print(f"   ❌ MinerU import test failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("   ❌ MinerU import test timed out")
        return False
    except Exception as e:
        print(f"   ❌ MinerU test error: {e}")
        return False

def create_activation_script(base_dir, venv_path):
    """Create activation scripts for the virtual environment"""
    
    # Create bash activation script
    bash_script = base_dir / "activate_mineru.sh"
    bash_content = f"""#!/bin/bash
# Activate MinerU virtual environment and run PDF conversion

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
VENV_PATH="{venv_path}"

echo "🔧 Activating MinerU virtual environment..."
source "$VENV_PATH/bin/activate"

echo "🐍 Using Python: $(which python)"
echo "📦 MinerU version: $(python -c 'import mineru; print(getattr(mineru, "__version__", "installed"))')"

# Run the conversion if PDF path is provided
if [ "$1" ]; then
    echo "🔄 Converting PDF: $1"
    python "$SCRIPT_DIR/pdf_to_json_mineru_enhanced.py" "$@"
else
    echo "📋 Usage: $0 <pdf_file> [options]"
    echo "Example: $0 ../src/data/AyurCheck_API-Vol-1.pdf -o output.json"
    echo ""
    echo "Or run Python scripts directly:"
    echo "python $SCRIPT_DIR/pdf_to_json_mineru_enhanced.py --help"
fi
"""
    
    with open(bash_script, 'w') as f:
        f.write(bash_content)
    
    os.chmod(bash_script, 0o755)
    
    # Create Python activation script
    python_script = base_dir / "run_with_mineru_venv.py"
    python_content = f'''#!/usr/bin/env python3
"""
Run Python scripts using the MinerU virtual environment
"""

import sys
import subprocess
from pathlib import Path

VENV_PATH = Path("{venv_path}")
VENV_PYTHON = VENV_PATH / "bin" / "python"

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_with_mineru_venv.py <script.py> [args...]")
        print("Example: python run_with_mineru_venv.py pdf_to_json_mineru_enhanced.py --help")
        return
    
    script_args = sys.argv[1:]
    cmd = [str(VENV_PYTHON)] + script_args
    
    print(f"🔧 Running with MinerU environment: {{' '.join(cmd)}}")
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
'''
    
    with open(python_script, 'w') as f:
        f.write(python_content)
    
    os.chmod(python_script, 0o755)
    
    print(f"   📝 Created activation scripts:")
    print(f"      - {bash_script}")
    print(f"      - {python_script}")

def update_existing_scripts(base_dir, venv_path):
    """Update existing scripts to use the virtual environment"""
    
    # Update the enhanced MinerU script to use venv if available
    enhanced_script = base_dir / "pdf_to_json_mineru_enhanced.py"
    
    if enhanced_script.exists():
        # Read the current content
        with open(enhanced_script, 'r') as f:
            content = f.read()
        
        # Add venv detection at the top
        venv_detection = f'''
# Auto-detect and use virtual environment if available
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
VENV_PATH = SCRIPT_DIR / "{VENV_NAME}"
VENV_PYTHON = VENV_PATH / "bin" / "python"

# If we're not in the venv and venv exists, restart with venv Python
if VENV_PYTHON.exists() and sys.executable != str(VENV_PYTHON):
    import subprocess
    import os
    print(f"🔧 Switching to MinerU virtual environment...")
    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON)] + sys.argv)
'''
        
        # Insert after the shebang and docstring
        lines = content.split('\n')
        insert_pos = 0
        
        # Find where to insert (after docstring)
        for i, line in enumerate(lines):
            if line.strip().startswith('"""') and '"""' in line[line.find('"""')+3:]:
                insert_pos = i + 1
                break
            elif line.strip().endswith('"""') and i > 0:
                insert_pos = i + 1
                break
        
        # Insert the venv detection code
        lines.insert(insert_pos, venv_detection)
        
        # Write back
        with open(enhanced_script, 'w') as f:
            f.write('\n'.join(lines))
        
        print(f"   🔧 Updated {enhanced_script} to use virtual environment")

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

def main():
    """Main setup function"""
    print("🔧 MinerU PDF Converter - Enhanced Setup")
    print("=" * 50)
    
    # Check system compatibility
    if not check_python_version():
        return False
    
    check_system_info()
    
    # Get script directory
    script_dir = Path(__file__).parent
    
    # Check if we need a virtual environment
    print("\n📦 Setting up MinerU environment...")
    
    # Try to detect if we're in an externally managed environment
    try:
        # Test if we can install packages directly
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "--dry-run", "requests"
        ], capture_output=True, text=True)
        
        externally_managed = "externally-managed-environment" in result.stderr
    except:
        externally_managed = True
    
    if externally_managed:
        print("   ℹ️  Detected externally managed Python environment")
        print("   🔧 Creating virtual environment for MinerU...")
        
        # Create virtual environment
        venv_path = create_virtual_environment(script_dir)
        if not venv_path:
            return False
        
        # Install MinerU in venv
        if not install_mineru_in_venv(venv_path):
            return False
        
        # Test installation
        if not test_mineru_in_venv(venv_path):
            return False
        
        # Create helper scripts
        create_activation_script(script_dir, venv_path)
        
        print("\n✅ MinerU setup completed in virtual environment!")
        
    else:
        print("   ℹ️  Direct package installation available")
        # Try direct installation (original logic)
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "-U", "mineru[core]"
            ])
            print("   ✅ MinerU installed directly")
        except subprocess.CalledProcessError:
            print("   ❌ Direct installation failed, creating virtual environment...")
            venv_path = create_virtual_environment(script_dir)
            if venv_path and install_mineru_in_venv(venv_path):
                create_activation_script(script_dir, venv_path)
    
    # Check PDF file
    pdf_exists = check_pdf_file()
    
    # Print usage instructions
    print("\n🚀 Usage Instructions")
    print("=" * 30)
    
    venv_path = script_dir / VENV_NAME
    if venv_path.exists():
        print("📋 Virtual environment created. Use one of these methods:")
        print("")
        print("Method 1 - Activation script:")
        print(f"   ./activate_mineru.sh ../src/data/AyurCheck_API-Vol-1.pdf")
        print("")
        print("Method 2 - Manual activation:")
        print(f"   source {venv_path}/bin/activate")
        print("   python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf")
        print("")
        print("Method 3 - Direct execution:")
        print("   python run_with_mineru_venv.py pdf_to_json_mineru_enhanced.py --help")
    else:
        print("📋 Direct installation available:")
        print("   python pdf_to_json_mineru_enhanced.py ../src/data/AyurCheck_API-Vol-1.pdf")
    
    if not pdf_exists:
        print("\n📄 Note: Place your PDF file in src/data/ directory first")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
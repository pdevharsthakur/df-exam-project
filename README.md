# 🕵️‍♂️ Digital Forensics File Analysis Tool

A comprehensive tool for analyzing files for forensic investigation, extracting metadata, computing cryptographic hashes, and detecting file types.

## ✨ Features

- 📊 **File Metadata Analysis**: Extract file size, timestamps, and more
- 🔐 **Cryptographic Hashing**: Generate MD5, SHA1, and SHA256 hashes
- 🔍 **File Type Detection**: Accurately identify file types regardless of extension
- 📸 **EXIF Data Extraction**: Extract EXIF metadata from image files
- 💾 **Export Functionality**: Export results in JSON or text format
- 🎨 **Beautiful Reports**: Easily readable tabular output with color formatting

## 📋 Prerequisites

- 📦 Node.js (v16+)
- 🐍 Python 3.x
- 📥 pnpm (or npm/yarn)

## 🐍 Python Setup

This project requires Python for the core analysis functionality. There are two recommended approaches to set up the Python environment:

### Option 1: Using Miniconda (Preferred) or Anaconda

```bash
# Install Miniconda if you don't have it already
# Download from: https://docs.conda.io/en/latest/miniconda.html

# Create a new conda environment
conda create -n forensics python=3.10

# Activate the environment
conda activate forensics

# Install dependencies
conda install -c conda-forge python-magic
conda install -c conda-forge exifread
```

Alternatively, you can use the provided environment.yml file:

```bash
# Create the environment from the environment.yml file
cd python
conda env create -f environment.yml

# Activate the environment
conda activate forensics
```

### Option 2: Using a Python Virtual Environment

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies from requirements.txt
cd python
pip install -r requirements.txt
```

On Windows, you might need to install additional dependencies for python-magic to work:
```bash
pip install python-magic-bin
```

### 🐍 Python Dependencies

Both approaches will install:
- `python-magic`: For file type detection
- `exifread`: For EXIF data extraction from images

## 🚀 Installation

```bash
# Clone the repository
git clone [repository-url]
cd df-exam-project

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## 📘 Usage

### 🔰 Basic Usage

```bash
# Analyze a file
pnpm analyze --files path/to/file.jpg

# Analyze multiple files
pnpm analyze --files file1.jpg file2.png document.pdf

# Show all metadata (including all EXIF tags)
pnpm analyze --files image.jpg --view-all

# Save output to a file
pnpm analyze --files document.pdf --output report.txt
```

### 📤 Export Options

After analysis, the tool will prompt you with options to:
- 📥 Export results (Yes/No)
- 🔣 Choose format (JSON/Text)
- 📁 Specify export location (or use the default `docs/` folder)

## 🏗️ Project Structure

```
/
├── src/
│   ├── cli/         # Command-line interface code
│   ├── core/        # Core business logic
│   ├── services/    # Service modules
│   ├── types/       # TypeScript type definitions
│   ├── utils/       # Utility functions
│   └── index.ts     # Entry point
├── python/          # Python analyzer scripts
├── dist/            # Compiled JavaScript
├── docs/            # Export directory and documentation
└── README.md        # This file
```

## 👨‍💻 Development

```bash
# Watch mode for development
pnpm dev

# Format code with Prettier
pnpm format

# Clean build artifacts
pnpm clean
```

## 🛠️ Troubleshooting

If you encounter any issues:

1. 🔄 Make sure all dependencies are installed correctly
2. 🐍 Verify Python and required Python packages are available
3. 📦 Check Node.js version (v16+ recommended)
4. 🔎 Review logs for any error messages

## 🙏 Acknowledgments

This project was inspired by [SnehuD's imageforensics-mini-project](https://github.com/SnehuD/imageforensics-mini-project.git), a Cyber Security & Design Forensics Project focused on digital forensics of images.

## 📜 License

MIT License
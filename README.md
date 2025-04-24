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

### 🐍 Python Dependencies

```bash
pip install python-magic exifread
```

On Windows, you might need:
```bash
pip install python-magic-bin exifread
```

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

## 📜 License

MIT License 
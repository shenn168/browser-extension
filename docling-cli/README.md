# Docling CLI — Document to Markdown Converter

A simple offline CLI tool to convert documents to Markdown
using [Docling](https://github.com/docling-project/docling).

---

## Requirements

- Python 3.10 or higher
- Windows 10/11 (also works on macOS/Linux)

---

## Install

### 1. Create a virtual environment (recommended)

python -m venv venv
venv\Scripts\activate

### 2. Install dependencies

pip install -r requirements.txt

---

## Usage

### Convert a file

python convert.py <file>

### Examples

python convert.py report.pdf
python convert.py invoice.docx
python convert.py slide_deck.pptx
python convert.py sheet.xlsx
python convert.py page.html
python convert.py photo.png

### List supported file types

python convert.py --list

### Help

python convert.py --help

---

## Output

The converted .md file is saved in the current working
directory with the same name as the input file.

  report.pdf  →  report.md  (in current directory)
  invoice.docx → invoice.md (in current directory)

If a file with the same name already exists, a counter
is appended automatically:

  report.md already exists → report_1.md

---

## Supported File Types

| Category      | Extensions                                     |
|---------------|------------------------------------------------|
| Documents     | .pdf .docx .doc                                |
| Presentations | .pptx .ppt                                     |
| Spreadsheets  | .xlsx .xls .csv                                |
| Web           | .html .htm                                     |
| Images        | .png .jpg .jpeg .tiff .tif .bmp .gif .webp    |
| Text/Markup   | .md .asciidoc .adoc                            |

---

## Notes

- Fully offline — no internet required after install
- Docling first run may download AI models (~1-2 GB)
  These are cached locally after the first download
- Large PDFs or image-heavy files take longer to process
- Scanned/image-only PDFs use OCR automatically via Docling
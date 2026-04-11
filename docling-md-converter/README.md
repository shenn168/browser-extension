# Docling MD Converter — Edge Extension

Convert local documents to Markdown using a locally running
[Docling](https://github.com/docling-project/docling) server.

---

## Supported File Types

| Category     | Extensions                              |
|--------------|-----------------------------------------|
| Documents    | .pdf, .docx, .doc                       |
| Presentations| .pptx, .ppt                             |
| Spreadsheets | .xlsx, .xls, .csv                       |
| Web          | .html, .htm                             |
| Images       | .png, .jpg, .jpeg, .tiff, .bmp, .gif, .webp |
| Text/Markup  | .md, .asciidoc, .adoc                   |

---

## Prerequisites

### 1. Install Docling

pip install docling

### 2. Start the Docling HTTP Server

Docling does not ship with a built-in HTTP server by default.
Use the lightweight FastAPI wrapper below (save as `server.py`):

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from docling.document_converter import DocumentConverter
import tempfile, os, pathlib

app = FastAPI()
converter = DocumentConverter()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/convert")
async def convert(file: UploadFile = File(...)):
    suffix = pathlib.Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        result = converter.convert(tmp_path)
        md = result.document.export_to_markdown()
        return JSONResponse({"markdown": md})
    finally:
        os.unlink(tmp_path)

Then run:

pip install fastapi uvicorn python-multipart
uvicorn server:app --host 127.0.0.1 --port 5001

---

## Load Extension in Edge

1. Open Edge → `edge://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `docling-md-converter/` folder
5. Pin the extension to your toolbar

---

## Usage

1. Start the Docling server (`uvicorn server:app ...`)
2. Click the extension icon — the status bar turns **green**
3. Drag & drop or browse for a supported file
4. Click **Convert to Markdown**
5. Click **⬇ Download .md** to save the file

---

## Settings

Click the ⚙ icon in the top-right to change the server URL
(default: `http://localhost:5001`).
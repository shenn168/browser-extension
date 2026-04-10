#!/usr/bin/env python3
"""
convert.py — Docling Document to Markdown CLI Converter
Usage: python convert.py <file>
"""

import sys
import os
import argparse
import time
import pathlib

# ─── Supported Extensions ────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc",
    ".pptx", ".ppt",
    ".xlsx", ".xls", ".csv",
    ".html", ".htm",
    ".png", ".jpg", ".jpeg",
    ".tiff", ".tif", ".bmp",
    ".gif", ".webp",
    ".md", ".asciidoc", ".adoc",
}

# ─── ANSI Colors (Windows 10+ supports ANSI in terminal) ─────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
DIM    = "\033[2m"


def enable_ansi_windows():
    """Enable ANSI escape codes on Windows 10+ terminals."""
    if sys.platform == "win32":
        import ctypes
        kernel32 = ctypes.windll.kernel32
        # Enable ENABLE_VIRTUAL_TERMINAL_PROCESSING (0x0004)
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)


def print_banner():
    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════╗
║       Docling  →  Markdown Converter     ║
║       CLI Tool  |  Offline  |  Local     ║
╚══════════════════════════════════════════╝{RESET}
""")


def print_supported_types():
    print(f"{BOLD}Supported file types:{RESET}")
    types = sorted(SUPPORTED_EXTENSIONS)
    row = ""
    for i, ext in enumerate(types):
        row += f"  {CYAN}{ext:<12}{RESET}"
        if (i + 1) % 5 == 0:
            print(row)
            row = ""
    if row:
        print(row)
    print()


def info(msg):
    print(f"{CYAN}[INFO]{RESET}  {msg}")


def success(msg):
    print(f"{GREEN}[OK]{RESET}    {msg}")


def warning(msg):
    print(f"{YELLOW}[WARN]{RESET}  {msg}")


def error(msg):
    print(f"{RED}[ERROR]{RESET} {msg}")


def progress(msg):
    print(f"{DIM}  ↳ {msg}{RESET}")


# ─── Validate Input File ──────────────────────────────────────────────────────
def validate_file(filepath: str) -> pathlib.Path:
    path = pathlib.Path(filepath).resolve()

    if not path.exists():
        error(f"File not found: {path}")
        sys.exit(1)

    if not path.is_file():
        error(f"Path is not a file: {path}")
        sys.exit(1)

    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        error(
            f"Unsupported file type: '{path.suffix}'\n"
            f"        Run with --list to see supported types."
        )
        sys.exit(1)

    return path


# ─── Build Output Path ────────────────────────────────────────────────────────
def build_output_path(input_path: pathlib.Path) -> pathlib.Path:
    """
    Output .md saved to the current working directory
    with the same stem as the input file.
    e.g. invoice.pdf → <cwd>/invoice.md
    """
    cwd = pathlib.Path.cwd()
    output_path = cwd / f"{input_path.stem}.md"

    # If file already exists, append a counter to avoid overwrite
    if output_path.exists():
        counter = 1
        while output_path.exists():
            output_path = cwd / f"{input_path.stem}_{counter}.md"
            counter += 1
        warning(
            f"Output file already exists. "
            f"Saving as: {output_path.name}"
        )

    return output_path


# ─── Core Conversion ──────────────────────────────────────────────────────────
def convert_file(input_path: pathlib.Path) -> str:
    """Run Docling conversion and return markdown string."""
    try:
        from docling.document_converter import DocumentConverter
    except ImportError:
        error(
            "Docling is not installed.\n"
            "        Run: pip install docling"
        )
        sys.exit(1)

    progress("Loading Docling converter...")
    converter = DocumentConverter()

    progress(f"Converting: {input_path.name}")
    start = time.perf_counter()

    try:
        result = converter.convert(str(input_path))
    except Exception as e:
        error(f"Docling conversion failed:\n        {e}")
        sys.exit(1)

    elapsed = time.perf_counter() - start

    try:
        markdown = result.document.export_to_markdown()
    except Exception as e:
        error(f"Failed to export markdown:\
        {e}")
        sys.exit(1)

    if not markdown or not markdown.strip():
        warning(
            "Docling returned empty markdown.\n"
            "        The file may be scanned/image-only "
            "or contain no extractable text."
        )

    progress(f"Conversion completed in {elapsed:.2f}s")
    return markdown, elapsed


# ─── Save Output ─────────────────────────────────────────────────────────────
def save_markdown(output_path: pathlib.Path, markdown: str):
    try:
        output_path.write_text(markdown, encoding="utf-8")
    except OSError as e:
        error(f"Failed to write output file:\
        {e}")
        sys.exit(1)


# ─── Stats ───────────────────────────────────────────────────────────────────
def print_stats(
    input_path: pathlib.Path,
    output_path: pathlib.Path,
    markdown: str,
    elapsed: float,
):
    lines = markdown.count("\
") + 1
    words = len(markdown.split())
    chars = len(markdown)
    size_kb = output_path.stat().st_size / 1024

    print()
    print(f"{BOLD}{'─' * 44}{RESET}")
    success(f"Conversion complete!")
    print(f"{BOLD}{'─' * 44}{RESET}")
    print(f"  {'Input:':<14} {input_path.name}")
    print(f"  {'Output:':<14} {output_path}")
    print(f"  {'Lines:':<14} {lines:,}")
    print(f"  {'Words:':<14} {words:,}")
    print(f"  {'Characters:':<14} {chars:,}")
    print(f"  {'Output size:':<14} {size_kb:.1f} KB")
    print(f"  {'Time taken:':<14} {elapsed:.2f}s")
    print(f"{BOLD}{'─' * 44}{RESET}")
    print()


# ─── Argument Parser ──────────────────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="convert",
        description="Convert documents to Markdown using Docling (offline).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python convert.py report.pdf
  python convert.py invoice.docx
  python convert.py slide_deck.pptx
  python convert.py --list
        """,
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="Path to the document file to convert.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all supported file types and exit.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 1.0.0",
    )
    return parser


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    enable_ansi_windows()
    print_banner()

    parser = build_parser()
    args = parser.parse_args()

    # --list flag
    if args.list:
        print_supported_types()
        sys.exit(0)

    # No file provided
    if not args.file:
        parser.print_help()
        print()
        error("No input file specified.")
        print(f"\n{DIM}Example: python convert.py report.pdf{RESET}\n")
        sys.exit(1)

    # ── Run conversion pipeline ───────────────────────────────────────────────
    info(f"Input file : {args.file}")

    input_path  = validate_file(args.file)
    output_path = build_output_path(input_path)

    info(f"Output file: {output_path}")
    print()

    markdown, elapsed = convert_file(input_path)
    save_markdown(output_path, markdown)
    print_stats(input_path, output_path, markdown, elapsed)


if __name__ == "__main__":
    main()
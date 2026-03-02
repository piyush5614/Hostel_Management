from fpdf import FPDF
import os

# Use the existing full PDF to extract pages
# Since fpdf2 can't extract pages, we'll use pypdf
try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    print("Installing pypdf...")
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    from pypdf import PdfReader, PdfWriter

source_pdf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source_code", "Source_Code.pdf")
output_pdf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source_code", "Source_Code_Short.pdf")

reader = PdfReader(source_pdf)
writer = PdfWriter()
total = len(reader.pages)

print(f"Full PDF has {total} pages.")
print(f"Extracting: First 10 pages (1-10) + Last 10 pages ({total-9}-{total})")

# First 10 pages
for i in range(min(10, total)):
    writer.add_page(reader.pages[i])

# Last 10 pages
start = max(10, total - 10)  # avoid duplicates if PDF < 20 pages
for i in range(start, total):
    writer.add_page(reader.pages[i])

with open(output_pdf, "wb") as f:
    writer.write(f)

final_pages = min(10, total) + (total - start)
print(f"\nDone! Saved {final_pages}-page PDF to:")
print(output_pdf)

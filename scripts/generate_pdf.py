import os
from fpdf import FPDF

class CodePDF(FPDF):
    def header(self):
        if hasattr(self, '_current_file'):
            self.set_font("Courier", "B", 10)
            self.cell(0, 8, self._current_file, border=0, ln=True, align="L")
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("Courier", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

source_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source_code")
output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "source_code", "Source_Code.pdf")

pdf = CodePDF(orientation="P", unit="mm", format="A4")
pdf.set_auto_page_break(auto=True, margin=20)

extensions = {".html", ".ts", ".tsx", ".css", ".sql", ".js", ".jsx"}
files = []
for root, dirs, fnames in os.walk(source_dir):
    for fname in sorted(fnames):
        if os.path.splitext(fname)[1].lower() in extensions:
            files.append(os.path.join(root, fname))

files.sort(key=lambda f: f.replace(source_dir, ""))

print(f"Found {len(files)} source files. Generating PDF...")

for filepath in files:
    rel_path = os.path.relpath(filepath, source_dir)
    pdf._current_file = rel_path
    pdf.add_page()
    pdf.set_font("Courier", size=7.5)

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception:
        pdf.cell(0, 5, "[Could not read file]", ln=True)
        continue

    for i, line in enumerate(lines, 1):
        line = line.rstrip("\n\r")
        line = line.replace("\t", "    ")
        text = f"{i:4d} | {line}"
        if len(text) > 120:
            text = text[:117] + "..."
        try:
            pdf.cell(0, 3.5, text, ln=True)
        except Exception:
            safe = text.encode("ascii", "replace").decode("ascii")
            pdf.cell(0, 3.5, safe, ln=True)

pdf.output(output_file)
print(f"\nDone! PDF saved to: {output_file}")
print(f"Total pages: {pdf.page_no()}")

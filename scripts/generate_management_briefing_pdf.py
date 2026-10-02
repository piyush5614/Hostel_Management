#!/usr/bin/env python3
"""Render the management project briefing Markdown as a print-ready PDF."""

from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "PROJECT_OVERVIEW_FOR_MANAGEMENT.md"
OUTPUT = ROOT / "docs" / "pdf" / "TC_Hostel_Connect_Management_Briefing.pdf"
INK = colors.HexColor("#263238")
BLUE = colors.HexColor("#174A67")
PALE_BLUE = colors.HexColor("#EAF2F6")
GRID = colors.HexColor("#C8D4DA")


def inline_markup(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Courier" size="8">\1</font>', text)
    return text


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="BriefTitle", parent=styles["Title"], fontName="Helvetica-Bold",
        fontSize=22, leading=27, textColor=BLUE, alignment=TA_LEFT,
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="BriefSection", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=14, leading=18, textColor=BLUE, spaceBefore=13, spaceAfter=7,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="BriefSubsection", parent=styles["Heading3"], fontName="Helvetica-Bold",
        fontSize=11, leading=14, textColor=INK, spaceBefore=9, spaceAfter=4,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="BriefBody", parent=styles["BodyText"], fontName="Helvetica",
        fontSize=9.3, leading=13, textColor=INK, spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BriefBullet", parent=styles["BriefBody"], leftIndent=2,
        spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name="BriefTable", parent=styles["BriefBody"], fontSize=8.2,
        leading=10.5, spaceAfter=0,
    ))
    styles.add(ParagraphStyle(
        name="BriefCode", parent=styles["Code"], fontName="Courier",
        fontSize=7.5, leading=10, textColor=INK, backColor=PALE_BLUE,
        borderColor=GRID, borderWidth=0.5, borderPadding=7,
        leftIndent=5, rightIndent=5, spaceBefore=4, spaceAfter=8,
    ))
    return styles


def parse_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def render_table(lines: list[str], styles) -> Table:
    rows = [parse_table_row(line) for line in lines]
    if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in rows[1]):
        rows.pop(1)
    data = [[Paragraph(inline_markup(cell), styles["BriefTable"]) for cell in row] for row in rows]
    usable_width = A4[0] - 36 * mm
    col_width = usable_width / len(data[0])
    table = Table(data, colWidths=[col_width] * len(data[0]), repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def build_story(source: str, styles):
    lines = source.splitlines()
    story = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue

        if line.startswith("```"):
            index += 1
            code_lines = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index].rstrip())
                index += 1
            story.append(Preformatted("\n".join(code_lines), styles["BriefCode"]))
            index += 1
            continue

        if line.startswith("|"):
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1
            story.append(render_table(table_lines, styles))
            story.append(Spacer(1, 6))
            continue

        heading = re.match(r"^(#{1,3})\s+(.*)$", line)
        if heading:
            level = len(heading.group(1))
            style_name = "BriefTitle" if level == 1 else "BriefSection" if level == 2 else "BriefSubsection"
            story.append(Paragraph(inline_markup(heading.group(2)), styles[style_name]))
            index += 1
            continue

        if re.match(r"^(?:-\s+|\d+\.\s+)", line):
            items = []
            ordered = bool(re.match(r"^\d+\.\s+", line))
            while index < len(lines):
                item_line = lines[index].strip()
                match = re.match(r"^(?:-\s+|\d+\.\s+)(.*)$", item_line)
                if not match:
                    break
                items.append(ListItem(
                    Paragraph(inline_markup(match.group(1)), styles["BriefBullet"]),
                    leftIndent=10,
                ))
                index += 1
            story.append(ListFlowable(
                items, bulletType="1" if ordered else "bullet",
                start="1", leftIndent=15, bulletFontName="Helvetica",
                bulletFontSize=8, bulletColor=BLUE,
            ))
            story.append(Spacer(1, 4))
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(lines):
            next_line = lines[index].strip()
            if (not next_line or next_line.startswith(("#", "|", "```"))
                    or re.match(r"^(?:-\s+|\d+\.\s+)", next_line)):
                break
            paragraph_lines.append(next_line)
            index += 1
        story.append(Paragraph(inline_markup(" ".join(paragraph_lines)), styles["BriefBody"]))

    return story


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GRID)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#607D8B"))
    canvas.drawString(18 * mm, 10 * mm, "TC Hostel Connect | Management Briefing")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Briefing source not found: {SOURCE}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=17 * mm, bottomMargin=21 * mm,
        title="TC Hostel Connect: Project Briefing",
        author="TC Hostel Connect Project Team",
    )
    document.build(build_story(SOURCE.read_text(encoding="utf-8"), make_styles()),
                   onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
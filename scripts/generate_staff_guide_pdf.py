from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "MAXIMS_CMS_STAFF_GUIDE.md"
OUTPUT = ROOT / "docs" / "Maxims-Interiors-Staff-CMS-Guide.pdf"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=26, leading=31, textColor=colors.HexColor("#3a123d"), spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=15, leading=19, textColor=colors.HexColor("#6a265f"),
    spaceBefore=15, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="BodyGuide", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=10, leading=14, textColor=colors.HexColor("#292329"), spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="BulletGuide", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=10, leading=14, leftIndent=14, firstLineIndent=-9,
    textColor=colors.HexColor("#292329"), spaceAfter=4,
))

def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d4ad54"))
    canvas.line(18 * mm, 15 * mm, 192 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#6a265f"))
    canvas.drawString(18 * mm, 10 * mm, "MAXIMS INTERIORS  |  STAFF CMS GUIDE")
    canvas.drawRightString(192 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()

def build():
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=22 * mm,
        title="Maxims Interiors Staff CMS Guide", author="Maxims Interiors",
    )
    story = []
    first_heading = True
    for raw in SOURCE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            story.append(Spacer(1, 4))
            continue
        if line.startswith("# "):
            story.append(Paragraph(escape(line[2:]), styles["CoverTitle"]))
            story.append(Paragraph("A practical reference for the Maxims team", styles["BodyGuide"]))
            story.append(Spacer(1, 16))
        elif line.startswith("## "):
            if not first_heading:
                story.append(Spacer(1, 5))
            first_heading = False
            story.append(Paragraph(escape(line[3:]), styles["Section"]))
        elif line.startswith("- "):
            story.append(Paragraph("• " + escape(line[2:]), styles["BulletGuide"]))
        elif line[0].isdigit() and ". " in line[:4]:
            number, text = line.split(". ", 1)
            story.append(Paragraph(f"<b>{escape(number)}.</b> {escape(text)}", styles["BulletGuide"]))
        else:
            story.append(Paragraph(escape(line), styles["BodyGuide"]))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)

if __name__ == "__main__":
    build()

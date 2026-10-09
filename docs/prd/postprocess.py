"""PDF post-processing for docs/prd/build.mjs.

    postprocess.py pages  body.pdf headings.json
        -> prints the headings, each with the page it landed on
    postprocess.py merge  cover.pdf body.pdf headings.json out.pdf "Title"
        -> joins cover + body, writes bookmarks and metadata

Page numbers are the body's own (the cover is unnumbered), which is what the
footer prints; the bookmarks use physical pages.
"""
import json
import re
import sys

import pymupdf


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def heading_lines(doc):
    """Every line set in a heading-sized face, with its page. The contents page
    is set small, so it never matches."""
    out = []
    for pno, page in enumerate(doc, start=1):
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                size = max((s["size"] for s in line["spans"]), default=0)
                if size >= 12.4:
                    out.append((pno, size, norm("".join(s["text"] for s in line["spans"]))))
    return out


def locate(doc, headings):
    lines = heading_lines(doc)
    cursor = 0  # headings are in document order, so each search starts where the last one ended
    result = []
    for h in headings:
        want = norm(h["title"])
        probe = want[:28]
        # chapters are set at ~23pt; subheadings at ~13.5pt
        floor = 20 if h["level"] == 1 else 12.4
        page = None
        for i in range(cursor, len(lines)):
            pno, size, text = lines[i]
            if size >= floor and probe in text and (h["level"] == 1 or size < 20):
                page, cursor = pno, i + 1
                break
        result.append({**h, "page": page})
    return result


def main():
    cmd = sys.argv[1]
    if cmd == "pages":
        doc = pymupdf.open(sys.argv[2])
        headings = json.load(open(sys.argv[3]))
        print(json.dumps(locate(doc, headings)))
    elif cmd == "merge":
        cover, body, heads, out, title = sys.argv[2:7]
        headings = json.load(open(heads))
        merged = pymupdf.open(cover)
        merged.insert_pdf(pymupdf.open(body))
        toc = []
        for h in headings:
            if h.get("page"):
                label = (h["no"] + "  " if h.get("no") else "") + h["title"]
                toc.append([h["level"], label, h["page"] + 1])  # + the cover
        merged.set_toc(toc)
        merged.set_metadata({
            "title": title,
            "author": "Tim Pengembangan Tata Gemilang ERP",
            "subject": "Product Requirements Document — fitur, aturan bisnis, arsitektur, pemetaan database",
            "keywords": "PRD, ERP, outsourcing, procurement, finance, RBAC",
            "creator": "docs/prd/build.mjs",
        })
        merged.save(out, deflate=True, garbage=3)
        import os
        print(json.dumps({"pages": merged.page_count, "bytes": os.path.getsize(out)}))
    else:
        sys.exit(f"unknown command {cmd}")


if __name__ == "__main__":
    main()

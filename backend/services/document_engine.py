"""Retrieve relevant passages from the local university knowledge base."""

import logging
import re
import unicodedata
from collections.abc import Iterator
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

from pypdf import PdfReader


_WORD = re.compile(r"[^\W_]+")
_PASSAGE_BREAK = re.compile(r"\n\s*\n|(?<=[.!?])\s+(?=[A-Z\u00c0-\u00de])")
_STOP_WORDS = frozenset("""
    a an and are as at be by can could did do does for from has have how i in
    information is it me my of on or our please should tell than that the their
    them there they this to unilia university was were what when where which
    who why will with would you your
""".split())
_WORDML = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
_WORD_FORMS = {
    "applied": "application",
    "apply": "application",
    "applying": "application",
    "campuses": "campus",
    "enrol": "enrolment",
    "enroll": "enrolment",
    "enrolled": "enrolment",
    "enrollment": "enrolment",
    "register": "registration",
    "registered": "registration",
    "registering": "registration",
}
SUPPORTED_TYPES = frozenset({"txt", "pdf", "docx"})
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Passage:
    text: str
    terms: frozenset[str]
    page: int | None


def _word_root(word: str) -> str:
    if len(word) > 4 and word.endswith("ies"):
        word = word[:-3] + "y"
    elif len(word) > 4 and word.endswith(("sses", "shes", "ches", "xes", "zes")):
        word = word[:-2]
    elif word not in _WORD_FORMS and len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "is", "us")):
        word = word[:-1]
    return _WORD_FORMS.get(word, word)


def question_terms(text: str) -> frozenset[str]:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    return frozenset(
        _word_root(word)
        for word in _WORD.findall(normalized)
        if len(word) > 1 and word not in _STOP_WORDS
    )


def _docx_text(path: Path) -> str:
    with ZipFile(path) as archive, archive.open("word/document.xml") as contents:
        document = ElementTree.parse(contents)

    paragraphs = []
    for paragraph in document.iter(_WORDML + "p"):
        text = []
        for node in paragraph.iter():
            if node.tag == _WORDML + "t":
                text.append(node.text or "")
            elif node.tag in {_WORDML + "tab", _WORDML + "br"}:
                text.append(" ")
        paragraphs.append("".join(text))
    return "\n\n".join(paragraphs)


def _sections(path: Path, file_type: str) -> Iterator[tuple[int | None, str]]:
    if file_type == "pdf":
        with path.open("rb") as stream:
            for number, page in enumerate(PdfReader(stream).pages, start=1):
                yield number, page.extract_text()
    elif file_type == "docx":
        yield None, _docx_text(path)
    elif file_type == "txt":
        raw = path.read_bytes()
        if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
            text = raw.decode("utf-16")
        else:
            try:
                text = raw.decode("utf-8-sig")
            except UnicodeDecodeError:
                text = raw.decode("cp1252", errors="replace")
        yield None, text


def _section_passages(page: int | None, text: str) -> Iterator[Passage]:
    segments = [" ".join(segment.split()) for segment in _PASSAGE_BREAK.split(text or "")]
    segments = [segment for segment in segments if segment]
    for index, segment in enumerate(segments):
        words = segment.split()
        is_heading = len(words) <= 6 and not any(character in segment for character in ".:!?0123456789")
        if index + 1 < len(segments) and (is_heading or segment.endswith((":", "?"))):
            words += segments[index + 1].split()[:40]

        for start in range(0, len(words), 80):
            excerpt = " ".join(words[start:start + 100])
            terms = question_terms(excerpt)
            if terms:
                yield Passage(excerpt, terms, page)


@lru_cache(maxsize=64)
def _read_passages(path: Path, file_type: str, _version: tuple[int, int]) -> tuple[Passage, ...]:
    passages = []
    try:
        for page, text in _sections(path, file_type):
            passages.extend(_section_passages(page, text))
    except Exception as error:
        logger.warning("Could not finish reading %s upload %s (%s).", file_type, path.name, type(error).__name__)
    return tuple(passages)


def read_passages(path: Path, file_type: str) -> tuple[Passage, ...]:
    """Reuse extracted passages while the underlying upload is unchanged."""
    version = path.stat()
    return _read_passages(path, file_type, (version.st_mtime_ns, version.st_size))


def relevance(query: frozenset[str], passage: Passage) -> tuple[int, float]:
    """Score passages only when their overlap can support the question."""
    shared = query & passage.terms
    if len(shared) * 2 < len(query) or not any(word.isalpha() for word in shared):
        return (0, 0.0)
    return (len(shared), len(shared) / len(passage.terms))

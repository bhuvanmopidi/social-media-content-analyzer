# Approach

The brief asks for two extraction paths, but real documents don't split
cleanly — a PDF can have text on one page and a screenshot on the next. So
rather than branching on file type, the app classifies each page by text
density and routes it individually, merging results back in reading order.
Pages with a usable text layer take the fast path; pages without are rendered
to canvas and OCR'd.

OCR quality depends more on preprocessing than on the engine. Screenshots are
upscaled to a workable glyph height, converted to grayscale, inverted when
dark-mode is detected, and contrast-stretched on percentiles. A low-confidence
first pass retries with sparse-text segmentation. Output that scores poorly on
both confidence and word-shape is rejected rather than shown as noise.

Analysis is deliberately split. Deterministic rules handle anything countable —
length against platform caps, hashtag placement, readability, whether the text
before a platform's "see more" fold gives any reason to expand. These render
instantly and never fail. An LLM layer adds rewrites on top, prompted with the
target platform's register and constraints, cached per platform. If the key is
missing or the API fails, the app quietly falls back to rules alone.

Nothing is uploaded or stored.
# Configuration file for the Sphinx documentation builder.
import os
import sys

project = "Model Flight Recorder"
copyright = "2026, Emmanuel Kyeremeh"
author = "Emmanuel Kyeremeh"
release = "0.1.0"

extensions = [
    "myst_parser",
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.todo",
    "sphinx.ext.viewcode",
]

myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "fieldlist",
]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store", ".venv", "images/thumbs"]

html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]
html_logo = None
html_theme_options = {
    "collapse_navigation": False,
    "navigation_depth": 3,
    "style_external_links": True,
}

todo_include_todos = True

source_suffix = {
    ".rst": "restructuredtext",
    ".md": "markdown",
}

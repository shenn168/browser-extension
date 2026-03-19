# Threat Modeling Copilot

Threat Modeling Copilot is a lightweight Microsoft Edge browser extension that helps teams perform an initial threat analysis from a product or feature use-case description.

It is designed as a local-first demonstration tool for early feedback and iterative improvement.

## Purpose

This tool helps:
- Product owners understand likely security risks early
- Security engineers identify relevant threat areas and attack vectors
- Management understand priorities and next steps

## What the tool does

The extension:
- Accepts a product or feature use-case description
- Infers whether the system is primarily:
  - digital
  - AI / agentic AI
  - connected vehicle / automotive-related
- Generates clarification questions to improve analysis quality
- Produces a threat report with:
  - executive summary
  - scope and assumptions
  - key assets
  - trust boundaries
  - prioritized findings
  - recommendations
  - validation ideas
  - audience-based next steps
  - reference appendix

## Framework mappings included in v1

The current version uses lightweight rules-based mappings aligned to:
- STRIDE
- OWASP Top 10
- OWASP API Security Top 10
- OWASP LLM Top 10
- MITRE ATT&CK
- MITRE ATLAS
- NIST AI RMF
- NIST CSF 2.0
- UN R155 Annex 5

## Current implementation

This v1 demo is built with:
- HTML
- CSS
- JavaScript
- Edge Extension Manifest V3
- Local browser storage

The extension is intentionally modular enough for future improvements such as:
- backend integration
- LLM-assisted analysis
- richer framework taxonomies
- organization-specific control mappings
- enhanced scoring models

## Folder structure

```plaintext
edge-threat-modeler-js/
  manifest.json
  popup.html
  popup.css
  popup.js
  data/
    frameworks.js
    samples.js
  icons/
    icon16.png
    icon32.png
    icon48.png
    icon128.png
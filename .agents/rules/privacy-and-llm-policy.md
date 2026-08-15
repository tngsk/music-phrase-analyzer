# Privacy & Hybrid LLM Execution Policy

## Core Principle
- **Speed vs. Privacy Boundary**:
  - Local LLMs running on Apple Silicon (M2) are allocated strictly for **data privacy, confidentiality, PII sanitization, and copyright protection**, rather than execution throughput.
  - Cloud AI coding agents (Google Jules, Antigravity) are allocated for **high-throughput code generation, UI/UX scaffolding, and E2E integration testing**.

## Task Allocation Guidelines

### 1. Local LLM Allocation (Ollama / Local Models)
- **Sensitive Audio & Track Metadata**: Analysis of unreleased demo tracks, proprietary audio stems, or copyright-protected song metadata.
- **PII Masking & Sanitization**: Pre-processing user prompts and codebases to mask private keys, student/user personal info, and confidential paths before external dispatch.
- **Local Analysis Note Generation**: Generating human-readable musical critique or lecture notes that must remain strictly offline.

### 2. Cloud AI / Jules Allocation
- **Full-Stack Implementation**: FastAPI routing, React components, CSS/Tailwind styling, and build pipelines.
- **Complex Signal & Library Workflows**: Librosa signal processing pipelines, PrettyMIDI manipulation, Wavesurfer.js integration.
- **E2E & Unit Test Automation**: Generating comprehensive test suites and running verification.

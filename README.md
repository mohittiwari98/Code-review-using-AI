# Code-review-using-AI

A web app that analyzes code snippets (Python, JavaScript, Java, C++) using the Gemini API for feedback on style, bugs, and optimizations. Features a glassmorphism UI, Chart.js radar chart, PDF export, confetti, dark mode, and accessibility.

Features

Analyzes code with Gemini API, providing a 0-100% quality score.

Displays feedback and metrics (readability, complexity, correctness, efficiency).

Visualizes metrics with a colorful radar chart.

Exports reports as PDF (jsPDF).

Includes confetti for scores ≥80%, dark mode, and ARIA accessibility.

Saves results to LocalStorage.


Usage

Select language, paste code (e.g., Python factorial), and click “Review Code” or press Ctrl+Enter.

View score, feedback, radar chart, and code snippet.

Download PDF report or copy code.

Toggle dark mode and test accessibility with NVDA.

Project Structure

code-review-assistant/

├── index.html

├── styles.css

├── script.js

└── README.md


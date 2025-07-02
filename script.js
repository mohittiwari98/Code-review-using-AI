//script file or
const API_KEY = "";
const API_URL = "";
const { jsPDF } = window.jspdf;
let metricsChart;


const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }
}


function renderChart(metrics) {
    if (!document.getElementById('metrics-chart')) {
        console.error('Metrics chart canvas not found');
        return;
    }
    if (metricsChart) metricsChart.destroy();

    const ctx = document.getElementById('metrics-chart').getContext('2d');
    metricsChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Readability', 'Complexity', 'Correctness', 'Efficiency'],
            datasets: [{
                label: 'Code Quality Metrics',
                data: [
                    metrics.readability || 50,
                    metrics.complexity || 50,
                    metrics.correctness || 50,
                    metrics.efficiency || 50
                ],
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: '#8b5cf6',
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointHoverBackgroundColor: '#ec4899'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Code Quality Metrics', font: { size: 16, weight: 'bold' }, color: '#1f2937' },
                legend: { position: 'bottom', labels: { color: '#1f2937' } },
                tooltip: { backgroundColor: '#1f2937', titleColor: '#ffffff', bodyColor: '#ffffff' }
            },
            scales: {
                r: {
                    angleLines: { color: '#e5e7eb' },
                    grid: { color: '#e5e7eb' },
                    pointLabels: { font: { size: 14 }, color: '#1f2937' },
                    ticks: { beginAtZero: true, max: 100, stepSize: 20, color: '#1f2937' }
                }
            }
        }
    });
}


async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const delay = backoff * Math.pow(2, i);
                console.warn(`Rate limit hit for ${url}, retrying after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
    throw new Error('Max retries reached');
}


async function reviewCode() {
    const codeInput = document.getElementById('code-input');
    const languageSelect = document.getElementById('language');
    const reviewResult = document.getElementById('review-result');
    const loadingDiv = document.getElementById('loading');
    const codeDisplay = document.getElementById('code-display');
    const copyButton = document.getElementById('copy-code');
    const downloadButton = document.getElementById('download-pdf');

    if (!codeInput || !languageSelect || !reviewResult || !loadingDiv || !codeDisplay || !copyButton || !downloadButton) {
        console.error('DOM elements missing:', { codeInput, languageSelect, reviewResult, loadingDiv, codeDisplay, copyButton, downloadButton });
        alert('Error: Page elements not loaded. Please refresh.');
        return;
    }

    const code = codeInput.value.trim();
    const language = languageSelect.value;
    if (!code) {
        alert('Please enter a code snippet!');
        return;
    }

    loadingDiv.classList.remove('hidden');
    reviewResult.classList.add('hidden');
    codeDisplay.classList.add('hidden');
    copyButton.classList.add('hidden');
    downloadButton.classList.add('hidden');

    try {
        
        const prompt = `
            Analyze the following ${language} code snippet for style, potential bugs, and optimizations:
            \`\`\`
            ${code}
            \`\`\`

            Provide:
            - A quality score (0-100%) based on readability, complexity, correctness, and efficiency.
            - A short feedback summary (50-70 words) explaining the score.
            - 3-5 bullet points detailing strengths and areas for improvement.
            - Scores (0-100) for readability, complexity, correctness, and efficiency.

            Return the response in JSON format:
            {
                "score": number,
                "feedback": string,
                "details": string[],
                "metrics": {
                    "readability": number,
                    "complexity": number,
                    "correctness": number,
                    "efficiency": number
                }
            }
        `;

        
        const response = await fetchWithRetry(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: 'application/json' }
            })
        });

        const data = await response.json();
        let result;
        try {
            result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
        } catch (error) {
            console.warn('Failed to parse Gemini response:', error);
            result = {
                score: 60,
                feedback: 'No feedback available due to API parsing error.',
                details: ['No details provided.'],
                metrics: { readability: 50, complexity: 50, correctness: 50, efficiency: 50 }
            };
        }

        const { score = 60, feedback = 'No feedback provided.', details = ['No details available.'], metrics = { readability: 50, complexity: 50, correctness: 50, efficiency: 50 } } = result;

        // Update UI
        document.getElementById('result-score').textContent = `Quality Score: ${score}%`;
        document.getElementById('result-feedback').textContent = feedback;
        document.getElementById('result-details').innerHTML = details.map(detail => `<li>${detail}</li>`).join('');
        codeDisplay.textContent = code;
        codeDisplay.classList.remove('hidden');
        reviewResult.classList.remove('hidden');
        reviewResult.classList.add('slide-in');
        copyButton.classList.remove('hidden');
        downloadButton.classList.remove('hidden');

        // Render chart
        renderChart(metrics);

        // Save to localStorage
        try {
            localStorage.setItem('codeReviewData', JSON.stringify({
                code,
                language,
                score,
                feedback,
                details,
                metrics
            }));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }

        // Confetti for high scores
        if (score >= 80) {
            confetti({ particleCount: 150, spread: 80, colors: ['#3b82f6', '#ec4899', '#8b5cf6'], origin: { y: 0.6 } });
        }

        setTimeout(() => {
            reviewResult.classList.remove('slide-in');
            codeDisplay.classList.remove('slide-in');
        }, 600);
    } catch (error) {
        console.error('Error in reviewCode:', error);
        codeDisplay.textContent = `Error: Failed to review code. ${error.message.includes('429') ? 'API rate limit exceeded. Please try again later.' : error.message}`;
        codeDisplay.classList.remove('hidden');
        codeDisplay.classList.add('slide-in');
        setTimeout(() => codeDisplay.classList.remove('slide-in'), 600);
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

// Download PDF
document.getElementById('download-pdf').addEventListener('click', () => {
    const reviewResult = document.getElementById('review-result');
    if (!reviewResult || reviewResult.classList.contains('hidden')) {
        alert('Review code first!');
        return;
    }
    try {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Code Review Report', 10, 10);
        doc.setFontSize(12);
        doc.text(document.getElementById('result-score')?.textContent || 'Score: Unknown', 10, 20);
        doc.setFontSize(14);
        doc.text('Feedback', 10, 30);
        doc.setFontSize(10);
        doc.text(document.getElementById('result-feedback')?.textContent || 'No feedback', 10, 40, { maxWidth: 190 });
        doc.setFontSize(14);
        doc.text('Details', 10, 70);
        doc.setFontSize(10);
        const details = Array.from(document.getElementById('result-details')?.children || []).map(li => li.textContent);
        details.forEach((detail, i) => doc.text(`- ${detail}`, 10, 80 + i * 10));
        doc.setFontSize(14);
        doc.text('Code Snippet', 10, 80 + details.length * 10 + 10);
        doc.setFontSize(10);
        doc.text(document.getElementById('code-display')?.textContent || 'No code', 10, 90 + details.length * 10, { maxWidth: 190 });
        doc.setFontSize(14);
        doc.text('Metrics', 10, 90 + details.length * 10 + 30);
        doc.setFontSize(10);
        let metrics = {};
        try {
            metrics = JSON.parse(localStorage.getItem('codeReviewData'))?.metrics || {};
        } catch (error) {
            console.warn('Failed to parse metrics from localStorage:', error);
        }
        const metricsText = Object.entries(metrics).map(([key, value]) => `${key}: ${value}%`).join(', ');
        doc.text(metricsText || 'No metrics', 10, 100 + details.length * 10 + 30, { maxWidth: 190 });
        doc.save('code_review.pdf');
        confetti({ particleCount: 150, spread: 80, colors: ['#3b82f6', '#ec4899', '#8b5cf6'], origin: { y: 0.6 } });
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF.');
    }
});

// Copy code
document.getElementById('copy-code').addEventListener('click', () => {
    const codeDisplay = document.getElementById('code-display');
    if (codeDisplay) {
        navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('Failed to copy code.');
        });
    }
});

// Load saved data
document.addEventListener('DOMContentLoaded', () => {
    let savedData;
    try {
        savedData = JSON.parse(localStorage.getItem('codeReviewData'));
    } catch (error) {
        console.warn('Failed to parse localStorage:', error);
        return;
    }
    if (savedData) {
        const elements = {
            codeInput: document.getElementById('code-input'),
            language: document.getElementById('language'),
            resultScore: document.getElementById('result-score'),
            resultFeedback: document.getElementById('result-feedback'),
            resultDetails: document.getElementById('result-details'),
            codeDisplay: document.getElementById('code-display'),
            reviewResult: document.getElementById('review-result'),
            copyCode: document.getElementById('copy-code'),
            downloadPdf: document.getElementById('download-pdf')
        };
        if (Object.values(elements).some(el => !el)) {
            console.error('DOM elements missing during saved data load:', elements);
            return;
        }
        elements.codeInput.value = savedData.code;
        elements.language.value = savedData.language;
        elements.resultScore.textContent = `Quality Score: ${savedData.score}%`;
        elements.resultFeedback.textContent = savedData.feedback;
        elements.resultDetails.innerHTML = savedData.details.map(detail => `<li>${detail}</li>`).join('');
        elements.codeDisplay.textContent = savedData.code;
        elements.reviewResult.classList.remove('hidden');
        elements.codeDisplay.classList.remove('hidden');
        elements.copyCode.classList.remove('hidden');
        elements.downloadPdf.classList.remove('hidden');
        renderChart(savedData.metrics || { readability: 50, complexity: 50, correctness: 50, efficiency: 50 });
        setTimeout(() => {
            elements.reviewResult.classList.remove('slide-in');
            elements.codeDisplay.classList.remove('slide-in');
        }, 600);
    }
});

// Keyboard navigation
const codeInput = document.getElementById('code-input');
if (codeInput) {
    codeInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') reviewCode();
    });
              }

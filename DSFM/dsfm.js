// DSFM Analysis Frontend

let currentSymbol = '';
let chartInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadAvailableSymbols();
    loadAllFinbertData();
});

// Fallback symbols based on CSV structure
const FALLBACK_SYMBOLS = [
    { value: 'CDUR_ASIANPAINT', display: 'ASIANPAINT' },
    { value: 'FIN_HDFCBANK', display: 'HDFCBANK' },
    { value: 'PWR_NTPC', display: 'NTPC' },
    { value: 'AUTO_MARUTI', display: 'MARUTI' },
    { value: 'IT_WIPRO', display: 'WIPRO' },
    { value: 'HLTH_SUNPHARMA', display: 'SUNPHARMA' },
    { value: 'CONST_ULTRACEMCO', display: 'ULTRACEMCO' },
    { value: 'IT_TECHM', display: 'TECHM' },
    { value: 'FMCG_HINDUNILVR', display: 'HINDUNILVR' },
    { value: 'AUTO_BAJAJ-AUTO', display: 'BAJAJAUTO' },
    { value: 'AUTO_M&M', display: 'MM' },
    { value: 'CONST_LT', display: 'LT' },
    { value: 'FIN_AXISBANK', display: 'AXISBANK' },
    { value: 'TEL_BHARTIARTL', display: 'BHARTIARTL' },
    { value: 'IT_INFY', display: 'INFY' },
    { value: 'IT_TCS', display: 'TCS' },
    { value: 'FIN_ICICIBANK', display: 'ICICIBANK' },
    { value: 'FIN_SBIN', display: 'SBIN' },
    { value: 'OILGAS_RELIANCE', display: 'RELIANCE' },
    { value: 'METAL_TATASTEEL', display: 'TATASTEEL' }
];

async function loadAvailableSymbols() {
    const symbolSelect = document.getElementById('symbolSelect');
    if (!symbolSelect) return;

    try {
        const data = await window.API.getDSFMAvailableSymbols();
        symbolSelect.innerHTML = '<option value="">-- Select Symbol --</option>';
        
        if (data.symbols && data.symbols.length > 0) {
            data.symbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol.value;
                option.textContent = `${symbol.display} (${symbol.value})`;
                symbolSelect.appendChild(option);
            });
        } else {
            symbolSelect.innerHTML = '<option value="">No symbols available</option>';
        }
    } catch (error) {
        console.error('Failed to load symbols:', error);
        
        // Use fallback symbols if backend is not available
        if (error.isConnectionError) {
            symbolSelect.innerHTML = '<option value="">-- Select Symbol (Backend Offline - Using Fallback) --</option>';
            FALLBACK_SYMBOLS.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol.value;
                option.textContent = `${symbol.display} (${symbol.value})`;
                symbolSelect.appendChild(option);
            });
            
            // Show connection warning
            showConnectionWarning();
        } else {
            symbolSelect.innerHTML = '<option value="">Error loading symbols</option>';
        }
    }
}

function showConnectionWarning() {
    // Check if warning already exists
    if (document.getElementById('connectionWarning')) return;
    
    const warning = document.createElement('div');
    warning.id = 'connectionWarning';
    warning.className = 'connection-warning';
    warning.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 20px;"></i>
            <div style="flex: 1;">
                <strong style="color: #856404;">Backend Server Not Running</strong>
                <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
                    The Flask backend server is not running on port 8000. Please start it using: 
                    <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">python backend/app.py</code>
                </p>
                <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
                    Using fallback symbol list. Analysis features will not work until the server is started.
                </p>
            </div>
        </div>
    `;
    
    const controls = document.querySelector('.dsfm-controls');
    if (controls && controls.parentNode) {
        controls.parentNode.insertBefore(warning, controls);
    }
}

function initializeEventListeners() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const garchBtn = document.getElementById('garchBtn');
    const lstmBtn = document.getElementById('lstmBtn');
    const finbertBtn = document.getElementById('finbertBtn');
    const symbolSelect = document.getElementById('symbolSelect');
    const loadAllFinbert = document.getElementById('loadAllFinbert');

    analyzeBtn?.addEventListener('click', () => runCombinedAnalysis());
    garchBtn?.addEventListener('click', () => runGarchAnalysis());
    lstmBtn?.addEventListener('click', () => runLstmAnalysis());
    finbertBtn?.addEventListener('click', () => runFinbertAnalysis());
    loadAllFinbert?.addEventListener('click', () => loadAllFinbertData());

    symbolSelect?.addEventListener('change', (e) => {
        currentSymbol = e.target.value;
    });
}

async function runCombinedAnalysis() {
    if (!currentSymbol) {
        alert('Please select a symbol first');
        return;
    }

    showLoading();
    hideResults();

    try {
        const data = await window.API.getDSFMCombinedAnalysis(currentSymbol);
        displayCombinedResults(data);
    } catch (error) {
        if (error.isConnectionError) {
            showError('Backend server is not running. Please start the Flask server: python backend/app.py');
        } else {
            showError('Failed to run combined analysis: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

async function runGarchAnalysis() {
    if (!currentSymbol) {
        alert('Please select a symbol first');
        return;
    }

    showLoading();
    hideResults();

    try {
        const data = await window.API.getDSFMGarchAnalysis(currentSymbol);
        displayGarchResults(data);
    } catch (error) {
        if (error.isConnectionError) {
            showError('Backend server is not running. Please start the Flask server: python backend/app.py');
        } else {
            // Check if error has data property with error details
            let errorMsg = error.message;
            if (error.data && error.data.error) {
                errorMsg = error.data.error;
                if (error.data.details) {
                    console.error('GARCH Error Details:', error.data.details);
                }
            }
            showError('Failed to run GARCH analysis: ' + errorMsg);
        }
    } finally {
        hideLoading();
    }
}

async function runLstmAnalysis() {
    if (!currentSymbol) {
        alert('Please select a symbol first');
        return;
    }

    showLoading();
    hideResults();

    try {
        const data = await window.API.getDSFMLstmAnalysis(currentSymbol);
        displayLstmResults(data);
    } catch (error) {
        if (error.isConnectionError) {
            showError('Backend server is not running. Please start the Flask server: python backend/app.py');
        } else {
            showError('Failed to run LSTM analysis: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

async function runFinbertAnalysis() {
    showLoading();
    hideResults();

    try {
        const data = await window.API.getDSFMFinbertAnalysis();
        displayFinbertResults(data);
    } catch (error) {
        if (error.isConnectionError) {
            showError('Backend server is not running. Please start the Flask server: python backend/app.py');
        } else {
            showError('Failed to run FinBERT analysis: ' + error.message);
        }
    } finally {
        hideLoading();
    }
}

async function loadAllFinbertData() {
    const btn = document.getElementById('loadAllFinbert');
    const content = document.getElementById('allFinbertContent');
    
    if (btn) btn.disabled = true;
    if (content) content.innerHTML = '<p>Loading sentiment data...</p>';

    try {
        const data = await window.API.getDSFMFinbertAnalysis();
        displayAllFinbertResults(data);
    } catch (error) {
        if (content) {
            if (error.isConnectionError) {
                content.innerHTML = `
                    <div class="error-message">
                        <strong>Backend Server Not Running</strong><br>
                        Please start the Flask backend server to load sentiment analysis data.<br>
                        <code>python backend/app.py</code>
                    </div>
                `;
            } else {
                content.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
            }
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

function displayCombinedResults(data) {
    showResults();

    if (data.analyses.garch && !data.analyses.garch.error) {
        displayGarchResults(data.analyses.garch);
    }

    if (data.analyses.lstm && !data.analyses.lstm.error) {
        displayLstmResults(data.analyses.lstm);
    }

    if (data.analyses.finbert && !data.analyses.finbert.error) {
        displayFinbertResults({ results: [data.analyses.finbert] });
    }

    displaySummary(data);
}

function displayGarchResults(data) {
    const content = document.getElementById('garchContent');
    if (!content) return;

    if (data.error) {
        let errorHtml = `<div class="error-message"><strong>Error:</strong> ${data.error}`;
        if (data.details) {
            errorHtml += `<br><br><details><summary>Technical Details</summary><pre style="font-size: 11px; overflow: auto;">${data.details}</pre></details>`;
        }
        if (data.returns_length !== undefined) {
            errorHtml += `<br><small>Returns length: ${data.returns_length}, Std: ${data.returns_std || 'N/A'}, Mean: ${data.returns_mean || 'N/A'}</small>`;
        }
        errorHtml += `</div>`;
        content.innerHTML = errorHtml;
        return;
    }

    const html = `
        <div class="metric-grid">
            <div class="metric-card">
                <h3>Current Volatility</h3>
                <div class="value">${(data.current_volatility * 100).toFixed(2)}%</div>
            </div>
            <div class="metric-card">
                <h3>Model Type</h3>
                <div class="value">${data.model_type || 'GARCH(1,1)'}</div>
            </div>
            <div class="metric-card">
                <h3>AIC</h3>
                <div class="value">${data.aic ? data.aic.toFixed(2) : 'N/A'}</div>
            </div>
            <div class="metric-card">
                <h3>BIC</h3>
                <div class="value">${data.bic ? data.bic.toFixed(2) : 'N/A'}</div>
            </div>
        </div>

        ${data.parameters ? `
        <table class="parameter-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.parameters).map(([key, value]) => `
                    <tr>
                        <td>${key}</td>
                        <td>${value.toFixed(6)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${data.forecast_volatility && Array.isArray(data.forecast_volatility) && data.forecast_volatility.length > 0 ? `
        <h3 style="margin-top: 20px;">30-Day Volatility Forecast</h3>
        <div class="forecast-list">
            ${data.forecast_volatility.slice(0, 30).map((vol, idx) => `
                <div class="forecast-item">
                    <div class="date">Day ${idx + 1}</div>
                    <div class="price">${(vol * 100).toFixed(2)}%</div>
                </div>
            `).join('')}
        </div>
        <p style="margin-top: 15px; font-size: 12px; color: #666;">
            <strong>Data Points:</strong> ${data.data_points || 'N/A'} | 
            <strong>Returns Count:</strong> ${data.returns_count || 'N/A'} |
            <strong>Returns Std:</strong> ${data.returns_std ? data.returns_std.toFixed(4) : 'N/A'}
        </p>
        ` : ''}
    `;

    content.innerHTML = html;
    document.getElementById('garchSection').style.display = 'block';
}

function displayLstmResults(data) {
    const content = document.getElementById('lstmContent');
    if (!content) return;

    if (data.error) {
        content.innerHTML = `<div class="error-message"><strong>Error:</strong> ${data.error}</div>`;
        return;
    }

    const html = `
        <div class="metric-grid">
            <div class="metric-card">
                <h3>Current Price</h3>
                <div class="value">₹${data.current_price ? data.current_price.toFixed(2) : 'N/A'}</div>
            </div>
            <div class="metric-card">
                <h3>Forecast Price (30 days)</h3>
                <div class="value ${data.forecast_price > data.current_price ? 'positive' : 'negative'}">
                    ₹${data.forecast_price ? data.forecast_price.toFixed(2) : 'N/A'}
                </div>
            </div>
            <div class="metric-card">
                <h3>Expected Change</h3>
                <div class="value ${data.expected_change_pct >= 0 ? 'positive' : 'negative'}">
                    ${data.expected_change_pct ? (data.expected_change_pct >= 0 ? '+' : '') + data.expected_change_pct.toFixed(2) + '%' : 'N/A'}
                </div>
            </div>
            ${data.metrics ? `
            <div class="metric-card">
                <h3>RMSE</h3>
                <div class="value">${data.metrics.rmse ? data.metrics.rmse.toFixed(2) : 'N/A'}</div>
            </div>
            ` : ''}
        </div>

        <canvas id="lstmChart"></canvas>
    `;

    content.innerHTML = html;
    document.getElementById('lstmSection').style.display = 'block';

    if (data.forecast && data.forecast.length > 0) {
        drawLstmChart(data);
    }
}

function drawLstmChart(data) {
    const canvas = document.getElementById('lstmChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    const forecast = data.forecast || [];
    const currentPrice = data.current_price || 0;
    const allPrices = [currentPrice, ...forecast];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const range = maxPrice - minPrice || 1;
    const padding = range * 0.1;

    const chartWidth = width - 80;
    const chartHeight = height - 60;
    const stepX = chartWidth / (allPrices.length - 1);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = 30 + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.beginPath();

    allPrices.forEach((price, index) => {
        const x = 60 + index * stepX;
        const y = height - 30 - ((price - minPrice + padding) / (range + padding * 2)) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#0066cc';
    allPrices.forEach((price, index) => {
        const x = 60 + index * stepX;
        const y = height - 30 - ((price - minPrice + padding) / (range + padding * 2)) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('Current', 60, height - 10);
    ctx.fillText('30 days', width - 80, height - 10);
}

function displayFinbertResults(data) {
    const content = document.getElementById('finbertContent');
    if (!content) return;

    if (data.error) {
        content.innerHTML = `<div class="error-message"><strong>Error:</strong> ${data.error}</div>`;
        return;
    }

    const results = data.results || [];
    if (results.length === 0) {
        content.innerHTML = '<p>No sentiment data available</p>';
        return;
    }

    // Sort by sentiment score (most positive first)
    const sortedResults = [...results].sort((a, b) => b.avg_sentiment - a.avg_sentiment);

    const html = `
        <div style="margin-bottom: 20px;">
            <p><strong>Analysis Type:</strong> ${data.analysis_type || 'TextBlob'}</p>
            <p><strong>Total Symbols Analyzed:</strong> ${data.total_symbols || results.length}</p>
        </div>
        <div class="sentiment-grid">
            ${sortedResults.map(result => `
                <div class="sentiment-card">
                    <h3>${result.symbol}</h3>
                    <p><strong>Sentiment Score:</strong> <span class="${result.avg_sentiment >= 0.1 ? 'positive' : result.avg_sentiment <= -0.1 ? 'negative' : ''}">${result.avg_sentiment.toFixed(3)}</span></p>
                    <span class="sentiment-badge ${result.sentiment_label.toLowerCase()}">
                        ${result.sentiment_label}
                    </span>
                    <p style="margin-top: 10px; font-size: 12px; color: #666;">
                        Headlines analyzed: ${result.headline_count}
                    </p>
                    ${result.headlines && result.headlines.length > 0 ? `
                        <details style="margin-top: 10px;">
                            <summary style="font-size: 11px; color: #666; cursor: pointer;">Sample Headlines</summary>
                            <ul style="font-size: 11px; margin-top: 5px; padding-left: 20px;">
                                ${result.headlines.slice(0, 3).map(h => `<li>${h}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;

    content.innerHTML = html;
    document.getElementById('finbertSection').style.display = 'block';
}

function displayAllFinbertResults(data) {
    const content = document.getElementById('allFinbertContent');
    if (!content) return;

    if (data.error) {
        content.innerHTML = `<div class="error-message"><strong>Error:</strong> ${data.error}</div>`;
        return;
    }

    const results = data.results || [];
    if (results.length === 0) {
        content.innerHTML = '<p>No sentiment data available</p>';
        return;
    }

    // Sort by sentiment score
    const sortedResults = [...results].sort((a, b) => b.avg_sentiment - a.avg_sentiment);

    // Create summary statistics
    const positiveCount = sortedResults.filter(r => r.sentiment_label === 'POSITIVE').length;
    const negativeCount = sortedResults.filter(r => r.sentiment_label === 'NEGATIVE').length;
    const neutralCount = sortedResults.filter(r => r.sentiment_label === 'NEUTRAL').length;
    const avgSentiment = sortedResults.reduce((sum, r) => sum + r.avg_sentiment, 0) / sortedResults.length;

    const html = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
            <h3 style="margin-top: 0;">Summary Statistics</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 10px;">
                <div>
                    <strong>Total Symbols:</strong> ${data.total_symbols || results.length}
                </div>
                <div>
                    <strong>Positive:</strong> <span class="positive">${positiveCount}</span>
                </div>
                <div>
                    <strong>Negative:</strong> <span class="negative">${negativeCount}</span>
                </div>
                <div>
                    <strong>Neutral:</strong> ${neutralCount}
                </div>
                <div>
                    <strong>Avg Sentiment:</strong> ${avgSentiment.toFixed(3)}
                </div>
            </div>
        </div>
        <p><strong>Analysis Type:</strong> ${data.analysis_type || 'TextBlob'}</p>
        <div class="sentiment-grid">
            ${sortedResults.map(result => `
                <div class="sentiment-card">
                    <h3>${result.symbol}</h3>
                    <p><strong>Sentiment Score:</strong> <span class="${result.avg_sentiment >= 0.1 ? 'positive' : result.avg_sentiment <= -0.1 ? 'negative' : ''}">${result.avg_sentiment.toFixed(3)}</span></p>
                    <span class="sentiment-badge ${result.sentiment_label.toLowerCase()}">
                        ${result.sentiment_label}
                    </span>
                    <p style="margin-top: 10px; font-size: 12px; color: #666;">
                        Headlines analyzed: ${result.headline_count}
                    </p>
                    ${result.headlines && result.headlines.length > 0 ? `
                        <details style="margin-top: 10px;">
                            <summary style="font-size: 11px; color: #666; cursor: pointer;">Sample Headlines</summary>
                            <ul style="font-size: 11px; margin-top: 5px; padding-left: 20px; max-height: 150px; overflow-y: auto;">
                                ${result.headlines.map(h => `<li style="margin-bottom: 5px;">${h}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;

    content.innerHTML = html;
}

function displaySummary(data) {
    const content = document.getElementById('summaryContent');
    if (!content) return;

    const analyses = data.analyses || {};
    let recommendation = 'HOLD';
    let confidence = 'Medium';

    // Determine recommendation based on analyses
    if (analyses.lstm && !analyses.lstm.error && analyses.lstm.expected_change_pct) {
        if (analyses.lstm.expected_change_pct > 5) {
            recommendation = 'BUY';
            confidence = 'High';
        } else if (analyses.lstm.expected_change_pct < -5) {
            recommendation = 'SELL';
            confidence = 'High';
        }
    }

    if (analyses.finbert && !analyses.finbert.error) {
        if (analyses.finbert.sentiment_label === 'POSITIVE' && recommendation === 'BUY') {
            confidence = 'Very High';
        } else if (analyses.finbert.sentiment_label === 'NEGATIVE' && recommendation === 'SELL') {
            confidence = 'Very High';
        }
    }

    const html = `
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Overall Recommendation</h3>
                <div class="recommendation ${recommendation.toLowerCase()}">${recommendation}</div>
                <p>Confidence: <strong>${confidence}</strong></p>
            </div>
            <div class="summary-card">
                <h3>Analysis Status</h3>
                <p>GARCH: ${analyses.garch && !analyses.garch.error ? '✓ Complete' : '✗ Failed'}</p>
                <p>LSTM: ${analyses.lstm && !analyses.lstm.error ? '✓ Complete' : '✗ Failed'}</p>
                <p>FinBERT: ${analyses.finbert && !analyses.finbert.error ? '✓ Complete' : '✗ Failed'}</p>
            </div>
            <div class="summary-card">
                <h3>Key Insights</h3>
                ${analyses.lstm && !analyses.lstm.error ? `
                    <p>Price Forecast: ${analyses.lstm.expected_change_pct >= 0 ? '+' : ''}${analyses.lstm.expected_change_pct?.toFixed(2) || 'N/A'}%</p>
                ` : ''}
                ${analyses.garch && !analyses.garch.error ? `
                    <p>Volatility: ${(analyses.garch.current_volatility * 100).toFixed(2)}%</p>
                ` : ''}
                ${analyses.finbert && !analyses.finbert.error ? `
                    <p>Sentiment: ${analyses.finbert.sentiment_label}</p>
                ` : ''}
            </div>
        </div>
    `;

    content.innerHTML = html;
    document.getElementById('summarySection').style.display = 'block';
}

function showLoading() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) indicator.style.display = 'block';
}

function hideLoading() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) indicator.style.display = 'none';
}

function showResults() {
    const container = document.getElementById('resultsContainer');
    if (container) container.style.display = 'block';
}

function hideResults() {
    const container = document.getElementById('resultsContainer');
    if (container) container.style.display = 'none';
}

function showError(message) {
    const container = document.getElementById('resultsContainer');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `<div class="error-message"><strong>Error:</strong> ${message}</div>`;
    }
    hideLoading();
}


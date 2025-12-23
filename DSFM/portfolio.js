// Market Indices Updates with Live Data
async function updateMarketIndices() {
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        const niftyData = await window.API.getNifty();
        const niftyElement = document.getElementById('nifty');
        
        if (niftyElement) {
            const isPositive = niftyData.change_pct >= 0;
            niftyElement.textContent = niftyData.nifty_value.toFixed(2);
            niftyElement.className = `index-value ${isPositive ? 'positive' : 'negative'}`;
            
            const changeElement = niftyElement.nextElementSibling;
            if (changeElement) {
                changeElement.innerHTML = `${isPositive ? '+' : ''}${niftyData.change_pct.toFixed(2)}% <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>`;
                changeElement.className = `index-change ${isPositive ? 'positive' : 'negative'}`;
            }
        }
        
        // Update NIFTY in sidebar
        const niftySidebar = document.querySelector('.nifty-value');
        if (niftySidebar) {
            const isPositive = niftyData.change_pct >= 0;
            niftySidebar.innerHTML = `${niftyData.nifty_value.toFixed(2)} ${isPositive ? '+' : ''}${niftyData.change_pct.toFixed(2)}% <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>`;
            niftySidebar.className = `nifty-value ${isPositive ? 'positive' : 'negative'}`;
        }
    } catch (error) {
        console.error('Failed to update market indices:', error);
    }
}

// Portfolio Performance Chart
const performanceChart = document.getElementById('performanceChart');
let chartCtx = null;
let chartData = [];

async function initPerformanceChart() {
    if (!performanceChart) return;
    
    chartCtx = performanceChart.getContext('2d');
    resizeChart();
    
    // Load NIFTY history for chart
    if (typeof window.API !== 'undefined') {
        try {
            const historyData = await window.API.getNiftyHistory();
            chartData = historyData.map(item => ({
                date: new Date(item.Date),
                value: item.NIFTY
            }));
        } catch (error) {
            console.error('Failed to load chart data:', error);
            generateChartData(); // Fallback to generated data
        }
    } else {
        generateChartData();
    }
    
    drawChart();
}

function resizeChart() {
    if (!performanceChart) return;
    const container = performanceChart.parentElement;
    performanceChart.width = container.clientWidth;
    performanceChart.height = container.clientHeight;
}

function generateChartData() {
    const days = 30;
    const baseValue = 100000;
    chartData = [];
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        const value = baseValue + (Math.random() - 0.5) * 5000 + (i * 100);
        chartData.push({ date, value });
    }
}

function drawChart() {
    if (!chartCtx || chartData.length === 0) return;
    
    const width = performanceChart.width;
    const height = performanceChart.height;
    
    chartCtx.clearRect(0, 0, width, height);
    
    // Background
    chartCtx.fillStyle = '#ffffff';
    chartCtx.fillRect(0, 0, width, height);
    
    // Calculate ranges
    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    
    const chartHeight = height - 40;
    const chartWidth = width - 60;
    
    // Draw grid lines
    chartCtx.strokeStyle = '#e0e0e0';
    chartCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = (chartHeight / 5) * i + 20;
        chartCtx.beginPath();
        chartCtx.moveTo(50, y);
        chartCtx.lineTo(width - 10, y);
        chartCtx.stroke();
    }
    
    // Draw line
    chartCtx.strokeStyle = '#0066cc';
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    
    chartData.forEach((point, index) => {
        const x = 50 + (index / (chartData.length - 1)) * chartWidth;
        const y = height - 20 - ((point.value - minValue + padding) / (range + padding * 2)) * chartHeight;
        
        if (index === 0) {
            chartCtx.moveTo(x, y);
        } else {
            chartCtx.lineTo(x, y);
        }
    });
    
    chartCtx.stroke();
    
    // Draw area under line
    chartCtx.fillStyle = 'rgba(0, 102, 204, 0.1)';
    chartCtx.beginPath();
    chartCtx.moveTo(50, height - 20);
    
    chartData.forEach((point, index) => {
        const x = 50 + (index / (chartData.length - 1)) * chartWidth;
        const y = height - 20 - ((point.value - minValue + padding) / (range + padding * 2)) * chartHeight;
        chartCtx.lineTo(x, y);
    });
    
    chartCtx.lineTo(width - 10, height - 20);
    chartCtx.closePath();
    chartCtx.fill();
}

// Index Select Change
document.getElementById('indexSelect')?.addEventListener('change', (e) => {
    const selectedIndex = e.target.value;
    generateChartData();
    drawChart();
    console.log('Index changed to:', selectedIndex);
});

// Secondary Navigation Tabs
document.querySelectorAll('.secondary-nav .nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.secondary-nav .nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabType = tab.dataset.tab;
        console.log('Switched to tab:', tabType);
        // In real implementation, this would load different data
    });
});

// Update Portfolio Table with Live Data
async function updatePortfolioTable() {
    const tableBody = document.getElementById('portfolioTableBody');
    if (!tableBody) return;
    
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        const portfolioData = await window.API.getPortfolio();
        tableBody.innerHTML = '';
        
        portfolioData.holdings.forEach(holding => {
            const row = document.createElement('tr');
            const isPositive = holding.profit_loss >= 0;
            row.innerHTML = `
                <td>${holding.symbol}</td>
                <td>₹${holding.current_value.toFixed(2)}</td>
                <td class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}₹${holding.profit_loss.toFixed(2)} (${isPositive ? '+' : ''}${holding.profit_loss_pct.toFixed(2)}%)</td>
                <td class="${holding.today_pl >= 0 ? 'positive' : 'negative'}">${holding.today_pl >= 0 ? '+' : ''}₹${holding.today_pl.toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update totals if elements exist
        const totalInvested = document.querySelector('[data-total="invested"]');
        const totalValue = document.querySelector('[data-total="value"]');
        const totalPL = document.querySelector('[data-total="pl"]');
        
        if (totalInvested) totalInvested.textContent = `₹${portfolioData.totals.total_invested.toFixed(2)}`;
        if (totalValue) totalValue.textContent = `₹${portfolioData.totals.total_current_value.toFixed(2)}`;
        if (totalPL) {
            const isPositive = portfolioData.totals.total_profit_loss >= 0;
            totalPL.textContent = `${isPositive ? '+' : ''}₹${portfolioData.totals.total_profit_loss.toFixed(2)}`;
            totalPL.className = isPositive ? 'positive' : 'negative';
        }
    } catch (error) {
        console.error('Failed to update portfolio table:', error);
    }
}

// Update Gainers and Losers
async function updateGainersLosers() {
    const gainersBody = document.getElementById('gainersBody');
    const losersBody = document.getElementById('losersBody');
    
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        const data = await window.API.getMarketMovers();
        
        if (gainersBody && data.gainers.length > 0) {
            gainersBody.innerHTML = '';
            data.gainers.slice(0, 10).forEach(gainer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${gainer.symbol}</td>
                    <td>₹${gainer.ltp.toFixed(2)}</td>
                    <td class="positive">+${gainer.pct_change.toFixed(2)}</td>
                    <td class="positive">+${gainer.pct_change.toFixed(2)}%</td>
                `;
                gainersBody.appendChild(row);
            });
        }
        
        if (losersBody && data.losers.length > 0) {
            losersBody.innerHTML = '';
            data.losers.slice(0, 10).forEach(loser => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${loser.symbol}</td>
                    <td>₹${loser.ltp.toFixed(2)}</td>
                    <td class="negative">${loser.pct_change.toFixed(2)}</td>
                    <td class="negative">${loser.pct_change.toFixed(2)}%</td>
                `;
                losersBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Failed to update gainers/losers:', error);
    }
}

// Action Buttons
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.textContent.trim();
        if (action === 'Booked P&L') {
            alert('Opening Booked P&L report...');
        } else if (action === 'Transaction') {
            alert('Opening Transaction history...');
        }
    });
});

// Header Navigation Links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        console.log('Navigated to:', link.textContent.trim());
    });
});

// Initialize
window.addEventListener('resize', () => {
    resizeChart();
    drawChart();
});

// Initialize
if (typeof window.API !== 'undefined') {
    initPerformanceChart();
    updateGainersLosers();
    updatePortfolioTable();
    updateMarketIndices();
    
    // Update market indices every 10 seconds
    setInterval(updateMarketIndices, 10000);
    
    // Update portfolio table every 30 seconds
    setInterval(updatePortfolioTable, 30000);
    
    // Update chart data every 60 seconds
    setInterval(async () => {
        if (typeof window.API !== 'undefined') {
            try {
                const historyData = await window.API.getNiftyHistory();
                chartData = historyData.map(item => ({
                    date: new Date(item.Date),
                    value: item.NIFTY
                }));
                drawChart();
            } catch (error) {
                console.error('Failed to refresh chart data:', error);
            }
        }
    }, 60000);
} else {
    // Wait for API to load
    window.addEventListener('load', () => {
        if (typeof window.API !== 'undefined') {
            initPerformanceChart();
            updateGainersLosers();
            updatePortfolioTable();
            updateMarketIndices();
            setInterval(updateMarketIndices, 10000);
            setInterval(updatePortfolioTable, 30000);
        }
    });
}

// Console message
console.log('%c5paisa Capital Portfolio', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cPortfolio page initialized successfully with live updates', 'color: #666; font-size: 14px;');

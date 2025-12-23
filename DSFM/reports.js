// Market Indices Updates with Live Data
const marketData = {
    nifty: { base: 25910.05, current: 25910.05 },
    sensex: { base: 84562.78, current: 84562.78 },
    banknifty: { base: 58517.55, current: 58517.55 },
    finnifty: { base: 27491.85, current: 27491.85 }
};

// Portfolio Performance Chart
const performanceChart = document.getElementById('performanceChart');
let chartCtx = null;
let chartData = [];

function initPerformanceChart() {
    if (!performanceChart) return;
    
    chartCtx = performanceChart.getContext('2d');
    resizeChart();
    generateChartData();
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
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabType = tab.dataset.tab;
        console.log('Switched to tab:', tabType);
        // In real implementation, this would load different data
    });
});

// Update Portfolio Table with Live Data
function updatePortfolioTable() {
    const tableBody = document.getElementById('portfolioTableBody');
    if (!tableBody) return;
    
    // Simulate live updates
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            const currentValue = parseFloat(cells[1].textContent) || 0;
            if (currentValue > 0) {
                const change = (Math.random() - 0.5) * 10;
                const newValue = Math.max(0, currentValue + change);
                cells[1].textContent = newValue.toFixed(2);
                
                const pnl = ((newValue - currentValue) / currentValue) * 100;
                if (cells[2] && cells[3]) {
                    cells[2].textContent = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%)`;
                    cells[3].textContent = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%)`;
                }
            }
        }
    });
}

// Update Gainers and Losers
function updateGainersLosers() {
    const gainersBody = document.getElementById('gainersBody');
    const losersBody = document.getElementById('losersBody');
    
    // Sample data for gainers and losers
    const gainers = [
        { asset: 'RELIANCE', cmp: 2456.75, change: 12.50, changePercent: 0.51 },
        { asset: 'INFY', cmp: 1456.20, change: 18.90, changePercent: 1.31 },
        { asset: 'SBIN', cmp: 678.90, change: 4.50, changePercent: 0.67 }
    ];
    
    const losers = [
        { asset: 'TCS', cmp: 3234.90, change: -8.20, changePercent: -0.25 },
        { asset: 'HDFC BANK', cmp: 1587.30, change: -5.30, changePercent: -0.28 }
    ];
    
    if (gainersBody && gainers.length > 0) {
        gainersBody.innerHTML = '';
        gainers.forEach(gainer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${gainer.asset}</td>
                <td>₹${gainer.cmp.toFixed(2)}</td>
                <td class="positive">+${gainer.change.toFixed(2)}</td>
                <td class="positive">+${gainer.changePercent.toFixed(2)}%</td>
            `;
            gainersBody.appendChild(row);
        });
    }
    
    if (losersBody && losers.length > 0) {
        losersBody.innerHTML = '';
        losers.forEach(loser => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${loser.asset}</td>
                <td>₹${loser.cmp.toFixed(2)}</td>
                <td class="negative">${loser.change.toFixed(2)}</td>
                <td class="negative">${loser.changePercent.toFixed(2)}%</td>
            `;
            losersBody.appendChild(row);
        });
    }
}

// Navigation Dropdowns
document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    dropdown.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Dropdown clicked:', dropdown.querySelector('a').textContent);
    });
});

// File Taxes Button
document.querySelector('.file-taxes-btn')?.addEventListener('click', () => {
    alert('Opening tax filing portal...');
});

// Initialize
window.addEventListener('resize', () => {
    resizeChart();
    drawChart();
});

// Initialize chart
initPerformanceChart();

// Update gainers and losers
updateGainersLosers();

// Update chart data every 10 seconds
setInterval(() => {
    generateChartData();
    drawChart();
}, 10000);

// Update portfolio table every 5 seconds
setInterval(updatePortfolioTable, 5000);

// Console message
console.log('%c5paisa Reports', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cReports page initialized successfully', 'color: #666; font-size: 14px;');


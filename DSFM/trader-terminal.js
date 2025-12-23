// Market Indices Updates
function updateMarketIndices() {
    const indices = [
        { id: 'nifty', base: 25879.15 },
        { id: 'sensex', base: 84478.67 },
        { id: 'banknifty', base: 58381.95 },
        { id: 'finnifty', base: 27396.15 }
    ];
    
    indices.forEach(index => {
        const element = document.getElementById(index.id);
        if (element) {
            const change = (Math.random() - 0.5) * 10;
            const newValue = index.base + change;
            const percentChange = ((change / index.base) * 100).toFixed(2);
            const isPositive = change >= 0;
            
            element.textContent = newValue.toFixed(2);
            element.className = `index-value ${isPositive ? 'positive' : 'negative'}`;
            
            const changeElement = element.nextElementSibling;
            if (changeElement) {
                changeElement.innerHTML = `${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${percentChange}%) <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>`;
                changeElement.className = `index-change ${isPositive ? 'positive' : 'negative'}`;
            }
        }
    });
}

// Watchlist Tabs
document.querySelectorAll('.watchlist-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.watchlist-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabType = tab.dataset.tab;
        loadWatchlist(tabType);
    });
});

// Load Watchlist Data
function loadWatchlist(type) {
    const tableBody = document.getElementById('stocksTableBody');
    const noStocks = document.getElementById('noStocksMessage');
    
    if (type === 'mystocks') {
        // Show "No Stocks Found" message
        if (tableBody) tableBody.innerHTML = '';
        if (noStocks) noStocks.classList.add('show');
    } else {
        // Load stocks for other watchlists
        if (noStocks) noStocks.classList.remove('show');
        const stocks = getWatchlistData(type);
        renderStocksTable(stocks);
        
        // Select first stock for chart if available
        if (stocks.length > 0) {
            selectStock(stocks[0].name, stocks[0].price);
        }
    }
}

// Get Watchlist Data
function getWatchlistData(type) {
    const watchlists = {
        nifty50: [
            { name: 'RELIANCE', change: 12.50, changePercent: 0.51, price: 2456.75 },
            { name: 'TCS', change: -8.20, changePercent: -0.25, price: 3234.90 },
            { name: 'HDFC BANK', change: 5.30, changePercent: 0.32, price: 1678.45 },
            { name: 'INFY', change: 18.90, changePercent: 1.31, price: 1456.20 },
            { name: 'ICICI BANK', change: -3.40, changePercent: -0.36, price: 945.60 }
        ],
        watchlist1: [
            { name: 'BHARTIARTL', change: 15.20, changePercent: 1.37, price: 1123.40 },
            { name: 'SBIN', change: 4.50, changePercent: 0.67, price: 678.90 },
            { name: 'WIPRO', change: 3.20, changePercent: 0.71, price: 456.78 }
        ],
        watchlist2: [
            { name: 'ONGC', change: -2.10, changePercent: -0.89, price: 234.56 },
            { name: 'ITC', change: 8.50, changePercent: 0.45, price: 456.78 }
        ],
        watchlist3: []
    };
    
    return watchlists[type] || [];
}

// Render Stocks Table
function renderStocksTable(stocks) {
    const tableBody = document.getElementById('stocksTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    stocks.forEach(stock => {
        const row = document.createElement('tr');
        const isPositive = stock.change >= 0;
        row.innerHTML = `
            <td>${stock.name}</td>
            <td class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)</td>
            <td>${stock.price.toFixed(2)}</td>
        `;
        
        row.addEventListener('click', () => {
            selectStock(stock.name, stock.price);
        });
        
        tableBody.appendChild(row);
    });
}

// Select Stock
function selectStock(symbol, price) {
    document.querySelector('.chart-symbol').textContent = symbol;
    document.querySelector('.chart-price').textContent = price.toFixed(2);
    updateChart();
}

// Candlestick Chart
const chartCanvas = document.getElementById('candlestickChart');
const chartCtx = chartCanvas.getContext('2d');
let chartData = [];

function initChart() {
    resizeChart();
    generateCandlestickData();
    drawChart();
}

function resizeChart() {
    const container = chartCanvas.parentElement;
    chartCanvas.width = container.clientWidth;
    chartCanvas.height = container.clientHeight;
}

window.addEventListener('resize', () => {
    resizeChart();
    drawChart();
});

function generateCandlestickData() {
    const basePrice = 25879.15;
    const now = Date.now();
    chartData = [];
    
    for (let i = 50; i >= 0; i--) {
        const time = now - (i * 60000); // 1 minute intervals
        const open = basePrice + (Math.random() - 0.5) * 50;
        const high = open + Math.random() * 30;
        const low = open - Math.random() * 30;
        const close = open + (Math.random() - 0.5) * 20;
        
        chartData.push({ time, open, high, low, close });
    }
}

function drawChart() {
    const width = chartCanvas.width;
    const height = chartCanvas.height;
    
    chartCtx.clearRect(0, 0, width, height);
    
    // Background
    chartCtx.fillStyle = '#ffffff';
    chartCtx.fillRect(0, 0, width, height);
    
    if (chartData.length === 0) return;
    
    // Calculate price range
    const allPrices = chartData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;
    
    const chartHeight = height - 40;
    const chartWidth = width - 60;
    const candleWidth = chartWidth / chartData.length * 0.7;
    const candleSpacing = chartWidth / chartData.length;
    
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
    
    // Draw candlesticks
    chartData.forEach((candle, index) => {
        const x = 50 + index * candleSpacing + candleSpacing / 2;
        const openY = height - 20 - ((candle.open - minPrice + padding) / (priceRange + padding * 2)) * chartHeight;
        const closeY = height - 20 - ((candle.close - minPrice + padding) / (priceRange + padding * 2)) * chartHeight;
        const highY = height - 20 - ((candle.high - minPrice + padding) / (priceRange + padding * 2)) * chartHeight;
        const lowY = height - 20 - ((candle.low - minPrice + padding) / (priceRange + padding * 2)) * chartHeight;
        
        const isGreen = candle.close >= candle.open;
        
        // Draw wick
        chartCtx.strokeStyle = isGreen ? '#00cc66' : '#ff3333';
        chartCtx.lineWidth = 1;
        chartCtx.beginPath();
        chartCtx.moveTo(x, highY);
        chartCtx.lineTo(x, lowY);
        chartCtx.stroke();
        
        // Draw body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.abs(closeY - openY) || 2;
        
        chartCtx.fillStyle = isGreen ? '#00cc66' : '#ff3333';
        chartCtx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        
        // Draw border
        chartCtx.strokeStyle = isGreen ? '#00b359' : '#e62e2e';
        chartCtx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
    
    // Draw current price line
    const currentPrice = chartData[chartData.length - 1].close;
    const currentY = height - 20 - ((currentPrice - minPrice + padding) / (priceRange + padding * 2)) * chartHeight;
    chartCtx.strokeStyle = '#0066cc';
    chartCtx.lineWidth = 1;
    chartCtx.setLineDash([5, 5]);
    chartCtx.beginPath();
    chartCtx.moveTo(50, currentY);
    chartCtx.lineTo(width - 10, currentY);
    chartCtx.stroke();
    chartCtx.setLineDash([]);
    
    // Update candle info
    const lastCandle = chartData[chartData.length - 1];
    const change = lastCandle.close - lastCandle.open;
    const changePercent = ((change / lastCandle.open) * 100).toFixed(2);
    const isPositive = change >= 0;
    
    const candleInfo = document.querySelector('.candle-info');
    if (candleInfo) {
        candleInfo.innerHTML = `
            <span>O: <strong>${lastCandle.open.toFixed(2)}</strong></span>
            <span>H: <strong>${lastCandle.high.toFixed(2)}</strong></span>
            <span>L: <strong>${lastCandle.low.toFixed(2)}</strong></span>
            <span>C: <strong>${lastCandle.close.toFixed(2)}</strong></span>
            <span class="${isPositive ? 'positive' : 'negative'}">Change ${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${changePercent}%)</span>
        `;
    }
}

function updateChart() {
    // Add new candle
    const lastCandle = chartData[chartData.length - 1];
    const newOpen = lastCandle.close;
    const newHigh = newOpen + Math.random() * 20;
    const newLow = newOpen - Math.random() * 20;
    const newClose = newOpen + (Math.random() - 0.5) * 15;
    
    chartData.push({
        time: Date.now(),
        open: newOpen,
        high: newHigh,
        low: newLow,
        close: newClose
    });
    
    if (chartData.length > 50) {
        chartData.shift();
    }
    
    drawChart();
}

// Timeframe Buttons
document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // In real implementation, this would load different timeframe data
        generateCandlestickData();
        drawChart();
    });
});

// Chart Toolbar Buttons
document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.textContent.trim() === '1m' || btn.textContent.trim() === 'Save') {
            document.querySelectorAll('.toolbar-btn').forEach(b => {
                if (b.textContent.trim() === '1m') b.classList.remove('active');
            });
            if (btn.textContent.trim() === '1m') {
                btn.classList.add('active');
            } else if (btn.textContent.trim() === 'Save') {
                alert('Chart layout saved!');
            }
        } else {
            // Handle other toolbar buttons
            const icon = btn.querySelector('i');
            if (icon) {
                const toolName = icon.className;
                if (toolName.includes('fa-chart-bar')) {
                    alert('Chart type selector');
                } else if (toolName.includes('fa-chart-line')) {
                    alert('Indicators panel');
                } else if (toolName.includes('fa-th')) {
                    alert('Layout options');
                } else if (toolName.includes('fa-trash')) {
                    alert('Delete chart');
                }
            }
        }
    });
});

// Chart Tools
document.querySelectorAll('.chart-tool').forEach(tool => {
    tool.addEventListener('click', () => {
        // Remove active class from all tools
        document.querySelectorAll('.chart-tool').forEach(t => t.classList.remove('active'));
        // Add active class to clicked tool
        tool.classList.add('active');
        
        const icon = tool.querySelector('i');
        if (icon) {
            const toolName = icon.className;
            if (toolName.includes('fa-crosshairs')) {
                console.log('Crosshair tool activated');
            } else if (toolName.includes('fa-chart-line')) {
                console.log('Trend line tool activated');
            } else if (toolName.includes('fa-wave-square')) {
                console.log('Fibonacci tool activated');
            } else if (toolName.includes('fa-font')) {
                console.log('Text tool activated');
            } else if (toolName.includes('fa-ruler')) {
                console.log('Ruler tool activated');
            } else if (toolName.includes('fa-search-plus')) {
                console.log('Zoom tool activated');
            }
        }
    });
});

// Search Functionality
const watchlistSearchInput = document.getElementById('watchlistSearch');
if (watchlistSearchInput) {
    watchlistSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toUpperCase();
        const tableBody = document.getElementById('stocksTableBody');
        const rows = tableBody?.querySelectorAll('tr');
        
        if (rows) {
            rows.forEach(row => {
                const stockName = row.querySelector('td')?.textContent || '';
                if (stockName.toUpperCase().includes(query) || query === '') {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
        
        // If search matches, select stock for chart
        if (query.length >= 2) {
            const matchingStock = getWatchlistData('nifty50').find(stock => 
                stock.name.toUpperCase().includes(query)
            );
            
            if (matchingStock) {
                selectStock(matchingStock.name, matchingStock.price);
            }
        }
    });
}

// Update timestamp
function updateTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds} UTC+5:30`;
    
    const timestampEl = document.querySelector('.chart-timestamp span');
    if (timestampEl) {
        timestampEl.textContent = timestamp;
    }
}

// Update Stock Prices in Table
function updateStockPricesInTable() {
    const tableBody = document.getElementById('stocksTableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            const stockName = cells[0].textContent.trim();
            const basePrice = parseFloat(cells[2].textContent.replace(/[₹,]/g, '')) || 0;
            
            if (basePrice > 0) {
                const change = (Math.random() - 0.5) * 10;
                const newPrice = basePrice + change;
                const percentChange = ((change / basePrice) * 100).toFixed(2);
                const isPositive = change >= 0;
                
                cells[2].textContent = `₹${newPrice.toFixed(2)}`;
                if (cells[1]) {
                    cells[1].textContent = `${isPositive ? '+' : ''}${change.toFixed(2)} (${isPositive ? '+' : ''}${percentChange}%)`;
                    cells[1].className = isPositive ? 'positive' : 'negative';
                }
            }
        }
    });
}

// Initialize
loadWatchlist('mystocks');
initChart();

// Update market indices every 2 seconds
setInterval(updateMarketIndices, 2000);

// Update stock prices in table every 3 seconds
setInterval(updateStockPricesInTable, 3000);

// Update chart every 5 seconds
setInterval(updateChart, 5000);

// Update timestamp every second
setInterval(updateTimestamp, 1000);
updateTimestamp();

// Console message
console.log('%c5paisa TraderTerminal', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cTrading terminal initialized successfully', 'color: #666; font-size: 14px;');


// Market Data with Live Updates (will be loaded from API)
const marketData = {
    nifty: { base: 0, current: 0 }
};

// Stock Data with Live Prices (will be loaded from API)
const stockData = {};

// Watchlist Data (will be loaded from API)
const watchlistData = {
    mystocks: [],
    nifty50: [],
    watchlist1: [],
    watchlist2: []
};

// Load stock data from API
async function loadStockData(symbol) {
    if (typeof window.API === 'undefined') return null;
    
    try {
        const data = await window.API.getStock(symbol);
        stockData[symbol] = {
            base: data.latest_value,
            current: data.latest_value,
            name: symbol,
            change: data.change,
            change_pct: data.change_pct
        };
        return stockData[symbol];
    } catch (error) {
        console.error(`Failed to load stock data for ${symbol}:`, error);
        return null;
    }
}

// Load market movers to populate watchlist
async function loadWatchlistData() {
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        const moversData = await window.API.getMarketMovers();
        
        // Populate mystocks from top gainers
        watchlistData.mystocks = moversData.gainers.slice(0, 10).map(stock => ({
            name: stock.symbol,
            change: `${stock.pct_change >= 0 ? '+' : ''}${stock.pct_change.toFixed(2)}%`,
            price: `₹${stock.ltp.toFixed(2)}`,
            direction: stock.pct_change >= 0 ? 'positive' : 'negative'
        }));
        
        // Populate nifty50 from top movers
        const allMovers = [...moversData.gainers, ...moversData.losers].slice(0, 10);
        watchlistData.nifty50 = allMovers.map(stock => ({
            name: stock.symbol,
            change: `${stock.pct_change >= 0 ? '+' : ''}${stock.pct_change.toFixed(2)}%`,
            price: `₹${stock.ltp.toFixed(2)}`,
            direction: stock.pct_change >= 0 ? 'positive' : 'negative'
        }));
        
        // Load stock data for all symbols
        const allSymbols = [...new Set([...watchlistData.mystocks, ...watchlistData.nifty50].map(s => s.name))];
        await Promise.all(allSymbols.map(symbol => loadStockData(symbol)));
        
        // Re-render watchlist
        const activeTab = document.querySelector('.watchlist-tab.active');
        if (activeTab) {
            renderWatchlist(activeTab.dataset.tab);
        }
    } catch (error) {
        console.error('Failed to load watchlist data:', error);
    }
}

const watchlistBody = document.getElementById('watchlistBody');
const emptyState = document.getElementById('emptyState');
const tabs = document.querySelectorAll('.watchlist-tab');
const timeframeButtons = document.querySelectorAll('.timeframe');
const searchInput = document.querySelector('.search-input input');
let currentSelectedStock = 'NIFTY';
let chartData = [];
let chartCtx = null;

// Update Market Indices
async function updateMarketIndices() {
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        const niftyData = await window.API.getNifty();
        marketData.nifty.base = niftyData.nifty_value;
        marketData.nifty.current = niftyData.nifty_value;
        
        const tickerItems = document.querySelectorAll('.ticker-item');
        if (tickerItems.length > 0) {
            const item = tickerItems[0];
            const nameEl = item.querySelector('.ticker-name');
            const changeEl = item.querySelector('.ticker-change');
            
            if (nameEl && changeEl) {
                const isPositive = niftyData.change_pct >= 0;
                nameEl.textContent = `NIFTY ${niftyData.nifty_value.toFixed(2)}`;
                changeEl.textContent = `${isPositive ? '+' : ''}${niftyData.change_pct.toFixed(2)}%`;
                changeEl.className = `ticker-change ${isPositive ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Failed to update market indices:', error);
    }
}

// Update Stock Prices
async function updateStockPrices() {
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    // Get all symbols from watchlist
    const allSymbols = [...new Set([
        ...watchlistData.mystocks.map(s => s.name),
        ...watchlistData.nifty50.map(s => s.name)
    ])];
    
    // Update stock data for all symbols
    await Promise.all(allSymbols.map(async (symbol) => {
        try {
            const data = await window.API.getStock(symbol);
            if (stockData[symbol]) {
                stockData[symbol].current = data.latest_value;
                stockData[symbol].change = data.change;
                stockData[symbol].change_pct = data.change_pct;
            } else {
                stockData[symbol] = {
                    base: data.latest_value,
                    current: data.latest_value,
                    name: symbol,
                    change: data.change,
                    change_pct: data.change_pct
                };
            }
        } catch (error) {
            console.error(`Failed to update stock price for ${symbol}:`, error);
        }
    }));
    
    // Re-render watchlist with updated prices
    const activeTab = document.querySelector('.watchlist-tab.active');
    if (activeTab) {
        renderWatchlist(activeTab.dataset.tab);
    }
}

// Render Watchlist
function renderWatchlist(key = 'mystocks', searchQuery = '') {
    let rows = watchlistData[key] || [];
    
    // Filter by search query
    if (searchQuery) {
        rows = rows.filter(row => 
            row.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    watchlistBody.innerHTML = '';

    if (!rows || rows.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        
        // Get live price from stockData
        const stockInfo = stockData[row.name] || stockData[row.name.split(' ')[0]];
        let price = row.price;
        let change = row.change;
        
        if (stockInfo) {
            const basePrice = stockInfo.base;
            const currentPrice = stockInfo.current;
            const priceChange = currentPrice - basePrice;
            const percentChange = ((priceChange / basePrice) * 100).toFixed(2);
            const isPositive = priceChange >= 0;
            
            price = `₹${currentPrice.toFixed(2)}`;
            change = `${isPositive ? '+' : ''}${priceChange.toFixed(2)} (${isPositive ? '+' : ''}${percentChange}%)`;
            row.direction = isPositive ? 'positive' : 'negative';
        }
        
        tr.innerHTML = `
            <td>${row.name}</td>
            <td class="${row.direction}">${change}</td>
            <td>${price}</td>
        `;
        
        // Add click handler to select stock for chart
        tr.addEventListener('click', () => {
            selectStockForChart(row.name);
        });
        
        watchlistBody.appendChild(tr);
    });
}

// Select Stock for Chart
async function selectStockForChart(symbol) {
    currentSelectedStock = symbol;
    updateChartHeader(symbol);
    await generateChartData(symbol);
    drawChart();
}

// Update Chart Header
function updateChartHeader(symbol) {
    const symbolName = document.querySelector('.symbol-name');
    const symbolPrice = document.querySelector('.symbol-price strong');
    const symbolChange = document.querySelector('.symbol-price span');
    
    if (symbolName) symbolName.textContent = symbol;
    
    const stockInfo = stockData[symbol] || stockData[symbol.split(' ')[0]];
    if (stockInfo && symbolPrice && symbolChange) {
        const basePrice = stockInfo.base;
        const currentPrice = stockInfo.current;
        const priceChange = currentPrice - basePrice;
        const percentChange = ((priceChange / basePrice) * 100).toFixed(2);
        const isPositive = priceChange >= 0;
        
        symbolPrice.textContent = currentPrice.toFixed(2);
        symbolChange.textContent = `${isPositive ? '+' : ''}${priceChange.toFixed(2)} (${isPositive ? '+' : ''}${percentChange}%)`;
        symbolChange.className = isPositive ? 'positive' : 'negative';
    }
}

// Chart Functionality
const chartPlaceholder = document.querySelector('.chart-placeholder');
const chartGraph = document.querySelector('.chart-graph');

function initChart() {
    if (!chartGraph) return;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'watchlistChart';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    chartGraph.innerHTML = '';
    chartGraph.appendChild(canvas);
    
    const chart = canvas;
    chartCtx = chart.getContext('2d');
    resizeChart();
    generateChartData(currentSelectedStock);
    drawChart();
}

function resizeChart() {
    if (!chartCtx) return;
    const canvas = document.getElementById('watchlistChart');
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

async function generateChartData(symbol) {
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        // Try to get decision data which includes history
        const decisionData = await window.API.getDecision(symbol);
        if (decisionData && decisionData.history) {
            // Use history data for chart
            chartData = decisionData.history.slice(-50).map((item, index) => {
                const date = new Date(item.date);
                const price = item.price;
                // Create OHLC from price (simplified)
                const variation = price * 0.01; // 1% variation
                return {
                    time: date.getTime(),
                    open: price + (Math.random() - 0.5) * variation,
                    high: price + Math.random() * variation,
                    low: price - Math.random() * variation,
                    close: price
                };
            });
        } else {
            // Fallback to generated data
            const stockInfo = stockData[symbol] || stockData[symbol?.split(' ')[0]];
            const basePrice = stockInfo?.current || 25910.05;
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
    } catch (error) {
        console.error(`Failed to generate chart data for ${symbol}:`, error);
        // Fallback to generated data
        const stockInfo = stockData[symbol] || stockData[symbol?.split(' ')[0]];
        const basePrice = stockInfo?.current || 25910.05;
        const now = Date.now();
        chartData = [];
        
        for (let i = 50; i >= 0; i--) {
            const time = now - (i * 60000);
            const open = basePrice + (Math.random() - 0.5) * 50;
            const high = open + Math.random() * 30;
            const low = open - Math.random() * 30;
            const close = open + (Math.random() - 0.5) * 20;
            chartData.push({ time, open, high, low, close });
        }
    }
}

function drawChart() {
    if (!chartCtx || chartData.length === 0) return;
    
    const canvas = document.getElementById('watchlistChart');
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
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
    
    // Update timestamp
    updateTimestamp();
}

function updateChart() {
    if (chartData.length === 0) return;
    
    const lastCandle = chartData[chartData.length - 1];
    const stockInfo = stockData[currentSelectedStock] || stockData[currentSelectedStock?.split(' ')[0]];
    const basePrice = stockInfo?.current || lastCandle.close;
    
    const newOpen = lastCandle.close;
    const newHigh = newOpen + Math.random() * 20;
    const newLow = newOpen - Math.random() * 20;
    const newClose = basePrice + (Math.random() - 0.5) * 15;
    
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
    updateChartHeader(currentSelectedStock);
}

function updateTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds} UTC+5:30`;
    
    const timestampEl = document.querySelector('.chart-time');
    if (timestampEl) {
        timestampEl.textContent = timestamp;
    }
}

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const searchQuery = searchInput?.value || '';
        renderWatchlist(tab.dataset.tab, searchQuery);
    });
});

// Timeframe Buttons
timeframeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        timeframeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        generateChartData(currentSelectedStock);
        drawChart();
    });
});

// Search Functionality
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        const activeTab = document.querySelector('.watchlist-tab.active');
        if (activeTab) {
            renderWatchlist(activeTab.dataset.tab, query);
            
            // If search matches a stock, update chart
            const matchingStock = Object.keys(stockData).find(symbol => 
                symbol.toLowerCase().includes(query.toLowerCase())
            );
            
            if (matchingStock && query.length >= 2) {
                selectStockForChart(matchingStock);
            }
        }
    });
}

// Initialize
if (typeof window.API !== 'undefined') {
    loadWatchlistData();
    updateMarketIndices();
    initChart();
    
    // Update market indices every 10 seconds
    setInterval(updateMarketIndices, 10000);
    
    // Update stock prices every 30 seconds
    setInterval(updateStockPrices, 30000);
    
    // Update chart every 60 seconds
    setInterval(async () => {
        if (currentSelectedStock) {
            await generateChartData(currentSelectedStock);
            drawChart();
        }
    }, 60000);
} else {
    // Wait for API to load
    window.addEventListener('load', () => {
        if (typeof window.API !== 'undefined') {
            loadWatchlistData();
            updateMarketIndices();
            initChart();
            setInterval(updateMarketIndices, 10000);
            setInterval(updateStockPrices, 30000);
        }
    });
}

// Update timestamp every second
setInterval(updateTimestamp, 1000);
updateTimestamp();

// Window resize handler
window.addEventListener('resize', () => {
    resizeChart();
    drawChart();
});

console.log('%c5paisa Watchlist', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cWatchlist initialized with live charts and search', 'color: #666; font-size: 14px;');

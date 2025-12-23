// Market Indices Updates
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

// Market Movers Tabs
document.querySelectorAll('.mover-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.mover-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabType = tab.dataset.tab;
        updateMarketMovers(tabType);
    });
});

// Update Market Movers
async function updateMarketMovers(type) {
    if (typeof window.API === 'undefined') {
        console.warn('API not loaded yet');
        return;
    }
    
    try {
        const data = await window.API.getMarketMovers();
        const stocks = type === 'gainers' ? data.gainers : data.losers;
        const stockPanels = document.querySelectorAll('.mover-stock');
        
        stockPanels.forEach((panel, index) => {
            if (index < stocks.length) {
                const stock = stocks[index];
                const isPositive = stock.pct_change >= 0;
                
                panel.innerHTML = `
                    <div class="stock-name">${index === 0 ? stock.symbol : (index === 1 ? '52 Week High' : 'Movers By Volume')}</div>
                    ${index > 0 ? `<div class="stock-name-small">${stock.symbol}</div>` : ''}
                    <div class="stock-volume">Vol N/A</div>
                    <div class="stock-price ${isPositive ? 'positive' : 'negative'}">${stock.ltp.toFixed(2)} <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i></div>
                    <div class="stock-change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${stock.pct_change.toFixed(2)}%</div>
                `;
            }
        });
    } catch (error) {
        console.error('Failed to update market movers:', error);
    }
}

// Navigation Arrows
document.querySelectorAll('.nav-arrow').forEach(arrow => {
    arrow.addEventListener('click', () => {
        // In real implementation, this would navigate through different stocks
        console.log('Navigate to next/previous stock');
    });
});

// Search Functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            if (query) {
                alert(`Searching for: ${query}`);
                // In real implementation, this would search for stocks
            }
        }
    });
}

// Add Funds Button
document.querySelector('.add-btn')?.addEventListener('click', () => {
    const amount = prompt('Enter amount to add:');
    if (amount) {
        alert(`Adding ₹${amount} to your account...`);
        // In real implementation, this would process the payment
    }
});

// Activate Buttons
document.querySelectorAll('.activate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const panel = btn.closest('.trading-panel');
        const title = panel.querySelector('h3').textContent;
        alert(`Activating ${title} trading...`);
        // In real implementation, this would activate the trading segment
    });
});

// Navigation Items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const navText = item.querySelector('span').textContent;
        console.log(`Navigating to: ${navText}`);
        // In real implementation, this would navigate to different pages
    });
});

// User Dropdown
document.querySelector('.user-dropdown')?.addEventListener('click', () => {
    // In real implementation, this would show a dropdown menu
    console.log('User dropdown clicked');
});

// Initialize
if (typeof window.API !== 'undefined') {
    updateMarketIndices();
    updateMarketMovers('gainers');
    
    // Update market indices every 10 seconds
    setInterval(updateMarketIndices, 10000);
} else {
    // Wait for API to load
    window.addEventListener('load', () => {
        if (typeof window.API !== 'undefined') {
            updateMarketIndices();
            updateMarketMovers('gainers');
            setInterval(updateMarketIndices, 10000);
        }
    });
}

// Console message
console.log('%c5paisa Capital Dashboard', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cDashboard initialized successfully', 'color: #666; font-size: 14px;');


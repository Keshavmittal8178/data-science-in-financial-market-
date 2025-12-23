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

// Popular Funds Data
const popularFunds = [
    {
        name: 'Aditya Birla SL Large Cap Fund - Direct (G)',
        category: 'Large Cap Fund',
        type: 'Equity',
        rating: 4,
        returns: 15.96,
        minSip: 100
    },
    {
        name: 'Mirae Asset Great Consumer Fund - Direct (G)',
        category: 'Sectoral/Thematic',
        type: 'Equity',
        rating: 4,
        returns: 18.79,
        minSip: 99
    },
    {
        name: 'ICICI Pru Passive Multi-Asset Fund of Funds-Dir (G)',
        category: 'FoFs Domestic',
        type: 'Other',
        rating: 3,
        returns: 15.92,
        minSip: 100
    },
    {
        name: 'Quant Small Cap Fund - Direct (G)',
        category: 'Small Cap Fund',
        type: 'Equity',
        rating: 4,
        returns: 24.79,
        minSip: 1000
    },
    {
        name: 'AXIS Balanced Advantage Fund - Direct (G)',
        category: 'Dynamic Asset Allocation or Balanced Advantage',
        type: 'Hybrid',
        rating: 3,
        returns: 15.52,
        minSip: 100
    },
    {
        name: 'Groww Nifty Total Market Index Fund-Direct (G)',
        category: 'Index Fund',
        type: 'Other',
        rating: 1,
        returns: 0.00,
        minSip: 500
    }
];

// Render Popular Funds List
function renderPopularFunds() {
    const popularFundsContainer = document.getElementById('popularFunds');
    if (!popularFundsContainer) return;
    
    popularFundsContainer.innerHTML = '';
    
    popularFunds.slice(0, 5).forEach(fund => {
        const item = document.createElement('div');
        item.className = 'fund-list-item';
        
        item.innerHTML = `
            <div class="fund-list-info">
                <div class="fund-list-name">${fund.name}</div>
                <div class="fund-list-category">${fund.category}</div>
            </div>
            <div class="fund-list-returns">${fund.returns.toFixed(2)}% 1Y Return</div>
            <div class="fund-list-nav">NAV ₹10.00</div>
        `;
        
        popularFundsContainer.appendChild(item);
    });
}

// Best Returns Data
const bestReturnsData = [
    { name: 'Quant Small Cap Fund', category: 'Small Cap', nav: 10.00, return1y: 24.79, return3y: 28.45, return5y: 32.12 },
    { name: 'Mirae Asset Great Consumer Fund', category: 'Sectoral', nav: 10.00, return1y: 18.79, return3y: 24.17, return5y: 26.89 },
    { name: 'Aditya Birla SL Large Cap Fund', category: 'Large Cap', nav: 10.00, return1y: 15.96, return3y: 18.23, return5y: 20.45 },
    { name: 'AXIS Balanced Advantage Fund', category: 'Hybrid', nav: 10.00, return1y: 15.52, return3y: 17.89, return5y: 19.23 }
];

// Render Best Returns Table
function renderBestReturns() {
    const returnsBody = document.getElementById('returnsBody');
    if (!returnsBody) return;
    
    returnsBody.innerHTML = '';
    
    bestReturnsData.forEach(fund => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="fund-name-cell">${fund.name}</div>
                <div class="fund-category-cell">${fund.category}</div>
            </td>
            <td class="return-value">${fund.return1y.toFixed(2)}%</td>
            <td class="return-value">${fund.return3y.toFixed(2)}%</td>
            <td class="return-value">${fund.return5y.toFixed(2)}%</td>
            <td>
                <button style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">Watch Now</button>
            </td>
        `;
        returnsBody.appendChild(row);
    });
}

// NFO Data
const nfoData = [
    { name: 'New Fund Offering 1', category: 'Equity', status: 'Opening Today' },
    { name: 'New Fund Offering 2', category: 'Hybrid', status: 'Closing Today' },
    { name: 'New Fund Offering 3', category: 'Debt', status: 'Opening Soon' }
];

// Render NFO List
function renderNFO() {
    const nfoList = document.getElementById('nfoList');
    if (!nfoList) return;
    
    nfoList.innerHTML = '';
    
    nfoData.forEach(nfo => {
        const item = document.createElement('div');
        item.className = 'nfo-item';
        item.innerHTML = `
            <div class="nfo-item-name">${nfo.name}</div>
            <div class="nfo-item-category">${nfo.category}</div>
            <span class="nfo-item-status">${nfo.status}</span>
        `;
        nfoList.appendChild(item);
    });
}

// Calculator Functionality
function updateCalculator() {
    const monthly = parseFloat(document.getElementById('monthlyInvestment')?.value) || 15000;
    const years = parseFloat(document.getElementById('investmentPeriod')?.value) || 25;
    const returnRate = parseFloat(document.getElementById('expectedReturn')?.value) || 12;
    
    const months = years * 12;
    const invested = monthly * months;
    const monthlyRate = returnRate / 12 / 100;
    
    let futureValue = 0;
    for (let i = 0; i < months; i++) {
        futureValue = (futureValue + monthly) * (1 + monthlyRate);
    }
    
    const wealthGained = futureValue - invested;
    
    // Update results
    const resultItems = document.querySelectorAll('.result-item');
    if (resultItems.length >= 3) {
        resultItems[0].querySelector('strong').textContent = `₹${(invested / 100000).toFixed(2)}L`;
        resultItems[1].querySelector('strong').textContent = `₹${(wealthGained / 100000).toFixed(2)}L`;
        resultItems[2].querySelector('strong').textContent = `₹${(futureValue / 100000).toFixed(2)}L`;
    }
    
    // Update chart
    const chartValue = document.querySelector('.chart-value');
    if (chartValue) {
        chartValue.textContent = `₹${(futureValue / 10000000).toFixed(2)}Cr`;
    }
}

// Section Tabs
document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const parent = tab.closest('.section-header');
        if (parent) {
            parent.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }
    });
});

// Navigation Tabs
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabName = tab.textContent.trim();
        console.log('Switched to:', tabName);
        // In real implementation, this would load different content
    });
});

// Search Functionality
document.getElementById('fundSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length >= 3) {
        const filtered = popularFunds.filter(fund => 
            fund.name.toLowerCase().includes(query) ||
            fund.category.toLowerCase().includes(query)
        );
        renderFilteredFunds(filtered);
    } else if (query.length === 0) {
        renderFundCards();
    }
});

function renderFilteredFunds(funds) {
    const fundsGrid = document.getElementById('fundsGrid');
    if (!fundsGrid) return;
    
    fundsGrid.innerHTML = '';
    
    if (funds.length === 0) {
        fundsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No funds found matching your search.</div>';
        return;
    }
    
    funds.forEach(fund => {
        const card = document.createElement('div');
        card.className = 'fund-card';
        
        const stars = '★'.repeat(fund.rating) + '☆'.repeat(5 - fund.rating);
        
        card.innerHTML = `
            <div class="fund-name">${fund.name}</div>
            <div class="fund-category">${fund.category}</div>
            <div class="fund-type">${fund.type}</div>
            <div class="fund-rating">
                <span class="stars">${stars}</span>
                <span class="rating-text">${fund.rating}★</span>
            </div>
            <div class="fund-returns">
                <span class="returns-label">3Y Returns</span>
                <span class="returns-value">${fund.returns.toFixed(2)}%</span>
            </div>
            <div class="fund-sip">
                <span class="sip-label">Min SIP</span>
                <span class="sip-value">₹${fund.minSip}</span>
            </div>
        `;
        
        fundsGrid.appendChild(card);
    });
}

// Carousel Dots
document.querySelectorAll('.dot').forEach((dot, index) => {
    dot.addEventListener('click', () => {
        document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        // In real implementation, this would change the promotional banner
        console.log('Switched to banner slide:', index + 1);
    });
});

// Collection Items
document.querySelectorAll('.collection-item').forEach(item => {
    item.addEventListener('click', () => {
        const label = item.querySelector('.collection-label').textContent;
        console.log('Clicked collection:', label);
        // In real implementation, this would filter/show relevant funds
    });
});

// Header Actions
document.querySelector('.switch-btn')?.addEventListener('click', () => {
    alert('Switching to old web interface...');
});

document.querySelectorAll('.header-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const icon = btn.querySelector('i');
        if (icon.classList.contains('fa-shopping-cart')) {
            console.log('Opening cart...');
        } else if (icon.classList.contains('fa-list')) {
            console.log('Opening watchlist...');
        }
    });
});

// Initialize
renderPopularFunds();
renderBestReturns();
renderNFO();
updateCalculator();

// Calculator Input Listeners
document.getElementById('monthlyInvestment')?.addEventListener('input', updateCalculator);
document.getElementById('investmentPeriod')?.addEventListener('input', updateCalculator);
document.getElementById('expectedReturn')?.addEventListener('input', updateCalculator);

// Update market indices every 3 seconds
setInterval(updateMarketIndices, 3000);

// Console message
console.log('%c5paisa Mutual Funds', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cMutual Funds page initialized successfully', 'color: #666; font-size: 14px;');


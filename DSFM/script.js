// Market movers data (will be loaded from API)
let moverTableData = {
    gainers: [],
    losers: []
};

const moversBody = document.getElementById('moversBody');
const marketTabs = document.querySelectorAll('.market-tab');
const moverFilters = document.querySelectorAll('.mover-filter');
const moverCardsContainer = document.querySelector('.moverset-grid');
const segmentSelect = document.querySelector('.segment-select');

// Load market movers from API
async function loadMarketMovers() {
    try {
        const data = await window.API.getMarketMovers();
        moverTableData.gainers = data.gainers.map(stock => ({
            symbol: stock.symbol,
            ltp: `₹${stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${stock.pct_change >= 0 ? '+' : ''}${stock.pct_change.toFixed(2)}%`,
            vol: 'N/A', // Volume not available from API
            direction: stock.pct_change >= 0 ? 'positive' : 'negative',
            rawLtp: stock.ltp,
            rawChange: stock.pct_change
        }));
        moverTableData.losers = data.losers.map(stock => ({
            symbol: stock.symbol,
            ltp: `₹${stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${stock.pct_change >= 0 ? '+' : ''}${stock.pct_change.toFixed(2)}%`,
            vol: 'N/A',
            direction: stock.pct_change >= 0 ? 'positive' : 'negative',
            rawLtp: stock.ltp,
            rawChange: stock.pct_change
        }));
        
        // Render with current active tab
        const activeTab = document.querySelector('.market-tab.active');
        const type = activeTab ? activeTab.dataset.type : 'gainers';
        renderMovers(type);
        renderMoverCards(type);
    } catch (error) {
        console.error('Failed to load market movers:', error);
        if (moversBody) {
            moversBody.innerHTML = '<tr><td colspan="4" style="text-align:center;opacity:0.7">Failed to load data</td></tr>';
        }
    }
}

function renderMovers(type = 'gainers') {
    if (!moversBody) return;
    const data = moverTableData[type] || [];
    moversBody.innerHTML = '';

    if (data.length === 0) {
        moversBody.innerHTML = '<tr><td colspan="4" style="text-align:center;opacity:0.7">Loading...</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.symbol}</td>
            <td>${row.ltp}</td>
            <td class="${row.direction}">${row.change}</td>
            <td>${row.vol}</td>
        `;
        moversBody.appendChild(tr);
    });
}

// render short mover cards (keeps in sync with table)
function renderMoverCards(type = 'gainers') {
    if (!moverCardsContainer) return;
    moverCardsContainer.innerHTML = '';
    const data = moverTableData[type] || [];
    // show up to 4 cards; pad with placeholders
    for (let i = 0; i < 4; i++) {
        const row = data[i];
        const div = document.createElement('div');
        div.className = 'mover-card';
        if (row) {
            div.innerHTML = `
                <div class="mover-symbol">${row.symbol}</div>
                <div class="mover-price">${row.ltp}</div>
                <div class="mover-change ${row.direction}">${row.change}</div>
                <div class="mover-volume">Vol ${row.vol}</div>
            `;
        } else {
            div.innerHTML = `<div class="mover-symbol">NIFTY 500</div><div class="mover-price">52 Week Low</div><div class="mover-change neutral">Track new lows & highs here</div>`;
        }
        moverCardsContainer.appendChild(div);
    }
    attachMoverCardHandlers();
}

marketTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        marketTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderMovers(tab.dataset.type);
        renderMoverCards(tab.dataset.type);
    });
});

// Load market movers on page load
if (typeof window.API !== 'undefined') {
    loadMarketMovers();
    // Refresh every 30 seconds
    setInterval(loadMarketMovers, 30000);
}

moverFilters.forEach(filter => {
    filter.addEventListener('click', () => {
        const group = filter.parentElement.querySelectorAll('.mover-filter');
        group.forEach(btn => btn.classList.remove('active'));
        filter.classList.add('active');
    });
});

// Initialize will happen after API loads
// renderMovers() and renderMoverCards() are called in loadMarketMovers()

// ----- Ticker animation (simple marquee) -----
const tickerBar = document.querySelector('.ticker-bar');

// Update ticker with NIFTY data from API
async function updateTicker() {
    if (!tickerBar) return;
    
    try {
        const niftyData = await window.API.getNifty();
        const tickerItems = tickerBar.querySelectorAll('.ticker-item');
        
        if (tickerItems.length > 0) {
            // Update first ticker item with NIFTY data
            const niftyItem = tickerItems[0];
            const nameEl = niftyItem.querySelector('.ticker-name');
            const changeEl = niftyItem.querySelector('.ticker-change');
            
            if (nameEl && changeEl) {
                const isPositive = niftyData.change_pct >= 0;
                nameEl.textContent = `NIFTY ${niftyData.nifty_value.toFixed(2)}`;
                changeEl.textContent = `${isPositive ? '+' : ''}${niftyData.change_pct.toFixed(2)}%`;
                changeEl.className = `ticker-change ${isPositive ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Failed to update ticker:', error);
    }
}

if (tickerBar) {
    // Update ticker on load and periodically
    if (typeof window.API !== 'undefined') {
        updateTicker();
        setInterval(updateTicker, 10000); // Update every 10 seconds
    }
    
    // wrap children into track
    const track = document.createElement('div');
    track.className = 'ticker-track';
    while (tickerBar.firstChild) track.appendChild(tickerBar.firstChild);
    // duplicate for smooth scroll
    const clone = track.cloneNode(true);
    tickerBar.appendChild(track);
    tickerBar.appendChild(clone);

    let pos = 0;
    function tick() {
        pos -= 0.6; // speed
        if (Math.abs(pos) >= track.scrollWidth) pos = 0;
        track.style.transform = `translateX(${pos}px)`;
        clone.style.transform = `translateX(${pos}px)`;
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// Attach handlers to mover cards (click to open detail/filter table)
function attachMoverCardHandlers() {
    const cards = document.querySelectorAll('.mover-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const symbol = card.querySelector('.mover-symbol')?.textContent || '';
            if (!symbol) return;
            // filter table to this symbol
            const all = [...moverTableData.gainers, ...moverTableData.losers];
            const matched = all.filter(r => r.symbol === symbol);
            if (matched.length) {
                moversBody.innerHTML = '';
                matched.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${row.symbol}</td>
                        <td>${row.ltp}</td>
                        <td class="${row.direction}">${row.change}</td>
                        <td>${row.vol}</td>
                    `;
                    moversBody.appendChild(tr);
                });
            }
            showModal(symbol + ' — Details', `<p>Latest: <strong>${matched[0]?.ltp || 'N/A'}</strong></p><p>Change: ${matched[0]?.change || 'N/A'}</p><p>Volume: ${matched[0]?.vol || 'N/A'}</p>`);
        });
    });
}

// initial attach for any pre-existing mover cards
attachMoverCardHandlers();

// segment select change handler
if (segmentSelect) {
    segmentSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        showModal('Segment changed', `<p>Showing data for <strong>${value}</strong> (demo)</p>`);
    });
}

// ----- Additional UI interactions -----

// Header & side navigation active state handling
const headerLinks = document.querySelectorAll('.nav-link-page');
const sideNavItems = document.querySelectorAll('.nav-item');
const currentFile = location.pathname.split('/').pop() || 'index.html';

function setActiveNav(linkList, clicked) {
    linkList.forEach(l => l.classList.remove('active'));
    if (clicked) clicked.classList.add('active');
}

headerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === currentFile || href === '' || href === './' || href === '#') {
            e.preventDefault();
            setActiveNav(headerLinks, link);
        }
        // otherwise allow navigation to other pages
    });
});

sideNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        if (href === currentFile || href === '' || href === './' || href === '#') {
            e.preventDefault();
            setActiveNav(sideNavItems, item);
        }
        // allow navigation for other pages
    });
});

// Search: filter movers table by symbol
const searchInput = document.querySelector('.search-block input');
function searchMovers(query) {
    query = (query || '').trim().toLowerCase();
    if (!query) {
        const activeTab = document.querySelector('.market-tab.active');
        renderMovers(activeTab ? activeTab.dataset.type : 'gainers');
        return;
    }

    const all = [...moverTableData.gainers, ...moverTableData.losers];
    const filtered = all.filter(r => r.symbol.toLowerCase().includes(query));
    moversBody.innerHTML = '';
    if (filtered.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" style="text-align:center;opacity:0.7">No results</td>';
        moversBody.appendChild(tr);
        return;
    }

    filtered.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.symbol}</td>
            <td>${row.ltp}</td>
            <td class="${row.direction}">${row.change}</td>
            <td>${row.vol}</td>
        `;
        moversBody.appendChild(tr);
    });
}

if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => searchMovers(e.target.value), 200);
    });
}

// --- Enhanced search suggestions (symbols + pages) ---
if (searchInput) {
    const suggBox = document.createElement('div');
    suggBox.className = 'search-suggestions';
    suggBox.style.display = 'none';
    document.querySelector('.search-block').appendChild(suggBox);

    function getSymbolSuggestions(query) {
        const all = [...moverTableData.gainers, ...moverTableData.losers];
        const uniq = Array.from(new Map(all.map(s => [s.symbol, s])).values());
        return uniq.filter(s => s.symbol.toLowerCase().includes(query)).map(s => ({
            title: s.symbol,
            meta: s.ltp
        }));
    }

    let items = [];
    let activeIndex = -1;

    function renderSuggestions(list) {
        items = list;
        activeIndex = -1;
        suggBox.innerHTML = '';
        if (!list.length) { suggBox.style.display = 'none'; return; }
        list.forEach((it, idx) => {
            const el = document.createElement('div');
            el.className = 'item';
            el.tabIndex = 0;
            el.dataset.index = idx;
            el.innerHTML = `<strong>${it.title}</strong><span class="meta">${it.meta || ''}</span>`;
            el.addEventListener('click', () => selectSuggestion(idx));
            suggBox.appendChild(el);
        });
        suggBox.style.display = 'block';
    }

    function selectSuggestion(idx) {
        const sel = items[idx];
        if (!sel) return;
        // treat suggestion as a symbol
        searchInput.value = sel.title;
        searchMovers(sel.title);
        suggBox.style.display = 'none';
        showModal(sel.title + ' — Quick View', `<p>${sel.title} ${sel.meta || ''}</p>`);
    }

    searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').trim().toLowerCase();
        if (!q) { suggBox.style.display = 'none'; return; }
        const symSug = getSymbolSuggestions(q);
        renderSuggestions(symSug.slice(0,10));
    });

    searchInput.addEventListener('keydown', (e) => {
        const visible = suggBox.style.display !== 'none';
        const children = suggBox.querySelectorAll('.item');
        if (!visible) {
            if (e.key === 'Enter') {
                // fallback: perform search on enter
                e.preventDefault();
                searchMovers(searchInput.value);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, children.length - 1);
            children.forEach(c => c.classList.remove('active'));
            if (children[activeIndex]) children[activeIndex].classList.add('active');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            children.forEach(c => c.classList.remove('active'));
            if (children[activeIndex]) children[activeIndex].classList.add('active');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0) selectSuggestion(activeIndex);
            else searchMovers(searchInput.value);
        } else if (e.key === 'Escape') {
            suggBox.style.display = 'none';
        }
    });

    document.addEventListener('click', (ev) => {
        if (!document.querySelector('.search-block').contains(ev.target)) {
            suggBox.style.display = 'none';
        }
    });
}

// Simple modal helper
function showModal(title, contentHtml) {
    // remove existing
    const existing = document.getElementById('simpleModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'simpleModal';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '18px';
    box.style.borderRadius = '8px';
    box.style.width = 'min(560px,90%)';
    box.innerHTML = `<h3 style="margin-top:0">${title}</h3><div>${contentHtml}</div>`;

    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.marginTop = '12px';
    close.addEventListener('click', () => modal.remove());
    box.appendChild(close);

    modal.appendChild(box);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

// Wire common buttons
const addMarginBtn = document.querySelector('.add-margin-btn');
const linkBtns = document.querySelectorAll('.link-btn');
const tvBtn = document.querySelector('.tv-btn');
const fnoBtn = document.querySelector('.fno-btn');
const ghostBtns = document.querySelectorAll('.ghost-btn');

if (addMarginBtn) addMarginBtn.addEventListener('click', () => {
    showModal('Add Margin', '<p>This is a demo add margin flow. Integrate with backend to enable payments.</p>');
});

linkBtns.forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('Add Funds / Increase Margin', '<p>Select payment method to add funds. (Demo)</p>');
}));

if (tvBtn) tvBtn.addEventListener('click', () => {
    showModal('TV Charts', '<p>TV Charts placeholder. Open integrated charting for real data.</p>');
});

if (fnoBtn) fnoBtn.addEventListener('click', () => {
    showModal('FnO 360', '<p>FnO insights and scanner will appear here.</p>');
});

ghostBtns.forEach(b => b.addEventListener('click', (e) => {
    const hasIcon = b.querySelector('.fa-comment');
    if (hasIcon) {
        const feedback = prompt('Send feedback');
        if (feedback) alert('Thanks for your feedback!');
    } else {
        showModal('Notifications', '<p>No new notifications</p>');
    }
}));

// Profile menu
const profileChip = document.querySelector('.profile-chip');
if (profileChip) {
    profileChip.addEventListener('click', (e) => {
        e.stopPropagation();
        let menu = profileChip.querySelector('.profile-menu');
        if (menu) return menu.classList.toggle('open');

        menu = document.createElement('div');
        menu.className = 'profile-menu open';
        menu.style.position = 'absolute';
        menu.style.right = '12px';
        menu.style.top = '54px';
        menu.style.background = '#fff';
        menu.style.border = '1px solid #ddd';
        menu.style.padding = '8px';
        menu.style.borderRadius = '6px';
        menu.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
        menu.innerHTML = `
            <div style="padding:8px 12px">Signed in as <strong>${document.querySelector('.profile-name')?.textContent || 'User'}</strong></div>
            <hr />
            <button class="profile-logout" style="display:block;width:100%;text-align:left;border:0;background:none;padding:8px 12px;cursor:pointer">Logout</button>
        `;
        profileChip.appendChild(menu);

        menu.querySelector('.profile-logout').addEventListener('click', () => {
            alert('Logged out (demo)');
        });
    });

    document.addEventListener('click', () => {
        const menu = profileChip.querySelector('.profile-menu');
        if (menu) menu.remove();
    });
}

const watchlistData = {
    mystocks: [],
    nifty50: [],
    watchlist1: [],
    watchlist2: []
};

const watchlistBody = document.getElementById('watchlistBody');
const emptyState = document.getElementById('emptyState');
const tabs = document.querySelectorAll('.watchlist-tab');
const fundTabs = document.querySelectorAll('.fund-tab');

function renderWatchlist(key = 'mystocks') {
    const rows = watchlistData[key];
    watchlistBody.innerHTML = '';

    if (!rows || rows.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.name}</td>
            <td class="${row.direction}">${row.change}</td>
            <td>${row.price}</td>
        `;
        watchlistBody.appendChild(tr);
    });
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab) {
            renderWatchlist(tab.dataset.tab);
        }
    });
});

fundTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        fundTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

renderWatchlist();


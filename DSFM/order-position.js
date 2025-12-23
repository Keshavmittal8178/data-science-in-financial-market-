const watchlistData = {
    mystocks: [],
    nifty50: [],
    watchlist1: [],
    watchlist2: []
};

const watchlistBody = document.getElementById('watchlistBody');
const emptyState = document.getElementById('emptyState');
const ordersBody = document.getElementById('ordersBody');
const ordersEmptyState = document.getElementById('ordersEmptyState');
const tabs = document.querySelectorAll('.watchlist-tab');
const orderTabs = document.querySelectorAll('.order-tab');
const filterBtns = document.querySelectorAll('.filter-btn');

function renderWatchlist(key = 'mystocks') {
    const rows = watchlistData[key];
    watchlistBody.innerHTML = '';

    if (!rows || rows.length === 0) {
        emptyState.classList.add('active');
        return;
    }

    emptyState.classList.remove('active');
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

function renderOrders() {
    ordersBody.innerHTML = '';
    ordersEmptyState.classList.add('active');
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderWatchlist(tab.dataset.tab);
    });
});

orderTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        orderTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderOrders();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderOrders();
    });
});

renderWatchlist();
renderOrders();


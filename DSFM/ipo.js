// Current IPOs Data
const currentIPOs = [
    {
        companyName: 'Capillary Technologies India Ltd',
        openDate: '14 Nov, 25',
        closeDate: '18 Nov, 25',
        lotSize: '25',
        priceRange: { min: 549, max: 577 },
        minInvestment: 13725,
        status: 'open'
    },
    {
        companyName: 'Fujiyama Power Systems Ltd',
        openDate: '13 Nov, 25',
        closeDate: '17 Nov, 25',
        lotSize: '65',
        priceRange: { min: 216, max: 228 },
        minInvestment: 14040,
        status: 'open'
    }
];

// Upcoming IPOs Data
const upcomingIPOs = [
    {
        companyName: 'Excelsoft Technologies Ltd',
        openDate: '19 Nov, 25',
        closeDate: '21 Nov, 25',
        lotSize: '125',
        priceRange: { min: 114, max: 120 },
        minInvestment: 14250,
        status: 'upcoming'
    },
    {
        companyName: 'Gallard Steel Ltd',
        openDate: '19 Nov, 25',
        closeDate: '21 Nov, 25',
        lotSize: '1000',
        priceRange: { min: 142, max: 150 },
        minInvestment: 284000,
        status: 'upcoming'
    }
];

// Render IPO Cards
function renderIPOCards(ipos, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (ipos.length === 0) {
        container.innerHTML = `
            <div class="empty-ipo">
                <div class="empty-ipo-icon">
                    <i class="fas fa-building"></i>
                </div>
                <div class="empty-ipo-text">No IPOs available at the moment</div>
            </div>
        `;
        return;
    }
    
    ipos.forEach(ipo => {
        const card = document.createElement('div');
        card.className = 'ipo-card';
        
        const statusClass = ipo.status === 'pre-open' ? 'pre-open' : 
                          ipo.status === 'open' ? 'open' : 'closed';
        const statusText = ipo.status === 'pre-open' ? 'Pre-Open' : 
                          ipo.status === 'open' ? 'Open' : 'Closed';
        
        card.innerHTML = `
            ${ipo.status === 'pre-open' ? `<div class="ipo-status ${statusClass}">${statusText}</div>` : ''}
            <div class="ipo-content">
                <div class="ipo-company-name">${ipo.companyName}</div>
                <div class="ipo-details">
                    <div class="ipo-detail-item">
                        <span class="ipo-detail-label">Open Date</span>
                        <span class="ipo-detail-value">${ipo.openDate}</span>
                    </div>
                    <div class="ipo-detail-item">
                        <span class="ipo-detail-label">Close Date</span>
                        <span class="ipo-detail-value">${ipo.closeDate}</span>
                    </div>
                    <div class="ipo-detail-item">
                        <span class="ipo-detail-label">Lot Size</span>
                        <span class="ipo-detail-value">${ipo.lotSize}</span>
                    </div>
                    <div class="ipo-detail-item">
                        <span class="ipo-detail-label">Price Range</span>
                        <span class="ipo-detail-value">
                            <span class="ipo-price-range">
                                ₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}
                            </span>
                        </span>
                    </div>
                </div>
                <div class="ipo-min-investment">
                    <i class="fas fa-rupee-sign min-investment-icon"></i>
                    <span class="min-investment-text">Minimum Investment</span>
                    <span class="min-investment-value">₹${ipo.minInvestment.toLocaleString('en-IN')}</span>
                </div>
            </div>
            ${ipo.status === 'open' ? `
            <div class="ipo-action">
                <button class="apply-ipo-btn" data-company="${ipo.companyName}">
                    APPLY IPO
                </button>
            </div>
            ` : ''}
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to Apply IPO buttons
    document.querySelectorAll('.apply-ipo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const companyName = e.target.dataset.company;
            handleApplyIPO(companyName);
        });
    });
}

// Handle Apply IPO
function handleApplyIPO(companyName) {
    // In real implementation, this would open an application form
    const confirmed = confirm(`Do you want to apply for ${companyName}?`);
    if (confirmed) {
        alert(`Application form for ${companyName} will open shortly...`);
        // Here you would typically redirect to application form or open a modal
        console.log('Applying for IPO:', companyName);
    }
}

// Scroll to Top Functionality
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Dashboard Link
document.querySelector('.dashboard-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    // In real implementation, this would navigate to dashboard
    console.log('Navigating to Dashboard...');
    // window.location.href = 'dashboard.html';
});

// FAQ Toggle Functionality
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.closest('.faq-item');
        const answer = faqItem.querySelector('.faq-answer');
        const icon = question.querySelector('i');
        
        const isOpen = faqItem.classList.contains('open');
        
        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('open');
            item.querySelector('.faq-answer').style.display = 'none';
            item.querySelector('.faq-question i').classList.remove('fa-minus');
            item.querySelector('.faq-question i').classList.add('fa-plus');
        });
        
        // Toggle current item
        if (!isOpen) {
            faqItem.classList.add('open');
            answer.style.display = 'block';
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-minus');
        }
    });
});

// FAQ Link
document.querySelector('.faq-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Opening charges information page...');
});

// Initialize
renderIPOCards(currentIPOs, 'currentIPOs');
renderIPOCards(upcomingIPOs, 'upcomingIPOs');

// Console message
console.log('%c5paisa IPO Page', 'color: #0066cc; font-size: 20px; font-weight: bold;');
console.log('%cIPO page initialized successfully', 'color: #666; font-size: 14px;');


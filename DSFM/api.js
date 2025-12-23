// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            // Try to get error details from response
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: `${response.status} ${response.statusText}` };
            }
            
            const error = new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            error.data = errorData;
            throw error;
        }

        return await response.json();
    } catch (error) {
        // Check if it's a connection error
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
            const connectionError = new Error('Backend server is not running. Please start the Flask server on port 8000.');
            connectionError.isConnectionError = true;
            console.error(`API Call failed for ${endpoint}: Backend server not available`);
            throw connectionError;
        }
        console.error(`API Call failed for ${endpoint}:`, error);
        throw error;
    }
}

// API Functions

// Get NIFTY data
async function getNifty() {
    return apiCall('/api/nifty');
}

// Get stock data for a symbol
async function getStock(symbol) {
    return apiCall(`/api/stock/${symbol}`);
}

// Get market movers (gainers/losers)
async function getMarketMovers() {
    return apiCall('/api/market-movers');
}

// Get portfolio data
async function getPortfolio() {
    return apiCall('/api/portfolio');
}

// Get NIFTY history for charts
async function getNiftyHistory() {
    return apiCall('/api/nifty/history');
}

// Get DSFM top stocks
async function getDSFMTopStocks() {
    return apiCall('/api/dsfm/top-stocks');
}

// Get forecast for a symbol
async function getForecast(symbol) {
    return apiCall(`/api/dsfm/forecast/${symbol}`);
}

// Get sentiment for a symbol
async function getSentiment(symbol) {
    return apiCall(`/api/dsfm/sentiment/${symbol}`);
}

// Get decision engine data for a symbol
async function getDecision(symbol) {
    return apiCall(`/api/dsfm/decision/${symbol}`);
}

// Get most bought stock
async function getMostBought() {
    return apiCall('/api/most-bought');
}

// Get market insights
async function getMarketInsights() {
    return apiCall('/api/market-insights');
}

// DSFM Analysis Functions
async function getDSFMGarchAnalysis(symbol) {
    return apiCall(`/api/dsfm/garch-analysis/${symbol}`);
}

async function getDSFMFinbertAnalysis() {
    return apiCall('/api/dsfm/finbert-analysis');
}

async function getDSFMLstmAnalysis(symbol) {
    return apiCall(`/api/dsfm/lstm-analysis/${symbol}`);
}

async function getDSFMCombinedAnalysis(symbol) {
    return apiCall(`/api/dsfm/combined-analysis/${symbol}`);
}

async function getDSFMAvailableSymbols() {
    return apiCall('/api/dsfm/available-symbols');
}

// Export API functions
window.API = {
    getNifty,
    getStock,
    getMarketMovers,
    getPortfolio,
    getNiftyHistory,
    getDSFMTopStocks,
    getForecast,
    getSentiment,
    getDecision,
    getMostBought,
    getMarketInsights,
    getDSFMGarchAnalysis,
    getDSFMFinbertAnalysis,
    getDSFMLstmAnalysis,
    getDSFMCombinedAnalysis,
    getDSFMAvailableSymbols
};


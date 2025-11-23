// app.js - Frontend Logic for Wayback Snapshot Finder

// Global variables
let allSnapshots = [];
let filteredSnapshots = [];

// DOM Elements
const urlInput = document.getElementById('urlInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const resultsSection = document.getElementById('resultsSection');
const snapshotsBody = document.getElementById('snapshotsBody');
const totalCount = document.getElementById('totalCount');
const dateRange = document.getElementById('dateRange');
const showingCount = document.getElementById('showingCount');
const statusFilter = document.getElementById('statusFilter');
const yearFilter = document.getElementById('yearFilter');
const searchSnapshotInput = document.getElementById('searchSnapshotInput');
const sortBy = document.getElementById('sortBy');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
statusFilter.addEventListener('change', applyFilters);
yearFilter.addEventListener('change', applyFilters);
searchSnapshotInput.addEventListener('input', applyFilters);
sortBy.addEventListener('change', applySorting);

// Main search function
async function handleSearch() {
    const url = urlInput.value.trim();
    
    // Validate input
    if (!url) {
        showError('Please enter a URL');
        return;
    }
    
    // Reset UI
    hideError();
    hideResults();
    showLoading();
    
    try {
        // Fetch snapshots from backend API
        const response = await fetch(`/api/snapshots?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch snapshots');
        }
        
        // Process the data
        processSnapshots(data);
        
        // Display results
        hideLoading();
        displayResults();
        
    } catch (error) {
        hideLoading();
        showError(`Error: ${error.message}`);
    }
}

// Process raw snapshot data
function processSnapshots(data) {
    // First row is headers: ["timestamp", "original", "statuscode", "mimetype"]
    // Remaining rows are data
    
    if (!Array.isArray(data) || data.length < 2) {
        throw new Error('No snapshots found for this URL');
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Convert to objects
    allSnapshots = rows.map(row => ({
        timestamp: row[0],
        original: row[1],
        statuscode: row[2],
        mimetype: row[3],
        date: parseTimestamp(row[0]),
        year: row[0].substring(0, 4),
        archiveUrl: `https://web.archive.org/web/${row[0]}/${row[1]}`
    }));
    
    // Populate year filter
    populateYearFilter();
    
    // Initially show all snapshots
    filteredSnapshots = [...allSnapshots];
    applySorting();
}

// Parse Wayback timestamp (YYYYMMDDhhmmss) to readable format
function parseTimestamp(timestamp) {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

// Populate year filter dropdown
function populateYearFilter() {
    const years = [...new Set(allSnapshots.map(s => s.year))].sort().reverse();
    
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

// Apply filters
function applyFilters() {
    const statusValue = statusFilter.value;
    const yearValue = yearFilter.value;
    const searchValue = searchSnapshotInput.value.toLowerCase().trim();
    
    filteredSnapshots = allSnapshots.filter(snapshot => {
        // Status filter
        if (statusValue !== 'all' && snapshot.statuscode !== statusValue) {
            return false;
        }
        
        // Year filter
        if (yearValue !== 'all' && snapshot.year !== yearValue) {
            return false;
        }
        
        // Search filter
        if (searchValue && !snapshot.original.toLowerCase().includes(searchValue)) {
            return false;
        }
        
        return true;
    });
    
    applySorting();
}

// Apply sorting
function applySorting() {
    const sortValue = sortBy.value;
    
    filteredSnapshots.sort((a, b) => {
        if (sortValue === 'newest') {
            return b.timestamp.localeCompare(a.timestamp);
        } else if (sortValue === 'oldest') {
            return a.timestamp.localeCompare(b.timestamp);
        } else if (sortValue === 'status') {
            return a.statuscode.localeCompare(b.statuscode);
        }
        return 0;
    });
    
    renderTable();
}

// Render snapshots table
function renderTable() {
    // Clear existing rows
    snapshotsBody.innerHTML = '';
    
    if (filteredSnapshots.length === 0) {
        snapshotsBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">No snapshots match your filters</td></tr>';
        updateStats();
        return;
    }
    
    // Render each snapshot
    filteredSnapshots.forEach((snapshot, index) => {
        const row = document.createElement('tr');
        
        const formattedDate = snapshot.date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formattedDate}</td>
            <td style="word-break: break-all;">${snapshot.original}</td>
            <td><span class="status-badge status-${snapshot.statuscode}">${snapshot.statuscode}</span></td>
            <td>${snapshot.mimetype}</td>
            <td><a href="${snapshot.archiveUrl}" target="_blank" class="view-btn">View</a></td>
        `;
        
        snapshotsBody.appendChild(row);
    });
    
    updateStats();
}

// Update statistics
function updateStats() {
    totalCount.textContent = allSnapshots.length.toLocaleString();
    showingCount.textContent = filteredSnapshots.length.toLocaleString();
    
    if (allSnapshots.length > 0) {
        const oldestDate = allSnapshots[allSnapshots.length - 1].date;
        const newestDate = allSnapshots[0].date;
        
        const oldestYear = oldestDate.getFullYear();
        const newestYear = newestDate.getFullYear();
        
        dateRange.textContent = `${oldestYear} - ${newestYear}`;
    }
}

// Display results section
function displayResults() {
    resultsSection.classList.remove('hidden');
}

// Show loading
function showLoading() {
    loading.classList.remove('hidden');
}

// Hide loading
function hideLoading() {
    loading.classList.add('hidden');
}

// Show error
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
}

// Hide error
function hideError() {
    errorMsg.classList.add('hidden');
}

// Hide results
function hideResults() {
    resultsSection.classList.add('hidden');
}

// Initialize - Focus on input field
urlInput.focus();    

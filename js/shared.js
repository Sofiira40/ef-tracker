
// ==========================================
// SHARED UTILITIES & SUPABASE CONFIGURATION
// ==========================================

// IMPORTANT: Replace these with YOUR Supabase credentials
const SUPABASE_URL = 'https://dtpeatubjszwxwxgahuc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGVhdHVianN6d3h3eGdhaHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTIwNjEsImV4cCI6MjA4NDg2ODA2MX0.EWp2gcXEeiI7AzCDGVCw2fHKnztiKk96PP1nvlMFhNY';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate a random token (4 characters: 2 letters + 2 numbers)
 * Example: AB12, XY89
 */
function generateToken() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let token = '';
    token += letters[Math.floor(Math.random() * letters.length)];
    token += letters[Math.floor(Math.random() * letters.length)];
    token += numbers[Math.floor(Math.random() * numbers.length)];
    token += numbers[Math.floor(Math.random() * numbers.length)];
    
    return token;
}

/**
 * Save data to localStorage
 */
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

/**
 * Get data from localStorage
 */
function getFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculate average of an array
 */
function calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return (sum / arr.length).toFixed(1);
}

/**
 * Get skill name from database column
 */
function getSkillName(column) {
    const skillNames = {
        'task_initiation': 'Task Initiation',
        'working_memory': 'Working Memory',
        'planning': 'Planning',
        'organization': 'Organization',
        'time_management': 'Time Management',
        'self_monitoring': 'Self-Monitoring',
        'emotional_regulation': 'Emotional Regulation',
        'flexibility': 'Flexibility'
    };
    return skillNames[column] || column;
}

/**
 * Get color based on score (1-5)
 */
function getScoreColor(score) {
    if (score >= 4.5) return '#10B981'; // Green
    if (score >= 3.5) return '#F59E0B'; // Yellow
    if (score >= 2.5) return '#F97316'; // Orange
    return '#EF4444'; // Red
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span style="font-size: 1.5rem;">${type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️'}</span>
        <div>${message}</div>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    const header = container.querySelector('header');
    header.after(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Show loading spinner
 */
function showLoading(element) {
    element.innerHTML = '<div class="spinner"></div>';
}

/**
 * Download data as JSON file
 */
function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${formatDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download data as CSV file
 */
function downloadCSV(data, filename, headers) {
    // Create CSV header
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${formatDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==========================================
// EXPORT FOR USE IN OTHER FILES
// ==========================================
window.EFUtils = {
    supabaseClient,
    generateToken,
    saveToLocalStorage,
    getFromLocalStorage,
    formatDate,
    calculateAverage,
    getSkillName,
    getScoreColor,
    showAlert,
    showLoading,
    downloadJSON,
    downloadCSV
};
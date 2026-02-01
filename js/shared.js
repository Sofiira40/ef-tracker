// ==========================================
// SHARED UTILITIES & SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://dtpeatubjszwxwxgahuc.supabase.co'; 

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGVhdHVianN6d3h3eGdhaHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTIwNjEsImV4cCI6MjA4NDg2ODA2MX0.EWp2gcXEeiI7AzCDGVCw2fHKnztiKk96PP1nvlMFhNY';

// Initialize Supabase client
// The global 'supabase' object comes from the CDN script loaded in HTML
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

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

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

function formatDate(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return (sum / arr.length).toFixed(1);
}

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

function getScoreColor(score) {
    if (score >= 4.5) return '#10B981';
    if (score >= 3.5) return '#F59E0B';
    if (score >= 2.5) return '#F97316';
    return '#EF4444';
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span style="font-size: 1.5rem;">${type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️'}</span>
        <div>${message}</div>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
        const header = container.querySelector('header');
        if (header) {
            header.after(alertDiv);
        } else {
            container.prepend(alertDiv);
        }
    }
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(element) {
    element.innerHTML = '<div class="spinner"></div>';
}

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

function downloadCSV(data, filename, headers) {
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });
    
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
// EXPORT - Make everything globally available
// ==========================================
window.EFUtils = {
    supabaseClient: supabaseClient,
    generateToken: generateToken,
    saveToLocalStorage: saveToLocalStorage,
    getFromLocalStorage: getFromLocalStorage,
    formatDate: formatDate,
    calculateAverage: calculateAverage,
    getSkillName: getSkillName,
    getScoreColor: getScoreColor,
    showAlert: showAlert,
    showLoading: showLoading,
    downloadJSON: downloadJSON,
    downloadCSV: downloadCSV
};

// Debug: Log to console to verify it loaded
console.log('✅ EFUtils loaded successfully');
console.log('Supabase client initialized:', supabaseClient ? 'YES' : 'NO');
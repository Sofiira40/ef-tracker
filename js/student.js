// ==========================================
// STUDENT PORTAL JAVASCRIPT
// ==========================================

// Global state
let currentSessionId = null;
let currentToken = null;
let currentTokenId = null;

// ==========================================
// STEP 1: CLASS CODE VALIDATION
// ==========================================

async function validateClassCode() {
    const classCodeInput = document.getElementById('classCodeInput');
    const classCode = classCodeInput.value.trim().toUpperCase();
    
    if (!classCode) {
        window.EFUtils.showAlert('Please enter a class code', 'danger');
        return;
    }
    
    // Check if class session exists
    const { data, error } = await window.EFUtils.supabaseClient
        .from('class_sessions')
        .select('id, class_name, active')
        .eq('class_code', classCode)
        .single();
    
    if (error || !data) {
        document.getElementById('classCodeError').classList.remove('hidden');
        return;
    }
    
    if (!data.active) {
        window.EFUtils.showAlert('This class session is no longer active. Please check with your teacher.', 'warning');
        return;
    }
    
    // Save session info
    currentSessionId = data.id;
    window.EFUtils.saveToLocalStorage('current_session', { id: data.id, code: classCode, name: data.class_name });
    
    // Move to token step
    document.getElementById('step-classCode').classList.add('hidden');
    document.getElementById('step-token').classList.remove('hidden');
    
    // Check if student has used this app before
    checkForExistingToken();
}

// ==========================================
// STEP 2: TOKEN MANAGEMENT
// ==========================================

async function checkForExistingToken() {
    const savedToken = window.EFUtils.getFromLocalStorage('student_token');
    
    if (savedToken && savedToken.token) {
        // Student has been here before
        document.getElementById('newTokenSection').classList.add('hidden');
        document.getElementById('returningTokenSection').classList.remove('hidden');
        document.getElementById('returningToken').value = savedToken.token;
        currentToken = savedToken.token;
        currentTokenId = savedToken.id;
    } else {
        // New student - create token
        await createNewToken();
    }
}

async function createNewToken() {
    const token = window.EFUtils.generateToken();
    
    // Insert into database
    const { data, error } = await window.EFUtils.supabaseClient
        .from('student_tokens')
        .insert({
            session_id: currentSessionId,
            token: token,
            first_use_date: window.EFUtils.formatDate()
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating token:', error);
        window.EFUtils.showAlert('Error creating your ID. Please try again.', 'danger');
        return;
    }
    
    // Save token
    currentToken = token;
    currentTokenId = data.id;
    window.EFUtils.saveToLocalStorage('student_token', { token: token, id: data.id });
    
    // Display token
    document.getElementById('displayToken').textContent = token;
}

function toggleReturningStudent() {
    const newSection = document.getElementById('newTokenSection');
    const returningSection = document.getElementById('returningTokenSection');
    
    if (newSection.classList.contains('hidden')) {
        newSection.classList.remove('hidden');
        returningSection.classList.add('hidden');
    } else {
        newSection.classList.add('hidden');
        returningSection.classList.remove('hidden');
    }
}

async function startAssessment() {
    // If returning student, validate their token
    if (!document.getElementById('newTokenSection').classList.contains('hidden')) {
        // New student - already have token
    } else {
        // Returning student - check token
        const inputToken = document.getElementById('returningToken').value.trim().toUpperCase();
        
        if (!inputToken) {
            window.EFUtils.showAlert('Please enter your anonymous ID', 'danger');
            return;
        }
        
        // Verify token exists and belongs to this session
        const { data, error } = await window.EFUtils.supabaseClient
            .from('student_tokens')
            .select('id')
            .eq('token', inputToken)
            .eq('session_id', currentSessionId)
            .single();
        
        if (error || !data) {
            window.EFUtils.showAlert('Invalid ID for this class. Please check your ID or create a new one.', 'danger');
            return;
        }
        
        currentToken = inputToken;
        currentTokenId = data.id;
        window.EFUtils.saveToLocalStorage('student_token', { token: inputToken, id: data.id });
        
        // Update last use date
        await window.EFUtils.supabaseClient
            .from('student_tokens')
            .update({ last_use_date: window.EFUtils.formatDate() })
            .eq('id', data.id);
    }
    
    // Show assessment form
    document.getElementById('step-token').classList.add('hidden');
    document.getElementById('step-assessment').classList.remove('hidden');
}

// ==========================================
// STEP 3: SUBMIT ASSESSMENT
// ==========================================

document.getElementById('assessmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Collect all scores
    const assessmentData = {
        token_id: currentTokenId,
        assessment_date: window.EFUtils.formatDate(),
        task_initiation: parseInt(formData.get('task_initiation')),
        working_memory: parseInt(formData.get('working_memory')),
        planning: parseInt(formData.get('planning')),
        organization: parseInt(formData.get('organization')),
        time_management: parseInt(formData.get('time_management')),
        self_monitoring: parseInt(formData.get('self_monitoring')),
        emotional_regulation: parseInt(formData.get('emotional_regulation')),
        flexibility: parseInt(formData.get('flexibility')),
        what_went_well: formData.get('what_went_well'),
        what_was_challenging: formData.get('what_was_challenging'),
        support_needed: formData.get('support_needed'),
        weekly_goal: formData.get('weekly_goal'),
        goal_progress: formData.get('goal_progress') ? parseInt(formData.get('goal_progress')) : null
    };
    
    // Submit to database
    const { data, error } = await window.EFUtils.supabaseClient
        .from('ef_assessments')
        .insert(assessmentData)
        .select()
        .single();
    
    if (error) {
        console.error('Error submitting assessment:', error);
        window.EFUtils.showAlert('Error submitting your assessment. Please try again.', 'danger');
        return;
    }
    
    // Save to localStorage for offline access
    let localAssessments = window.EFUtils.getFromLocalStorage('my_assessments') || [];
    localAssessments.push(assessmentData);
    window.EFUtils.saveToLocalStorage('my_assessments', localAssessments);
    
    // Show completion screen
    showCompletionScreen(assessmentData);
});

// ==========================================
// STEP 4: COMPLETION & SUMMARY
// ==========================================

function showCompletionScreen(data) {
    document.getElementById('step-assessment').classList.add('hidden');
    document.getElementById('step-complete').classList.remove('hidden');
    
    // Calculate average score
    const skills = ['task_initiation', 'working_memory', 'planning', 'organization', 
                    'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
    
    const scores = skills.map(skill => data[skill]);
    const avgScore = window.EFUtils.calculateAverage(scores);
    
    // Create summary cards
    const summaryHTML = `
        <div class="stat-card">
            <div class="stat-label">Overall Average</div>
            <div class="stat-value" style="color: ${window.EFUtils.getScoreColor(avgScore)}">${avgScore}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Strongest Skill</div>
            <div class="stat-value" style="font-size: 1.5rem;">${getStrongestSkill(data, skills)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Growth Area</div>
            <div class="stat-value" style="font-size: 1.5rem;">${getWeakestSkill(data, skills)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Assessments Completed</div>
            <div class="stat-value">${(window.EFUtils.getFromLocalStorage('my_assessments') || []).length}</div>
        </div>
    `;
    
    document.getElementById('skillsSummary').innerHTML = summaryHTML;
}

function getStrongestSkill(data, skills) {
    let maxScore = 0;
    let strongestSkill = '';
    
    skills.forEach(skill => {
        if (data[skill] > maxScore) {
            maxScore = data[skill];
            strongestSkill = window.EFUtils.getSkillName(skill);
        }
    });
    
    return strongestSkill;
}

function getWeakestSkill(data, skills) {
    let minScore = 6;
    let weakestSkill = '';
    
    skills.forEach(skill => {
        if (data[skill] < minScore) {
            minScore = data[skill];
            weakestSkill = window.EFUtils.getSkillName(skill);
        }
    });
    
    return weakestSkill;
}

// ==========================================
// PROGRESS TRACKING
// ==========================================

async function viewMyProgress() {
    document.getElementById('step-complete').classList.add('hidden');
    document.getElementById('progressDashboard').classList.remove('hidden');
    
    // Fetch all assessments for this token
    const { data, error } = await window.EFUtils.supabaseClient
        .from('ef_assessments')
        .select('*')
        .eq('token_id', currentTokenId)
        .order('assessment_date', { ascending: true });
    
    if (error) {
        console.error('Error fetching progress:', error);
        window.EFUtils.showAlert('Error loading your progress. Please try again.', 'danger');
        return;
    }
    
    if (!data || data.length === 0) {
        window.EFUtils.showAlert('No assessment history found yet. Complete more assessments to see your progress!', 'info');
        return;
    }
    
    // Create progress chart
    createProgressChart(data);
}

function createProgressChart(assessments) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    // Prepare data
    const dates = assessments.map(a => a.assessment_date);
    const skills = ['task_initiation', 'working_memory', 'planning', 'organization',
                    'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
    
    const datasets = skills.map((skill, index) => {
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
        return {
            label: window.EFUtils.getSkillName(skill),
            data: assessments.map(a => a[skill]),
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            tension: 0.4
        };
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Your Executive Functioning Skills Over Time',
                    font: { size: 18 }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: 'Skill Level'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function hideProgress() {
    document.getElementById('progressDashboard').classList.add('hidden');
    document.getElementById('step-complete').classList.remove('hidden');
}

// ==========================================
// DATA EXPORT
// ==========================================

async function downloadMyData() {
    // Fetch all data for this token
    const { data, error } = await window.EFUtils.supabaseClient
        .from('ef_assessments')
        .select('*')
        .eq('token_id', currentTokenId)
        .order('assessment_date', { ascending: true });
    
    if (error) {
        console.error('Error fetching data:', error);
        window.EFUtils.showAlert('Error downloading your data. Please try again.', 'danger');
        return;
    }
    
    // Add token to data for reference
    const exportData = {
        student_token: currentToken,
        total_assessments: data.length,
        first_assessment: data[0]?.assessment_date,
        last_assessment: data[data.length - 1]?.assessment_date,
        assessments: data
    };
    
    window.EFUtils.downloadJSON(exportData, `EF-Progress-${currentToken}`);
    window.EFUtils.showAlert('Your data has been downloaded! Keep it safe.', 'success');
}
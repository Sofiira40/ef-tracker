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

window.validateClassCode = async function() {
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
};

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

window.toggleReturningStudent = function() {
    const newSection = document.getElementById('newTokenSection');
    const returningSection = document.getElementById('returningTokenSection');
    
    if (newSection.classList.contains('hidden')) {
        newSection.classList.remove('hidden');
        returningSection.classList.add('hidden');
    } else {
        newSection.classList.add('hidden');
        returningSection.classList.remove('hidden');
    }
};

window.startAssessment = async function() {
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
};

// ==========================================
// SHARE WITH TEACHER
// ==========================================

window.shareWithTeacher = function() {
    const studentName = document.getElementById('studentName').value.trim();
    const sessionInfo = window.EFUtils.getFromLocalStorage('current_session');
    
    if (!studentName) {
        window.EFUtils.showAlert('Please enter your name so your teacher knows who this ID belongs to.', 'warning');
        return;
    }
    
    // Create email content
    const subject = encodeURIComponent(`Student ID for ${sessionInfo.name}`);
    const body = encodeURIComponent(`Hello,

My name is ${studentName} and I've completed my Executive Functioning self-assessment.

My anonymous ID is: ${currentToken}
Class Code: ${sessionInfo.code}
Class Name: ${sessionInfo.name}

You can use this ID to track my progress in the teacher dashboard.

Thank you!`);
    
    // Open default email client
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    
    window.EFUtils.showAlert('Email template opened! Send it to your teacher.', 'success');
};

window.copyTokenToClipboard = function() {
    const tokenText = currentToken;
    
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tokenText).then(() => {
            window.EFUtils.showAlert('ID copied to clipboard! You can paste it anywhere.', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(tokenText);
        });
    } else {
        fallbackCopyToClipboard(tokenText);
    }
};

function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        window.EFUtils.showAlert('ID copied to clipboard!', 'success');
    } catch (err) {
        window.EFUtils.showAlert('Could not copy. Please write down your ID: ' + text, 'warning');
    }
    
    document.body.removeChild(textarea);
}

// ==========================================
// SENTENCE STARTERS & GOAL SUGGESTIONS
// ==========================================

window.addSentenceStarter = function(textareaId, starter) {
    const textarea = document.getElementById(textareaId);
    if (textarea.value.trim() === '') {
        textarea.value = starter + ' ';
    }
    textarea.focus();
};

// Generate goal suggestions based on scores
function generateGoalSuggestions() {
    const formData = new FormData(document.getElementById('assessmentForm'));
    
    const scores = {
        task_initiation: parseInt(formData.get('task_initiation')) || 0,
        working_memory: parseInt(formData.get('working_memory')) || 0,
        planning: parseInt(formData.get('planning')) || 0,
        organization: parseInt(formData.get('organization')) || 0,
        time_management: parseInt(formData.get('time_management')) || 0,
        self_monitoring: parseInt(formData.get('self_monitoring')) || 0,
        emotional_regulation: parseInt(formData.get('emotional_regulation')) || 0,
        flexibility: parseInt(formData.get('flexibility')) || 0
    };
    
    const goalSuggestions = {
        task_initiation: [
            "Use the 2-minute rule: if it takes less than 2 minutes, do it right away",
            "Set a timer for 5 minutes and just start - the hardest part is beginning!",
            "Create a 'start ritual' - one small thing you do before starting work"
        ],
        working_memory: [
            "Write down instructions as soon as I hear them",
            "Use sticky notes or a small notebook to track what I need to remember",
            "Repeat important information out loud or to myself"
        ],
        planning: [
            "Break one big task into 3 smaller steps this week",
            "Spend 2 minutes each morning planning my day",
            "Use a checklist for tasks with multiple steps"
        ],
        organization: [
            "Spend 5 minutes organizing my workspace at the end of each day",
            "Create a 'home' for my most-used materials",
            "Use color-coding or labels to stay organized"
        ],
        time_management: [
            "Estimate how long tasks will take before I start them",
            "Use a timer to stay aware of how much time is passing",
            "Build in buffer time - add 5-10 minutes to my estimates"
        ],
        self_monitoring: [
            "Pause halfway through tasks to check my work",
            "Use a checklist to make sure I haven't missed anything",
            "Ask myself 'Does this make sense?' as I work"
        ],
        emotional_regulation: [
            "Take 3 deep breaths when I start feeling frustrated",
            "Take a short break when I notice I'm getting upset",
            "Have a calm-down strategy ready (walk, stretch, count to 10)"
        ],
        flexibility: [
            "Remind myself that changes are okay and I can handle them",
            "Have a 'Plan B' ready when things might change",
            "Practice saying 'That's okay, I can adjust' when plans change"
        ]
    };
    
    // Find lowest 2 scores
    const sortedSkills = Object.entries(scores).sort((a, b) => a[1] - b[1]).slice(0, 2);
    
    const suggestionsDiv = document.getElementById('goalSuggestions');
    suggestionsDiv.innerHTML = '';
    
    sortedSkills.forEach(([skill, score]) => {
        if (score > 0 && score < 4) {
            const suggestions = goalSuggestions[skill];
            suggestions.forEach(suggestion => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline';
                btn.style.cssText = 'font-size: 0.85rem; padding: 6px 12px; margin: 3px;';
                btn.textContent = suggestion;
                btn.onclick = () => window.addSentenceStarter('weekly_goal', suggestion);
                suggestionsDiv.appendChild(btn);
            });
        }
    });
}

// Trigger goal suggestions when ratings change
document.getElementById('assessmentForm')?.addEventListener('change', (e) => {
    if (e.target.type === 'radio') {
        generateGoalSuggestions();
    }
});

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
    
    // Get top 3 strengths and growth areas
    const skillScores = skills.map(skill => ({
        name: window.EFUtils.getSkillName(skill),
        score: data[skill],
        key: skill
    }));
    
    skillScores.sort((a, b) => b.score - a.score);
    const top3Strengths = skillScores.slice(0, 3);
    const top3Growth = skillScores.slice(-3).reverse();
    
    // Display strengths and growth areas
    const strengthsGrowthHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: var(--radius-lg);">
                <h3 style="margin-bottom: 15px;">🌟 Your Top 3 Strengths</h3>
                <ul style="list-style: none; padding: 0;">
                    ${top3Strengths.map((s, i) => `
                        <li style="padding: 8px 0; font-size: 1.1rem;">
                            ${i + 1}. ${s.name} <span style="float: right; font-weight: bold;">${s.score}/5</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 25px; border-radius: var(--radius-lg);">
                <h3 style="margin-bottom: 15px;">🎯 Your Top 3 Growth Areas</h3>
                <ul style="list-style: none; padding: 0;">
                    ${top3Growth.map((s, i) => `
                        <li style="padding: 8px 0; font-size: 1.1rem;">
                            ${i + 1}. ${s.name} <span style="float: right; font-weight: bold;">${s.score}/5</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('strengthsGrowthDisplay').innerHTML = strengthsGrowthHTML;
    
    // Create summary cards
    const summaryHTML = `
        <div class="stat-card">
            <div class="stat-label">Overall Average</div>
            <div class="stat-value" style="color: ${window.EFUtils.getScoreColor(avgScore)}">${avgScore}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Assessments Completed</div>
            <div class="stat-value">${(window.EFUtils.getFromLocalStorage('my_assessments') || []).length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Your Token</div>
            <div class="stat-value" style="font-size: 1.5rem; font-family: monospace;">${currentToken}</div>
        </div>
    `;
    
    document.getElementById('skillsSummary').innerHTML = summaryHTML;
}

// ==========================================
// PROGRESS TRACKING
// ==========================================

window.viewMyProgress = async function() {
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
};

function createProgressChart(assessments) {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;
    
    const chartContext = ctx.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.studentProgressChart) {
        window.studentProgressChart.destroy();
    }
    
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
    
    window.studentProgressChart = new Chart(chartContext, {
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

window.hideProgress = function() {
    document.getElementById('progressDashboard').classList.add('hidden');
    document.getElementById('step-complete').classList.remove('hidden');
};

// ==========================================
// DATA EXPORT
// ==========================================

window.downloadMyData = async function() {
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
};

console.log('✅ Student.js loaded - all functions are globally accessible');
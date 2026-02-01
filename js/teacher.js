// ==========================================
// TEACHER DASHBOARD JAVASCRIPT
// ==========================================

// Global state
let currentUser = null;
let currentClass = null;
let classSkillsChart = null;
let studentTrendsChart = null;

// ==========================================
// AUTHENTICATION
// ==========================================

// Check if already logged in
async function checkAuth() {
    const { data: { session } } = await window.EFUtils.supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
}

async function login() {
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value;
    
    if (!email || !password) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = 'Please enter both email and password';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    const { data, error } = await window.EFUtils.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        return;
    }
    
    currentUser = data.user;
    showDashboard();
}

async function signup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password) {
        const errorDiv = document.getElementById('signupError');
        errorDiv.textContent = 'Please enter both email and password';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (password.length < 6) {
        const errorDiv = document.getElementById('signupError');
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    const { data, error } = await window.EFUtils.supabaseClient.auth.signUp({
        email: email,
        password: password
    });
    
    if (error) {
        const errorDiv = document.getElementById('signupError');
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        return;
    }
    
    window.EFUtils.showAlert('Account created! Please check your email to confirm.', 'success');
    showLogin();
}

function showSignup() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('signupSection').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('signupSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
}

async function logout() {
    await window.EFUtils.supabaseClient.auth.signOut();
    currentUser = null;
    currentClass = null;
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
}

// ==========================================
// DASHBOARD DISPLAY
// ==========================================

async function showDashboard() {
    // Hide login/signup sections
    const loginSection = document.getElementById('loginSection');
    const signupSection = document.getElementById('signupSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.classList.add('hidden');
    if (signupSection) signupSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    
    loadClasses();
}

async function loadClasses() {
    const { data, error } = await window.EFUtils.supabaseClient
        .from('class_sessions')
        .select('*')
        .eq('teacher_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading classes:', error);
        window.EFUtils.showAlert('Error loading your classes', 'danger');
        return;
    }
    
    const classList = document.getElementById('classList');
    
    // Check if element exists
    if (!classList) {
        console.error('classList element not found');
        return;
    }
    
    if (!data || data.length === 0) {
        classList.innerHTML = `
            <div class="portal-card" style="grid-column: 1 / -1; text-align: center;">
                <h3>No classes yet!</h3>
                <p>Create your first class to start tracking student progress.</p>
                <button class="btn btn-primary" onclick="showCreateClassModal()">Create First Class</button>
            </div>
        `;
        return;
    }
    
    classList.innerHTML = data.map(cls => `
        <div class="portal-card">
            <h3>${cls.class_name}</h3>
            <p>Code: <strong>${cls.class_code}</strong></p>
            <button class="btn btn-outline" style="margin: 5px 0;" onclick="copyClassCode('${cls.class_code}', event)">📋 Copy Code</button>
            <p>Grade ${cls.grade_level || 'N/A'}</p>
            <p style="color: var(--text-light); font-size: 0.9rem;">
                Created: ${new Date(cls.created_date).toLocaleDateString()}
            </p>
            <button class="btn btn-primary" onclick="selectClass('${cls.id}')">View Dashboard</button>
        </div>
    `).join('');
}

// ==========================================
// CLASS MANAGEMENT
// ==========================================

function showCreateClassModal() {
    document.getElementById('createClassModal').classList.add('active');
}

function closeCreateClassModal() {
    document.getElementById('createClassModal').classList.remove('active');
}

async function createClass() {
    const className = document.getElementById('newClassName').value;
    const gradeLevel = document.getElementById('newClassGrade').value;
    
    if (!className) {
        window.EFUtils.showAlert('Please enter a class name', 'danger');
        return;
    }
    
    // Generate unique class code
    const classCode = `${className.substring(0, 4).toUpperCase()}-${window.EFUtils.generateToken()}`;
    
    const { data, error } = await window.EFUtils.supabaseClient
        .from('class_sessions')
        .insert({
            teacher_id: currentUser.id,
            class_code: classCode,
            class_name: className,
            grade_level: gradeLevel
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating class:', error);
        window.EFUtils.showAlert('Error creating class. Please try again.', 'danger');
        return;
    }
    
    window.EFUtils.showAlert(`Class created! Share code "${classCode}" with your students.`, 'success');
    closeCreateClassModal();
    
    // Clear form
    document.getElementById('newClassName').value = '';
    document.getElementById('newClassGrade').value = '';
    
    loadClasses();
}

// ==========================================
// CLASS VIEW
// ==========================================

async function selectClass(classId) {
    currentClass = classId;
    
    // Get class info
    const { data: classData } = await window.EFUtils.supabaseClient
        .from('class_sessions')
        .select('*')
        .eq('id', classId)
        .single();
    
    if (!classData) return;
    
    // Hide class list, show class view
    const classListParent = document.getElementById('classList').parentElement;
    classListParent.style.display = 'none';
    document.getElementById('classView').classList.remove('hidden');
    
    // Update header
    document.getElementById('className').textContent = classData.class_name;
    document.getElementById('classCode').textContent = classData.class_code;
    
    // Load class data
    await loadClassAnalytics(classId);
}

function backToClasses() {
    document.getElementById('classView').classList.add('hidden');
    const classListParent = document.getElementById('classList').parentElement;
    classListParent.style.display = 'block';
    currentClass = null;
    
    // Destroy charts
    if (classSkillsChart) {
        classSkillsChart.destroy();
        classSkillsChart = null;
    }
    if (studentTrendsChart) {
        studentTrendsChart.destroy();
        studentTrendsChart = null;
    }
}

async function loadClassAnalytics(classId) {
    // Get all student tokens for this class
    const { data: tokens } = await window.EFUtils.supabaseClient
        .from('student_tokens')
        .select('id, token')
        .eq('session_id', classId);
    
    if (!tokens || tokens.length === 0) {
        document.getElementById('studentCount').textContent = '0';
        document.getElementById('classStats').innerHTML = '<p>No student data yet for this class. Students will appear here once they complete their first assessment.</p>';
        return;
    }
    
    document.getElementById('studentCount').textContent = tokens.length;
    
    const tokenIds = tokens.map(t => t.id);
    
    // Get all assessments for these tokens
    const { data: assessments } = await window.EFUtils.supabaseClient
        .from('ef_assessments')
        .select('*')
        .in('token_id', tokenIds)
        .order('assessment_date', { ascending: true });
    
    if (!assessments || assessments.length === 0) {
        document.getElementById('classStats').innerHTML = '<p>No assessments completed yet. Encourage students to complete their first self-assessment!</p>';
        return;
    }
    
    // Calculate stats
    displayClassStats(assessments);
    displayClassSkillsChart(assessments);
    displayStudentTrends(assessments, tokens);
    displayReflections(assessments, tokens);
    loadClassGoals();
}

// ==========================================
// CLASS ANALYTICS
// ==========================================

function displayClassStats(assessments) {
    const skills = ['task_initiation', 'working_memory', 'planning', 'organization',
                    'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
    
    // Calculate class averages
    const allScores = [];
    skills.forEach(skill => {
        assessments.forEach(a => {
            if (a[skill]) allScores.push(a[skill]);
        });
    });
    
    const classAvg = window.EFUtils.calculateAverage(allScores);
    
    // Find most improved skill
    const firstWeek = assessments.slice(0, Math.min(5, assessments.length));
    const lastWeek = assessments.slice(-Math.min(5, assessments.length));
    
    let maxImprovement = 0;
    let mostImprovedSkill = '';
    
    skills.forEach(skill => {
        const firstAvg = window.EFUtils.calculateAverage(firstWeek.map(a => a[skill]));
        const lastAvg = window.EFUtils.calculateAverage(lastWeek.map(a => a[skill]));
        const improvement = lastAvg - firstAvg;
        
        if (improvement > maxImprovement) {
            maxImprovement = improvement;
            mostImprovedSkill = window.EFUtils.getSkillName(skill);
        }
    });
    
    const uniqueStudents = new Set(assessments.map(a => a.token_id)).size;
    const participationRate = Math.round((uniqueStudents / document.getElementById('studentCount').textContent) * 100);
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">Class Average</div>
            <div class="stat-value" style="color: ${window.EFUtils.getScoreColor(classAvg)}">${classAvg}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Assessments</div>
            <div class="stat-value">${assessments.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Most Improved</div>
            <div class="stat-value" style="font-size: 1.3rem;">${mostImprovedSkill || 'N/A'}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Participation</div>
            <div class="stat-value">${participationRate}%</div>
        </div>
    `;
    
    document.getElementById('classStats').innerHTML = statsHTML;
}

function displayClassSkillsChart(assessments) {
    const canvas = document.getElementById('classSkillsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (classSkillsChart) {
        classSkillsChart.destroy();
    }
    
    const skills = ['task_initiation', 'working_memory', 'planning', 'organization',
                    'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
    
    const averages = skills.map(skill => {
        const scores = assessments.map(a => a[skill]).filter(s => s);
        return window.EFUtils.calculateAverage(scores);
    });
    
    classSkillsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: skills.map(s => window.EFUtils.getSkillName(s)),
            datasets: [{
                label: 'Class Average',
                data: averages,
                backgroundColor: averages.map(score => window.EFUtils.getScoreColor(score) + '80'),
                borderColor: averages.map(score => window.EFUtils.getScoreColor(score)),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

function displayStudentTrends(assessments, tokens) {
    const canvas = document.getElementById('studentTrendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (studentTrendsChart) {
        studentTrendsChart.destroy();
    }
    
    // Group by token
    const datasets = tokens.slice(0, 5).map((token, index) => {
        const tokenAssessments = assessments.filter(a => a.token_id === token.id);
        const dates = tokenAssessments.map(a => a.assessment_date);
        const avgScores = tokenAssessments.map(a => {
            const skills = ['task_initiation', 'working_memory', 'planning', 'organization',
                            'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
            const scores = skills.map(skill => a[skill]);
            return parseFloat(window.EFUtils.calculateAverage(scores));
        });
        
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        
        return {
            label: `Student ${token.token}`,
            data: avgScores,
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            tension: 0.4
        };
    });
    
    const allDates = [...new Set(assessments.map(a => a.assessment_date))].sort();
    
    studentTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

function displayReflections(assessments, tokens) {
    const recent = assessments.slice(-10).reverse();
    
    const tbody = document.querySelector('#reflectionsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = recent.map(a => {
        const token = tokens.find(t => t.id === a.token_id);
        return `
            <tr>
                <td>${token ? token.token : 'Unknown'}</td>
                <td>${new Date(a.assessment_date).toLocaleDateString()}</td>
                <td>${a.what_went_well || '-'}</td>
                <td>${a.what_was_challenging || '-'}</td>
                <td>${a.support_needed || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// CLASS GOALS
// ==========================================

function showAddGoalModal() {
    document.getElementById('addGoalModal').classList.add('active');
}

function closeAddGoalModal() {
    document.getElementById('addGoalModal').classList.remove('active');
}

async function addClassGoal() {
    const goalText = document.getElementById('goalText').value;
    const focusSkill = document.getElementById('goalSkill').value;
    const targetDate = document.getElementById('goalDate').value;
    
    if (!goalText) {
        window.EFUtils.showAlert('Please enter a goal', 'danger');
        return;
    }
    
    const { error } = await window.EFUtils.supabaseClient
        .from('class_goals')
        .insert({
            session_id: currentClass,
            goal_text: goalText,
            focus_skill: focusSkill || null,
            target_date: targetDate || null,
            created_by_teacher: currentUser.id
        });
    
    if (error) {
        console.error('Error adding goal:', error);
        window.EFUtils.showAlert('Error adding goal', 'danger');
        return;
    }
    
    window.EFUtils.showAlert('Goal added!', 'success');
    closeAddGoalModal();
    
    // Clear form
    document.getElementById('goalText').value = '';
    document.getElementById('goalSkill').value = '';
    document.getElementById('goalDate').value = '';
    
    loadClassGoals();
}

async function loadClassGoals() {
    const { data } = await window.EFUtils.supabaseClient
        .from('class_goals')
        .select('*')
        .eq('session_id', currentClass)
        .order('created_at', { ascending: false });
    
    const goalsDiv = document.getElementById('classGoalsList');
    if (!goalsDiv) return;
    
    if (!data || data.length === 0) {
        goalsDiv.innerHTML = '<p style="color: var(--text-light); margin-top: 20px;">No class goals yet.</p>';
        return;
    }
    
    goalsDiv.innerHTML = data.map(goal => `
        <div class="alert ${goal.achieved ? 'alert-success' : 'alert-info'}" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${goal.goal_text}</strong>
                ${goal.focus_skill ? `<p style="margin: 5px 0;">Focus: ${window.EFUtils.getSkillName(goal.focus_skill)}</p>` : ''}
                ${goal.target_date ? `<p style="margin: 5px 0;">Target: ${new Date(goal.target_date).toLocaleDateString()}</p>` : ''}
            </div>
            <button class="btn ${goal.achieved ? 'btn-outline' : 'btn-secondary'}" 
                    onclick="toggleGoal('${goal.id}', ${!goal.achieved})">
                ${goal.achieved ? '✓ Achieved' : 'Mark Complete'}
            </button>
        </div>
    `).join('');
}

async function toggleGoal(goalId, achieved) {
    await window.EFUtils.supabaseClient
        .from('class_goals')
        .update({ achieved: achieved })
        .eq('id', goalId);
    
    loadClassGoals();
}

// ==========================================
// DATA EXPORT
// ==========================================

async function exportClassData() {
    // Get all tokens and assessments
    const { data: tokens } = await window.EFUtils.supabaseClient
        .from('student_tokens')
        .select('id, token')
        .eq('session_id', currentClass);
    
    if (!tokens || tokens.length === 0) {
        window.EFUtils.showAlert('No student data to export', 'warning');
        return;
    }
    
    const tokenIds = tokens.map(t => t.id);
    
    const { data: assessments } = await window.EFUtils.supabaseClient
        .from('ef_assessments')
        .select('*')
        .in('token_id', tokenIds);
    
    if (!assessments || assessments.length === 0) {
        window.EFUtils.showAlert('No assessments to export', 'warning');
        return;
    }
    
    // Prepare CSV data
    const csvData = assessments.map(a => {
        const token = tokens.find(t => t.id === a.token_id);
        return {
            'Student_Token': token.token,
            'Date': a.assessment_date,
            'Task_Initiation': a.task_initiation,
            'Working_Memory': a.working_memory,
            'Planning': a.planning,
            'Organization': a.organization,
            'Time_Management': a.time_management,
            'Self_Monitoring': a.self_monitoring,
            'Emotional_Regulation': a.emotional_regulation,
            'Flexibility': a.flexibility,
            'What_Went_Well': a.what_went_well,
            'Challenges': a.what_was_challenging,
            'Support_Needed': a.support_needed,
            'Weekly_Goal': a.weekly_goal,
            'Goal_Progress': a.goal_progress
        };
    });
    
    const headers = Object.keys(csvData[0]);
    window.EFUtils.downloadCSV(csvData, 'Class-Report', headers);
    window.EFUtils.showAlert('Class report downloaded!', 'success');
}

// ==========================================
// COPY CLASS CODE
// ==========================================

function copyClassCode(code, event) {
    // Prevent card click from firing
    event.stopPropagation();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            window.EFUtils.showAlert(`Class code "${code}" copied to clipboard!`, 'success');
        }).catch(() => {
            fallbackCopyCode(code);
        });
    } else {
        fallbackCopyCode(code);
    }
}

function fallbackCopyCode(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        window.EFUtils.showAlert(`Class code "${text}" copied!`, 'success');
    } catch (err) {
        window.EFUtils.showAlert(`Copy failed. Code is: ${text}`, 'warning');
    }
    
    document.body.removeChild(textarea);
}



// ==========================================
// MAKE FUNCTIONS GLOBALLY ACCESSIBLE  
// ==========================================
window.showCreateClassModal = showCreateClassModal;
window.closeCreateClassModal = closeCreateClassModal;
window.createClass = createClass;
window.selectClass = selectClass;
window.backToClasses = backToClasses;
window.showAddGoalModal = showAddGoalModal;
window.closeAddGoalModal = closeAddGoalModal;
window.addClassGoal = addClassGoal;
window.toggleGoal = toggleGoal;
window.exportClassData = exportClassData;
window.copyClassCode = copyClassCode;
window.logout = logout;
window.showSignup = showSignup;
window.showLogin = showLogin;
window.login = login;
window.signup = signup;

// Initialize on page load
checkAuth();
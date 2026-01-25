// ==========================================
// TEACHER DASHBOARD JAVASCRIPT
// ==========================================

const { supabaseClient, generateToken, formatDate, showAlert, downloadCSV, 
        getSkillName, getScoreColor, calculateAverage, showLoading } = window.EFUtils;

// Global state
let currentUser = null;
let currentClass = null;

// ==========================================
// AUTHENTICATION
// ==========================================

// Check if already logged in
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
}

async function login() {
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
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
    
    if (password.length < 6) {
        const errorDiv = document.getElementById('signupError');
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });
    
    if (error) {
        const errorDiv = document.getElementById('signupError');
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        return;
    }
    
    showAlert('Account created! Please check your email to confirm.', 'success');
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
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentClass = null;
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
}

// ==========================================
// DASHBOARD DISPLAY
// ==========================================

async function showDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('signupSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    
    loadClasses();
}

async function loadClasses() {
    const { data, error } = await supabaseClient
        .from('class_sessions')
        .select('*')
        .eq('teacher_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading classes:', error);
        showAlert('Error loading your classes', 'danger');
        return;
    }
    
    const classList = document.getElementById('classList');
    
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
        <div class="portal-card" onclick="selectClass('${cls.id}')">
            <h3>${cls.class_name}</h3>
            <p>Code: <strong>${cls.class_code}</strong></p>
            <p>Grade ${cls.grade_level || 'N/A'}</p>
            <p style="color: var(--text-light); font-size: 0.9rem;">
                Created: ${new Date(cls.created_date).toLocaleDateString()}
            </p>
            <span class="btn btn-outline" style="pointer-events: none;">View Dashboard</span>
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
        showAlert('Please enter a class name', 'danger');
        return;
    }
    
    // Generate unique class code
    const classCode = `${className.substring(0, 4).toUpperCase()}-${generateToken()}`;
    
    const { data, error } = await supabaseClient
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
        showAlert('Error creating class. Please try again.', 'danger');
        return;
    }
    
    showAlert(`Class created! Share code "${classCode}" with your students.`, 'success');
    closeCreateClassModal();
    loadClasses();
}

// ==========================================
// CLASS VIEW
// ==========================================

async function selectClass(classId) {
    currentClass = classId;
    
    // Get class info
    const { data: classData } = await supabaseClient
        .from('class_sessions')
        .select('*')
        .eq('id', classId)
        .single();
    
    if (!classData) return;
    
    // Hide class list, show class view
    document.getElementById('classList').parentElement.classList.add('hidden');
    document.getElementById('classView').classList.remove('hidden');
    
    // Update header
    document.getElementById('className').textContent = classData.class_name;
    document.getElementById('classCode').textContent = classData.class_code;
    
    // Load class data
    await loadClassAnalytics(classId);
}

function backToClasses() {
    document.getElementById('classView').classList.add('hidden');
    document.getElementById('classList').parentElement.classList.remove('hidden');
    currentClass = null;
}

async function loadClassAnalytics(classId) {
    // Get all student tokens for this class
    const { data: tokens } = await supabaseClient
        .from('student_tokens')
        .select('id, token')
        .eq('session_id', classId);
    
    if (!tokens || tokens.length === 0) {
        document.getElementById('studentCount').textContent = '0';
        showAlert('No student data yet for this class', 'info');
        return;
    }
    
    document.getElementById('studentCount').textContent = tokens.length;
    
    const tokenIds = tokens.map(t => t.id);
    
    // Get all assessments for these tokens
    const { data: assessments } = await supabaseClient
        .from('ef_assessments')
        .select('*')
        .in('token_id', tokenIds)
        .order('assessment_date', { ascending: true });
    
    if (!assessments || assessments.length === 0) {
        showAlert('No assessments completed yet', 'info');
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
    
    const classAvg = calculateAverage(allScores);
    
    // Find most improved skill
    const firstWeek = assessments.slice(0, Math.min(5, assessments.length));
    const lastWeek = assessments.slice(-Math.min(5, assessments.length));
    
    let maxImprovement = 0;
    let mostImprovedSkill = '';
    
    skills.forEach(skill => {
        const firstAvg = calculateAverage(firstWeek.map(a => a[skill]));
        const lastAvg = calculateAverage(lastWeek.map(a => a[skill]));
        const improvement = lastAvg - firstAvg;
        
        if (improvement > maxImprovement) {
            maxImprovement = improvement;
            mostImprovedSkill = getSkillName(skill);
        }
    });
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">Class Average</div>
            <div class="stat-value" style="color: ${getScoreColor(classAvg)}">${classAvg}</div>
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
            <div class="stat-label">Participation Rate</div>
            <div class="stat-value">${Math.round((assessments.length / document.getElementById('studentCount').textContent) * 100)}%</div>
        </div>
    `;
    
    document.getElementById('classStats').innerHTML = statsHTML;
}

function displayClassSkillsChart(assessments) {
    const ctx = document.getElementById('classSkillsChart').getContext('2d');
    
    const skills = ['task_initiation', 'working_memory', 'planning', 'organization',
                    'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
    
    const averages = skills.map(skill => {
        const scores = assessments.map(a => a[skill]).filter(s => s);
        return calculateAverage(scores);
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: skills.map(s => getSkillName(s)),
            datasets: [{
                label: 'Class Average',
                data: averages,
                backgroundColor: averages.map(score => getScoreColor(score) + '80'),
                borderColor: averages.map(score => getScoreColor(score)),
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
    const ctx = document.getElementById('studentTrendsChart').getContext('2d');
    
    // Group by token
    const datasets = tokens.slice(0, 5).map((token, index) => {
        const tokenAssessments = assessments.filter(a => a.token_id === token.id);
        const avgScores = tokenAssessments.map(a => {
            const skills = ['task_initiation', 'working_memory', 'planning', 'organization',
                            'time_management', 'self_monitoring', 'emotional_regulation', 'flexibility'];
            const scores = skills.map(skill => a[skill]);
            return parseFloat(calculateAverage(scores));
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
    
    const dates = [...new Set(assessments.map(a => a.assessment_date))].sort();
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
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
        showAlert('Please enter a goal', 'danger');
        return;
    }
    
    const { error } = await supabaseClient
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
        showAlert('Error adding goal', 'danger');
        return;
    }
    
    showAlert('Goal added!', 'success');
    closeAddGoalModal();
    loadClassGoals();
}

async function loadClassGoals() {
    const { data } = await supabaseClient
        .from('class_goals')
        .select('*')
        .eq('session_id', currentClass)
        .order('created_at', { ascending: false });
    
    const goalsDiv = document.getElementById('classGoalsList');
    
    if (!data || data.length === 0) {
        goalsDiv.innerHTML = '<p style="color: var(--text-light); margin-top: 20px;">No class goals yet.</p>';
        return;
    }
    
    goalsDiv.innerHTML = data.map(goal => `
        <div class="alert ${goal.achieved ? 'alert-success' : 'alert-info'}" style="margin-top: 15px;">
            <div>
                <strong>${goal.goal_text}</strong>
                ${goal.focus_skill ? `<p style="margin: 5px 0;">Focus: ${getSkillName(goal.focus_skill)}</p>` : ''}
                ${goal.target_date ? `<p style="margin: 5px 0;">Target: ${new Date(goal.target_date).toLocaleDateString()}</p>` : ''}
            </div>
            <button class="btn ${goal.achieved ? 'btn-outline' : 'btn-secondary'}" 
                    onclick="toggleGoal('${goal.id}', ${!goal.achieved})" 
                    style="margin-left: auto;">
                ${goal.achieved ? '✓ Achieved' : 'Mark Complete'}
            </button>
        </div>
    `).join('');
}

async function toggleGoal(goalId, achieved) {
    await supabaseClient
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
    const { data: tokens } = await supabaseClient
        .from('student_tokens')
        .select('id, token')
        .eq('session_id', currentClass);
    
    const tokenIds = tokens.map(t => t.id);
    
    const { data: assessments } = await supabaseClient
        .from('ef_assessments')
        .select('*')
        .in('token_id', tokenIds);
    
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
    downloadCSV(csvData, 'Class-Report', headers);
    showAlert('Class report downloaded!', 'success');
}

// Initialize on page load
checkAuth();
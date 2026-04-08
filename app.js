let subjects = [];
let totalXP = 0;
let streak = 0;
let currentUser = null;
let subjectChartInstance = null;
let xpChartInstance = null;
let ringChartInstance = null;

window.onload = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

async function showApp() {
    // 1. First, check if the app elements exist to avoid errors
    const auth = document.getElementById('authScreen');
    const main = document.getElementById('mainApp');

    try {
        // 2. Try to get the data FIRST
        await loadFromSupabase(); 
        
        // 3. ONLY if the data loads, show the app
        auth.style.display = 'none';
        main.style.display = 'block';

        // 4. Run your charts and stats
        updateStats();
        renderSubjects();
    } catch (error) {
        // 5. If it fails, don't freeze! Tell us what's wrong.
        console.error("Database Error:", error);
        alert("Failed to load data. Please check your internet.");
    }
}
    updateStats();
    renderSubjects();
    updateXPBar();
    checkStreak();
    renderRingChart();
    updateAvatar();
}

function updateAvatar() {
    if (!currentUser) return;
    const seed = currentUser.email;
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    document.getElementById('headerAvatar').src = avatarUrl;
    document.getElementById('profileAvatar').src = avatarUrl;
}

function switchTab(tab) {
    if (tab === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('signupTab').classList.remove('active');
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('signupTab').classList.add('active');
    }
    document.getElementById('authMessage').textContent = '';
}

function switchMainTab(tab) {
    document.getElementById('dashboardTab').style.display = 'none';
    document.getElementById('subjectsTab').style.display = 'none';
    document.getElementById('chartsTab').style.display = 'none';
    document.getElementById('leaderboardTab').style.display = 'none';
    document.getElementById('templatesTab').style.display = 'none';
    document.getElementById('profileTab').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    if (tab === 'dashboard') {
        document.getElementById('dashboardTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        renderRingChart();
    } else if (tab === 'subjects') {
        document.getElementById('subjectsTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    } else if (tab === 'charts') {
        document.getElementById('chartsTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        renderCharts();
    } else if (tab === 'leaderboard') {
        document.getElementById('leaderboardTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[3].classList.add('active');
        renderLeaderboard();
    } else if (tab === 'templates') {
        document.getElementById('templatesTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[4].classList.add('active');
    } else if (tab === 'profile') {
        document.getElementById('profileTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[5].classList.add('active');
        renderProfile();
    }
}

async function updateLeaderboard() {
    if (!currentUser) return;
    const name = currentUser.user_metadata?.full_name || 'Hunter';
    const level = Math.floor(totalXP / 100) + 1;
    try {
        await supabaseClient
            .from('leaderboard')
            .upsert({
                user_id: currentUser.id,
                username: name,
                xp: totalXP,
                level: level,
                streak: streak,
                updated_at: new Date().toISOString()
            });
    } catch(err) {
        console.log('Leaderboard error:', err);
    }
}

async function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">Loading...</div></div>';
    try {
        const { data, error } = await supabaseClient
            .from('leaderboard')
            .select('*')
            .order('xp', { ascending: false })
            .limit(20);
        if (error || !data || data.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-text">No hunters yet!<br>Be the first on the board!</div></div>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        list.innerHTML = data.map((user, index) => {
            const isMe = user.user_id === currentUser.id;
            const medal = medals[index] || `#${index + 1}`;
            const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            return `
                <div class="leaderboard-item ${isMe ? 'leaderboard-me' : ''}">
                    <span class="leaderboard-rank">${medal}</span>
                    <img src="${avatarUrl}" class="leaderboard-avatar"/>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${user.username} ${isMe ? '(You)' : ''}</div>
                        <div class="leaderboard-stats">LVL ${user.level} · ${user.streak}🔥</div>
                    </div>
                    <div class="leaderboard-xp">
                        <span class="leaderboard-xp-number">${user.xp}</span>
                        <span class="leaderboard-xp-label">XP</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch(err) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-text">Error loading</div></div>';
    }
}

function renderProfile() {
    if (!currentUser) return;
    const name = currentUser.user_metadata?.full_name || 'Hunter';
    const level = Math.floor(totalXP / 100) + 1;
    const xpInLevel = totalXP % 100;
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileLevel').textContent = `⚡ LVL ${level} Hunter`;
    const totalSubjects = subjects.length;
    const totalTopics = subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = subjects.reduce((sum, s) => sum + s.topics.filter(t => t.completed).length, 0);
    document.getElementById('profileSubjects').textContent = totalSubjects;
    document.getElementById('profileTopics').textContent = totalTopics;
    document.getElementById('profileCompleted').textContent = completedTopics;
    document.getElementById('profileStreak').textContent = streak + '🔥';
    document.getElementById('profileXPFill').style.width = xpInLevel + '%';
    document.getElementById('profileXPText').textContent = `${xpInLevel} / 100 XP`;
    document.getElementById('profileNextLevel').textContent = `Next: LVL ${level + 1}`;
    renderAchievements(completedTopics, totalSubjects, streak);
}

function renderAchievements(completedTopics, totalSubjects, streak) {
    const achievements = [
        { icon: '🌟', name: 'First Step', desc: 'Complete your first topic', unlocked: completedTopics >= 1 },
        { icon: '📚', name: 'Scholar', desc: 'Add 3 subjects', unlocked: totalSubjects >= 3 },
        { icon: '⚡', name: 'Power User', desc: 'Complete 10 topics', unlocked: completedTopics >= 10 },
        { icon: '🔥', name: 'On Fire', desc: 'Maintain 3 day streak', unlocked: streak >= 3 },
        { icon: '💎', name: 'Diamond', desc: 'Complete 50 topics', unlocked: completedTopics >= 50 },
        { icon: '👑', name: 'Champion', desc: 'Reach LVL 5', unlocked: totalXP >= 400 }
    ];
    document.getElementById('achievementsList').innerHTML = achievements.map(a => `
        <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${a.icon}</span>
            <div class="achievement-info">
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
            <span>${a.unlocked ? '✅' : '🔒'}</span>
        </div>
    `).join('');
}

async function signupUser() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const msg = document.getElementById('authMessage');
    if (!name || !email || !password) { msg.textContent = 'Please fill all fields'; return; }
    if (password.length < 6) { msg.textContent = 'Password must be at least 6 characters'; return; }
    msg.textContent = 'Creating account...';
    const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
    });
    if (error) { msg.textContent = error.message; }
    else { msg.textContent = '✅ Account created! You can now login.'; }
}

async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const msg = document.getElementById('authMessage');
    if (!email || !password) { msg.textContent = 'Please fill all fields'; return; }
    msg.textContent = 'Logging in...';
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { msg.textContent = error.message; }
    else { currentUser = data.user; showApp(); }
}

async function logoutUser() {
    await saveToSupabase();
    await supabaseClient.auth.signOut();
    currentUser = null;
    subjects = [];
    totalXP = 0;
    streak = 0;
    showAuth();
}

async function saveToSupabase() {
    if (!currentUser) return;
    try {
        const userData = { subjects, totalXP, streak };
        const { error } = await supabaseClient
            .from('subjects')
            .upsert({ user_id: currentUser.id, data: JSON.stringify(userData) });
        if (error) alert('Save error: ' + error.message);
        else await updateLeaderboard();
    } catch(err) {
        alert('Error: ' + err.message);
    }
}

async function loadFromSupabase() {
    if (!currentUser) return;
    try {
        const { data } = await supabaseClient
            .from('subjects')
            .select('data')
            .eq('user_id', currentUser.id)
            .single();
        if (data?.data) {
            const userData = JSON.parse(data.data);
            subjects = userData.subjects || [];
            totalXP = userData.totalXP || 0;
            streak = userData.streak || 0;
        }
    } catch(err) {
        subjects = []; totalXP = 0; streak = 0;
    }
}

function addSubject() {
    const input = document.getElementById('subjectInput');
    const name = input.value.trim();
    if (!name) { alert('Please enter a subject name'); return; }
    subjects.push({ id: Date.now(), name, topics: [], createdAt: new Date().toISOString() });
    saveToSupabase();
    renderSubjects();
    updateStats();
    input.value = '';
}

function addTopic(subjectId) {
    const input = document.getElementById('topicInput-' + subjectId);
    const name = input.value.trim();
    if (!name) { alert('Please enter a topic name'); return; }
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
        subject.topics.push({ id: Date.now(), name, completed: false });
        saveToSupabase();
        renderSubjects();
        updateStats();
        input.value = '';
    }
}

function toggleTopic(subjectId, topicId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
        const topic = subject.topics.find(t => t.id === topicId);
        if (topic) {
            topic.completed = !topic.completed;
            if (topic.completed) { totalXP += 10; showXPPopup('+10 XP'); }
            else { totalXP = Math.max(0, totalXP - 10); }
            saveToSupabase();
            renderSubjects();
            updateStats();
            updateXPBar();
            renderRingChart();
        }
    }
}

function deleteSubject(subjectId) {
    if (confirm('Delete this subject?')) {
        subjects = subjects.filter(s => s.id !== subjectId);
        saveToSupabase();
        renderSubjects();
        updateStats();
        renderRingChart();
    }
}

function toggleSubject(subjectId) {
    const container = document.getElementById('topics-' + subjectId);
    container.classList.toggle('open');
}

function renderSubjects() {
    const list = document.getElementById('subjectsList');
    if (subjects.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <div class="empty-state-text">No subjects yet.<br>Add your first subject above!</div>
            </div>`;
        return;
    }
    list.innerHTML = subjects.map(subject => {
        const total = subject.topics.length;
        const completed = subject.topics.filter(t => t.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return `
            <div class="subject-card">
                <div class="subject-header" onclick="toggleSubject(${subject.id})">
                    <div>
                        <div class="subject-name">📖 ${subject.name}</div>
                        <div class="subject-progress">${completed}/${total} topics · ${percent}%</div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <button class="btn-secondary" onclick="event.stopPropagation();deleteSubject(${subject.id})">🗑️</button>
                        <span style="color:#7c3aed">▼</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${percent}%"></div>
                </div>
                <div class="topics-container" id="topics-${subject.id}">
                    <div class="add-topic-row">
                        <input type="text" id="topicInput-${subject.id}" placeholder="Add topic..." class="input"/>
                        <button onclick="addTopic(${subject.id})" class="btn-primary">Add</button>
                    </div>
                    ${subject.topics.length === 0 ?
                        '<p style="color:#444;font-size:13px;text-align:center;padding:10px">No topics yet!</p>'
                        :
                        subject.topics.map(topic => `
                            <div class="topic-item">
                                <input type="checkbox" class="topic-checkbox"
                                    ${topic.completed ? 'checked' : ''}
                                    onchange="toggleTopic(${subject.id}, ${topic.id})"/>
                                <span class="topic-name ${topic.completed ? 'completed' : ''}">${topic.name}</span>
                                <span class="topic-xp">+10 XP</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>`;
    }).join('');
}

function updateStats() {
    const totalSubjects = subjects.length;
    const totalTopics = subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = subjects.reduce((sum, s) => sum + s.topics.filter(t => t.completed).length, 0);
    document.getElementById('totalSubjects').textContent = totalSubjects;
    document.getElementById('totalTopics').textContent = totalTopics;
    document.getElementById('completedTopics').textContent = completedTopics;
    document.getElementById('totalXP').textContent = totalXP;
    document.getElementById('streakCount').textContent = streak + '🔥';
    document.getElementById('levelBadge').textContent = 'LVL ' + (Math.floor(totalXP / 100) + 1);
}

function updateXPBar() {
    document.getElementById('xpFill').style.width = (totalXP % 100) + '%';
}

function showXPPopup(text) {
    const popup = document.createElement('div');
    popup.textContent = text;
    popup.style.cssText = `
        position:fixed;top:80px;right:20px;
        background:linear-gradient(135deg,#7c3aed,#a855f7);
        color:white;padding:8px 16px;border-radius:20px;
        font-weight:700;font-size:14px;z-index:999;
        box-shadow:0 0 20px rgba(124,58,237,0.6);`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

function renderRingChart() {
    const totalTopics = subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = subjects.reduce((sum, s) => sum + s.topics.filter(t => t.completed).length, 0);
    const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    document.getElementById('overallPercent').textContent = percent + '%';
    const ctx = document.getElementById('overallRing').getContext('2d');
    if (ringChartInstance) ringChartInstance.destroy();
    ringChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{ data: [percent, 100 - percent], backgroundColor: ['#7c3aed', '#1a1a2e'], borderWidth: 0 }]
        },
        options: { cutout: '75%', plugins: { legend: { display: false } } }
    });
}

function renderCharts() {
    if (subjects.length === 0) return;
    const ctx1 = document.getElementById('subjectChart').getContext('2d');
    if (subjectChartInstance) subjectChartInstance.destroy();
    subjectChartInstance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: subjects.map(s => s.name),
            datasets: [{
                data: subjects.map(s => {
                    const total = s.topics.length;
                    const done = s.topics.filter(t => t.completed).length;
                    return total > 0 ? Math.round((done / total) * 100) : 0;
                }),
                backgroundColor: 'rgba(124,58,237,0.7)',
                borderColor: '#a855f7',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: '#666' }, grid: { color: '#1a1a2e' } },
                x: { ticks: { color: '#666' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const ctx2 = document.getElementById('xpChart').getContext('2d');
    if (xpChartInstance) xpChartInstance.destroy();
    const xpInLevel = totalXP % 100;
    xpChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Current XP', 'Next Level'],
            datasets: [{
                data: [xpInLevel, 100 - xpInLevel],
                backgroundColor: ['rgba(124,58,237,0.8)', 'rgba(45,45,68,0.8)'],
                borderColor: ['#a855f7', '#2d2d44'],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: '#666' }, grid: { color: '#1a1a2e' } },
                x: { ticks: { color: '#666' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function checkStreak() {
    if (!currentUser) return;
    const lastStudy = localStorage.getItem('lastSt

let subjects = [];
let totalXP = 0;
let streak = 0;
let currentUser = null;

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
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    await loadFromSupabase();
    updateStats();
    renderSubjects();
    updateXPBar();
    checkStreak();
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

async function signupUser() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const msg = document.getElementById('authMessage');
    if (!name || !email || !password) {
        msg.textContent = 'Please fill all fields';
        return;
    }
    if (password.length < 6) {
        msg.textContent = 'Password must be at least 6 characters';
        return;
    }
    msg.textContent = 'Creating account...';
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: name } }
    });
    if (error) {
        msg.textContent = error.message;
    } else {
        msg.textContent = '✅ Account created! You can now login.';
    }
}

async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const msg = document.getElementById('authMessage');
    if (!email || !password) {
        msg.textContent = 'Please fill all fields';
        return;
    }
    msg.textContent = 'Logging in...';
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        msg.textContent = error.message;
    } else {
        currentUser = data.user;
        showApp();
    }
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

// Save to Supabase
async function saveToSupabase() {
    if (!currentUser) return;
    const userData = {
        subjects: subjects,
        totalXP: totalXP,
        streak: streak
    };
    const { data, error } = await supabaseClient
        .from('subjects')
        .upsert({
            user_id: currentUser.id,
            data: JSON.stringify(userData)
        }, { onConflict: 'user_id' });
    if (error) {
        console.log('Save error:', error);
    }
}

// Load from Supabase
async function loadFromSupabase() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('subjects')
        .select('data')
        .eq('user_id', currentUser.id)
        .single();
    if (data && data.data) {
        const userData = JSON.parse(data.data);
        subjects = userData.subjects || [];
        totalXP = userData.totalXP || 0;
        streak = userData.streak || 0;
    } else {
        subjects = [];
        totalXP = 0;
        streak = 0;
    }
}

function addSubject() {
    const input = document.getElementById('subjectInput');
    const name = input.value.trim();
    if (!name) {
        alert('Please enter a subject name');
        return;
    }
    subjects.push({
        id: Date.now(),
        name: name,
        topics: [],
        createdAt: new Date().toISOString()
    });
    saveToSupabase();
    renderSubjects();
    updateStats();
    input.value = '';
}

function addTopic(subjectId) {
    const input = document.getElementById('topicInput-' + subjectId);
    const name = input.value.trim();
    if (!name) {
        alert('Please enter a topic name');
        return;
    }
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
        subject.topics.push({
            id: Date.now(),
            name: name,
            completed: false
        });
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
            if (topic.completed) {
                totalXP += 10;
                showXPPopup('+10 XP');
            } else {
                totalXP = Math.max(0, totalXP - 10);
            }
            saveToSupabase();
            renderSubjects();
            updateStats();
            updateXPBar();
        }
    }
}

function deleteSubject(subjectId) {
    if (confirm('Delete this subject?')) {
        subjects = subjects.filter(s => s.id !== subjectId);
        saveToSupabase();
        renderSubjects();
        updateStats();
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
                <div class="empty-state-text">
                    No subjects yet.<br>Add your first subject above!
                </div>
            </div>
        `;
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
                        <input
                            type="text"
                            id="topicInput-${subject.id}"
                            placeholder="Add topic..."
                            class="input"
                        />
                        <button onclick="addTopic(${subject.id})" class="btn-primary">Add</button>
                    </div>
                    ${subject.topics.length === 0 ?
                        '<p style="color:#444;font-size:13px;text-align:center;padding:10px">No topics yet!</p>'
                        :
                        subject.topics.map(topic => `
                            <div class="topic-item">
                                <input
                                    type="checkbox"
                                    class="topic-checkbox"
                                    ${topic.completed ? 'checked' : ''}
                                    onchange="toggleTopic(${subject.id}, ${topic.id})"
                                />
                                <span class="topic-name ${topic.completed ? 'completed' : ''}">
                                    ${topic.name}
                                </span>
                                <span class="topic-xp">+10 XP</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const totalSubjects = subjects.length;
    const totalTopics = subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = subjects.reduce((sum, s) =>
        sum + s.topics.filter(t => t.completed).length, 0);
    document.getElementById('totalSubjects').textContent = totalSubjects;
    document.getElementById('totalTopics').textContent = totalTopics;
    document.getElementById('completedTopics').textContent = completedTopics;
    document.getElementById('totalXP').textContent = totalXP;
    document.getElementById('streakCount').textContent = streak + '🔥';
    const level = Math.floor(totalXP / 100) + 1;
    document.getElementById('levelBadge').textContent = 'LVL ' + level;
}

function updateXPBar() {
    const xpInCurrentLevel = totalXP % 100;
    document.getElementById('xpFill').style.width = xpInCurrentLevel + '%';
}

function showXPPopup(text) {
    const popup = document.createElement('div');
    popup.textContent = text;
    popup.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 14px;
        z-index: 999;
        box-shadow: 0 0 20px rgba(124,58,237,0.6);
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

function checkStreak() {
    const lastStudy = localStorage.getItem('lastStudy_' + currentUser.id);
    const today = new Date().toDateString();
    if (lastStudy === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastStudy === yesterday.toDateString()) {
        streak += 1;
    } else {
        streak = 1;
    }
    localStorage.setItem('lastStudy_' + currentUser.id, today);
    saveToSupabase();
    updateStats();
      }

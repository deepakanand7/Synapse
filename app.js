let subjects = JSON.parse(localStorage.getItem('subjects')) || [];
let totalXP = parseInt(localStorage.getItem('totalXP')) || 0;
let streak = parseInt(localStorage.getItem('streak')) || 0;

window.onload = function() {
    updateStats();
    renderSubjects();
    updateXPBar();
    checkStreak();
}

function saveData() {
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('totalXP', totalXP);
    localStorage.setItem('streak', streak);
}

function addSubject() {
    const input = document.getElementById('subjectInput');
    const name = input.value.trim();
    if (!name) {
        alert('Please enter a subject name');
        return;
    }
    const subject = {
        id: Date.now(),
        name: name,
        topics: [],
        createdAt: new Date().toISOString()
    };
    subjects.push(subject);
    saveData();
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
            completed: false,
            completedAt: null
        });
        saveData();
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
                topic.completedAt = new Date().toISOString();
            } else {
                totalXP = Math.max(0, totalXP - 10);
                topic.completedAt = null;
            }
            saveData();
            renderSubjects();
            updateStats();
            updateXPBar();
        }
    }
}

function deleteSubject(subjectId) {
    if (confirm('Delete this subject?')) {
        subjects = subjects.filter(s => s.id !== subjectId);
        saveData();
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
    document.querySelector('.level-badge').textContent = 'LVL ' + level;
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
    const lastStudy = localStorage.getItem('lastStudyDate');
    const today = new Date().toDateString();
    if (lastStudy === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastStudy === yesterday.toDateString()) {
        streak += 1;
    } else if (lastStudy !== today) {
        streak = 1;
    }
    localStorage.setItem('lastStudyDate', today);
    saveData();
}

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active.id === 'subjectInput') {
            addSubject();
        }
    }
});

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
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    await loadFromSupabase();
    updateStats();
    renderSubjects();
    updateXPBar();
    checkStreak();
    renderRingChart();
    updateAvatar();
    renderRevisionList();
    loadReminderSettings();
}

function updateAvatar() {
    if (!currentUser) return;
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
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
    } else if (tab === 'profile') {
        document.getElementById('profileTab').style.display = 'block';
        document.querySelectorAll('.tab-btn')[4].classList.add('active');
        renderProfile();
    }
}

async function updateLeaderboard() {
    if (!currentUser) return;
    try {
        await supabaseClient.from('leaderboard').upsert({
            user_id: currentUser.id,
            username: currentUser.user_metadata?.full_name || 'Hunter',
            xp: totalXP,
            level: Math.floor(totalXP / 100) + 1,
            streak: streak,
            updated_at: new Date().toISOString()
        });
    } catch(err) { console.log('Leaderboard error:', err); }
}

async function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">Loading...</div></div>';
    try {
        const { data } = await supabaseClient
            .from('leaderboard')
            .select('*')
            .order('xp', { ascending: false })
            .limit(20);
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-text">No hunters yet!</div></div>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        list.innerHTML = data.map((user, index) => `
            <div class="leaderboard-item ${user.user_id === currentUser.id ? 'leaderboard-me' : ''}">
                <span class="leaderboard-rank">${medals[index] || '#' + (index + 1)}</span>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4" class="leaderboard-avatar"/>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${user.username} ${user.user_id === currentUser.id ? '(You)' : ''}</div>
                    <div class="leaderboard-stats">LVL ${user.level} · ${user.streak}🔥</div>
                </div>
                <div class="leaderboard-xp">
                    <span class="leaderboard-xp-number">${user.xp}</span>
                    <span class="leaderboard-xp-label">XP</span>
                </div>
            </div>
        `).join('');
    } catch(err) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-text">Error loading</div></div>';
    }
}

function renderProfile() {
    if (!currentUser) return;
    const level = Math.floor(totalXP / 100) + 1;
    const xpInLevel = totalXP % 100;
    const totalSubjects = subjects.length;
    const totalTopics = subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = subjects.reduce((sum, s) => sum + s.topics.filter(t => t.completed).length, 0);

    document.getElementById('profileName').textContent = currentUser.user_metadata?.full_name || 'Hunter';
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileLevel').textContent = `⚡ LVL ${level} Hunter`;
    document.getElementById('profileSubjects').textContent = totalSubjects;
    document.getElementById('profileTopics').textContent = totalTopics;
    document.getElementById('profileCompleted').textContent = completedTopics;
    document.getElementById('profileStreak').textContent = streak + '🔥';
    document.getElementById('profileXPFill').style.width = xpInLevel + '%';
    document.getElementById('profileXPText').textContent = `${xpInLevel} / 100 XP`;
    document.getElementById('profileNextLevel').textContent = `Next: LVL ${level + 1}`;

    const achievements = [
        { icon: '🌟', name: 'First Step', desc: 'Complete your first topic', unlocked: completedTopics >= 1 },
        { icon: '📚', name: 'Scholar', desc: 'Add 3 subjects', unlocked: totalSubjects >= 3 },
        { icon: '⚡', name: 'Power User', desc: 'Complete 10 topics', unlocked: completedTopics >= 10 },
        { icon: '🔥', name: 'On Fire', desc: '3 day streak', unlocked: streak >= 3 },
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
    if (password.length < 6) { msg.textContent = 'Password min 6 characters'; return; }
    msg.textContent = 'Creating account...';
    const { error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
    });
    if (error) { msg.textContent = error.message; }
    else { msg.textContent = '✅ Account created! Login now.'; }
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
        const { error } = await supabaseClient
            .from('subjects')
            .upsert({ user_id: currentUser.id, data: JSON.stringify({ subjects, totalXP, streak }) });
        if (error) alert('Save error: ' + error.message);
        else await updateLeaderboard();
    } catch(err) { alert('Error: ' + err.message); }
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
    } catch(err) { subjects = []; totalXP = 0; streak = 0; }
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
                <div class="empty-state-text">No subjects yet.<br>Add above or use templates!</div>
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
        data: { datasets: [{ data: [percent, 100 - percent], backgroundColor: ['#7c3aed', '#1a1a2e'], borderWidth: 0 }] },
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
    const lastStudy = localStorage.getItem('lastStudy_' + currentUser.id);
    const today = new Date().toDateString();
    if (lastStudy === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streak = lastStudy === yesterday.toDateString() ? streak + 1 : 1;
    localStorage.setItem('lastStudy_' + currentUser.id, today);
    saveToSupabase();
    updateStats();
}

const syllabusTemplates = {
    physics: { name: 'Physics (CBSE 12)', topics: ['Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments','Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei','Semiconductor Electronics','Communication Systems'] },
    chemistry: { name: 'Chemistry (CBSE 12)', topics: ['The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry','General Principles of Isolation of Elements','The p-Block Elements','The d and f Block Elements','Coordination Compounds','Haloalkanes and Haloarenes','Alcohols Phenols and Ethers','Aldehydes Ketones and Carboxylic Acids','Amines','Biomolecules','Polymers','Chemistry in Everyday Life'] },
    maths: { name: 'Mathematics (CBSE 12)', topics: ['Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants','Continuity and Differentiability','Application of Derivatives','Integrals','Application of Integrals','Differential Equations','Vector Algebra','Three Dimensional Geometry','Linear Programming','Probability'] },
    biology: { name: 'Biology (CBSE 12)', topics: ['Reproduction in Organisms','Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health','Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution','Human Health and Disease','Strategies for Enhancement in Food Production','Microbes in Human Welfare','Biotechnology Principles and Processes','Biotechnology and its Applications','Organisms and Populations','Ecosystem','Biodiversity and Conservation','Environmental Issues'] },
    english: { name: 'English (CBSE 12)', topics: ['The Last Lesson','Lost Spring','Deep Water','The Rattrap','Indigo','Poets and Pancakes','The Interview','Going Places','My Mother at Sixty Six','An Elementary School Classroom in a Slum','Keeping Quiet','A Thing of Beauty','A Roadside Stand','Aunt Jennifers Tigers'] },
    accounts: { name: 'Accountancy (CBSE 12)', topics: ['Accounting for Partnership Firms','Change in Profit Sharing Ratio','Admission of a Partner','Retirement of a Partner','Death of a Partner','Dissolution of Partnership Firm','Share Capital','Issue and Redemption of Debentures','Financial Statements of Companies','Analysis of Financial Statements','Cash Flow Statement'] }
};

function importTemplate(subject) {
    const template = syllabusTemplates[subject];
    if (!template) return;
    if (confirm(`Import ${template.name}?\n${template.topics.length} chapters will be added!`)) {
        if (subjects.find(s => s.name === template.name)) { alert('Already exists!'); return; }
        subjects.push({ id: Date.now(), name: template.name, topics: template.topics.map((t, i) => ({ id: Date.now() + i, name: t, completed: false })), createdAt: new Date().toISOString() });
        saveToSupabase();
        updateStats();
        renderSubjects();
        renderRingChart();
        alert(`✅ ${template.name} imported!`);
    }
}
// B Pharmacy Sem 2 Templates
const bpharmTemplates = {
    bpharm_hap2: {
        name: 'HAP-II (BP201T)',
        topics: [
            'Module 1: Nervous System - Organization, Neuron, Neuroglia',
            'Module 1: Action Potential, Nerve Impulse, Receptors, Synapse',
            'Module 1: CNS - Brain Structure and Functions',
            'Module 1: Spinal Cord and Reflex Activity',
            'Module 2: Digestive System - GI Tract Anatomy',
            'Module 2: Stomach, Small Intestine, Large Intestine Functions',
            'Module 2: Digestion, Absorption, GIT Disorders',
            'Module 2: Energetics - ATP, Creatinine Phosphate, BMR',
            'Module 3: Respiratory System Anatomy and Mechanism',
            'Module 3: Lung Volumes, Transport of Gases',
            'Module 3: Urinary System - Kidney and Nephrons',
            'Module 3: Urine Formation, Micturition, RAS',
            'Module 4: Endocrine System - Classification of Hormones',
            'Module 4: Pituitary, Thyroid, Parathyroid, Adrenal Glands',
            'Module 4: Pancreas, Pineal, Thymus and Disorders',
            'Module 5: Male and Female Reproductive System',
            'Module 5: Sex Hormones, Menstruation, Fertilization',
            'Module 5: Spermatogenesis, Oogenesis, Pregnancy',
            'Module 5: Introduction to Genetics - Chromosomes, DNA'
        ]
    },
    bpharm_poc1: {
        name: 'Pharma Organic Chem-I (BP202T)',
        topics: [
            'Module 1: Classification of Organic Compounds',
            'Module 1: IUPAC Nomenclature (up to 10 Carbons)',
            'Module 1: Structural Isomerism in Organic Compounds',
            'Module 2: Alkanes - SP3 Hybridization, Halogenation',
            'Module 2: Alkenes - SP2 Hybridization, E1 and E2 Reactions',
            'Module 2: Markownikoffs Orientation, Free Radical Addition',
            'Module 2: Conjugated Dienes - Diel-Alder Reaction',
            'Module 3: Alkyl Halides - SN1 and SN2 Reactions',
            'Module 3: Stereochemistry and Rearrangement',
            'Module 3: Structure and Uses of Chloroform, Iodoform',
            'Module 3: Alcohols - Ethyl, Methyl, Glycerol, Propylene Glycol',
            'Module 4: Carbonyl Compounds - Aldehydes and Ketones',
            'Module 4: Aldol Condensation, Cannizzaro, Benzoin Reactions',
            'Module 4: Formaldehyde, Acetone, Chloral Hydrate Uses',
            'Module 5: Carboxylic Acids - Acidity and Inductive Effect',
            'Module 5: Acetic, Lactic, Tartaric, Citric, Salicylic Acids',
            'Module 5: Aliphatic Amines - Basicity and Substituent Effects'
        ]
    },
    bpharm_biochem: {
        name: 'Biochemistry (BP203T)',
        topics: [
            'Module 1: Biomolecules - Carbohydrates, Lipids, Nucleic Acids',
            'Module 1: Amino Acids and Proteins Classification',
            'Module 1: Bioenergetics - Free Energy, Enthalpy, Entropy',
            'Module 1: ATP, Cyclic AMP - Biological Significance',
            'Module 2: Glycolysis - Pathway, Energetics, Significance',
            'Module 2: Citric Acid Cycle - Pathway and Significance',
            'Module 2: HMP Shunt, G6PD Deficiency',
            'Module 2: Glycogen Metabolism and Storage Diseases',
            'Module 2: Gluconeogenesis and Blood Glucose Regulation',
            'Module 2: Electron Transport Chain Mechanism',
            'Module 2: Oxidative Phosphorylation and Inhibitors',
            'Module 3: Beta Oxidation of Fatty Acids',
            'Module 3: Ketone Bodies and Ketoacidosis',
            'Module 3: De Novo Synthesis of Fatty Acids',
            'Module 3: Cholesterol - Bile Acids, Steroid Hormones',
            'Module 3: Disorders - Hypercholesterolemia, Atherosclerosis',
            'Module 3: Amino Acid Metabolism - Transamination, Urea Cycle',
            'Module 3: Phenylketonuria, Albinism, Tyrosinemia',
            'Module 3: Catabolism of Heme and Jaundice',
            'Module 4: Biosynthesis of Purine and Pyrimidine Nucleotides',
            'Module 4: Hyperuricemia and Gout Disease',
            'Module 4: DNA Structure, Replication (Semi Conservative)',
            'Module 4: Transcription and RNA Synthesis',
            'Module 4: Genetic Code, Translation, Protein Synthesis',
            'Module 5: Enzyme Classification and Properties',
            'Module 5: Enzyme Kinetics - Michaelis Plot, Lineweaver Burke',
            'Module 5: Enzyme Inhibitors and Regulation',
            'Module 5: Therapeutic and Diagnostic Applications of Enzymes'
        ]
    },
    bpharm_patho: {
        name: 'Pathophysiology (BP204T)',
        topics: [
            'Module 1: Cell Injury - Causes and Pathogenesis',
            'Module 1: Adaptive Changes - Atrophy, Hypertrophy, Hyperplasia',
            'Module 1: Cell Death, Acidosis, Alkalosis, Electrolyte Imbalance',
            'Module 1: Inflammation - Types and Mechanism',
            'Module 1: Wound Healing and Atherosclerosis',
            'Module 2: Hypertension and Congestive Heart Failure',
            'Module 2: Ischemic Heart Disease, Angina, MI',
            'Module 2: Respiratory - Asthma, COPD',
            'Module 2: Renal - Acute and Chronic Renal Failure',
            'Module 3: Haematological Diseases - Iron Deficiency Anemia',
            'Module 3: Megaloblastic, Sickle Cell, Thalassemia',
            'Module 3: Haemophilia',
            'Module 3: Endocrine - Diabetes, Thyroid Disorders',
            'Module 3: Nervous System - Epilepsy, Parkinsons Disease',
            'Module 3: Depression, Schizophrenia, Alzheimers Disease',
            'Module 3: Peptic Ulcer',
            'Module 4: IBD, Jaundice, Hepatitis A B C D E',
            'Module 4: Liver Diseases',
            'Module 5: Neoplasia - Types and Pathogenesis',
            'Module 5: Infectious Diseases'
        ]
    },
    bpharm_computer: {
        name: 'Computer Applications (BP205T)',
        topics: [
            'Module 1: Introduction to Computers - Hardware, Software',
            'Module 1: Operating Systems - Windows, Linux Basics',
            'Module 2: MS Word - Document Creation and Formatting',
            'Module 2: MS Excel - Spreadsheets and Formulas',
            'Module 3: MS PowerPoint - Presentations',
            'Module 3: Internet and Email Applications',
            'Module 4: Databases - Introduction to MS Access',
            'Module 4: Pharmacy Software Applications',
            'Module 5: Statistical Analysis using Computers',
            'Module 5: Bioinformatics Introduction'
        ]
    }
};

function importBpharmTemplate(subject) {
    const template = bpharmTemplates[subject];
    if (!template) return;
    if (confirm(`Import ${template.name}?\n${template.topics.length} topics will be added!`)) {
        if (subjects.find(s => s.name === template.name)) {
            alert('This subject already exists!');
            return;
        }
        subjects.push({
            id: Date.now(),
            name: template.name,
            topics: template.topics.map((t, i) => ({ id: Date.now() + i, name: t, completed: false })),
            createdAt: new Date().toISOString()
        });
        saveToSupabase();
        updateStats();
        renderSubjects();
        renderRingChart();
        alert(`✅ ${template.name} imported!\n${template.topics.length} topics added.`);
    }
}
// Spaced Repetition System
const REVISION_INTERVALS = [1, 3, 7, 14, 30];

function getRevisionDates(completedDate) {
    const dates = [];
    const base = new Date(completedDate);
    REVISION_INTERVALS.forEach(days => {
        const date = new Date(base);
        date.setDate(date.getDate() + days);
        dates.push(date.toDateString());
    });
    return dates;
}

function getDueRevisions() {
    const today = new Date().toDateString();
    const due = [];
    subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            if (topic.completed && topic.completedAt) {
                const revisionDates = getRevisionDates(topic.completedAt);
                const nextRevision = revisionDates.find(date => {
                    const d = new Date(date);
                    const t = new Date(today);
                    return d <= t;
                });
                if (nextRevision && !topic.lastRevised) {
                    due.push({
                        subjectName: subject.name,
                        topicName: topic.name,
                        subjectId: subject.id,
                        topicId: topic.id,
                        dueDate: nextRevision
                    });
                } else if (topic.lastRevised) {
                    const nextAfterRevision = getRevisionDates(topic.lastRevised)
                        .find(date => new Date(date) > new Date(topic.lastRevised));
                    if (nextAfterRevision && new Date(nextAfterRevision) <= new Date(today)) {
                        due.push({
                            subjectName: subject.name,
                            topicName: topic.name,
                            subjectId: subject.id,
                            topicId: topic.id,
                            dueDate: nextAfterRevision
                        });
                    }
                }
            }
        });
    });
    return due;
}

function renderRevisionList() {
    const due = getDueRevisions();
    const list = document.getElementById('revisionList');
    if (!list) return;

    if (due.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">No revisions due today!<br>Keep studying 💪</div>
            </div>`;
        return;
    }

    list.innerHTML = due.map(item => `
        <div class="revision-item">
            <div class="revision-info">
                <div class="revision-topic">${item.topicName}</div>
                <div class="revision-subject">${item.subjectName}</div>
            </div>
            <button onclick="markRevised(${item.subjectId}, ${item.topicId})" 
                class="btn-primary" style="padding:6px 12px;font-size:12px">
                ✅ Revised
            </button>
        </div>
    `).join('');
}

function markRevised(subjectId, topicId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
        const topic = subject.topics.find(t => t.id === topicId);
        if (topic) {
            topic.lastRevised = new Date().toISOString();
            totalXP += 5;
            showXPPopup('+5 XP Revised!');
            saveToSupabase();
            renderRevisionList();
            updateStats();
            updateXPBar();
        }
    }
}

// Notifications
async function requestNotificationPermission() {
    const status = document.getElementById('notificationStatus');
    if (!('Notification' in window)) {
        status.textContent = '❌ Notifications not supported on this browser';
        return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        status.textContent = '✅ Notifications enabled!';
        scheduleNotification();
    } else {
        status.textContent = '❌ Permission denied. Enable in browser settings.';
    }
}

function saveReminder() {
    const time = document.getElementById('reminderTime').value;
    localStorage.setItem('reminderTime', time);
    document.getElementById('notificationStatus').textContent = `✅ Reminder set for ${time}`;
    scheduleNotification();
}

function scheduleNotification() {
    const time = localStorage.getItem('reminderTime') || '08:00';
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hours, minutes, 0, 0);
    if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1);
    }
    const delay = scheduled - now;
    setTimeout(() => {
        const due = getDueRevisions();
        if (due.length > 0) {
            new Notification('⚡ Synapse Study Reminder', {
                body: `You have ${due.length} topics to revise today!`,
                icon: 'https://raw.githubusercontent.com/deepakanand7/synapse/main/icon.png'
            });
        }
        scheduleNotification();
    }, delay);
}

function loadReminderSettings() {
    const time = localStorage.getItem('reminderTime');
    if (time) {
        const input = document.getElementById('reminderTime');
        if (input) input.value = time;
        scheduleNotification();
    }
}

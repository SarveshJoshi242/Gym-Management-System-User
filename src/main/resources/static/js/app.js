/* ══════════════════════════════════════════════════════════════
   GymPlus Software — Frontend JavaScript
   API: http://localhost:8080
   ══════════════════════════════════════════════════════════════ */

const API = 'http://localhost:8080/api';
let currentUser = null;
let goalChartInstance = null;
const completedExercises = new Set();
let currentMuscleExercises = [];
let currentCalendarDate = new Date();
let completedWorkoutDates = new Map();

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login')   .classList.toggle('active',  isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('login-form')   .classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden',  isLogin);
  document.getElementById('login-error')   .classList.add('hidden');
  document.getElementById('register-error').classList.add('hidden');
}

// ── Register ─────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  clearError('register-error');
  setLoading('register-btn', true);

  const body = {
    name:     document.getElementById('reg-name')  .value.trim(),
    age:      +document.getElementById('reg-age')  .value,
    height:   +document.getElementById('reg-height').value,
    weight:   +document.getElementById('reg-weight').value,
    goal:      document.getElementById('reg-goal') .value,
    password:  document.getElementById('reg-pass') .value,
  };

  // Client-side validation
  if (!body.name)            return showError('register-error', 'Name is required.'),     setLoading('register-btn', false);
  if (body.age <= 0)         return showError('register-error', 'Enter a valid age.'),    setLoading('register-btn', false);
  if (body.height <= 0)      return showError('register-error', 'Enter valid height.'),   setLoading('register-btn', false);
  if (body.weight <= 0)      return showError('register-error', 'Enter valid weight.'),   setLoading('register-btn', false);
  if (!body.password)        return showError('register-error', 'Password is required.'), setLoading('register-btn', false);

  try {
    const res = await post('/register', body);
    if (!res.success) {
      showError('register-error', res.message || 'Registration failed. Please try again.');
      return;
    }
    currentUser = res.data.user;
    bootDashboard(res.data);
    showToast(`Welcome, ${currentUser.name}! Account created ✓`);
  } catch (err) {
    console.error('[Register Error]', err);
    showError('register-error', 'Cannot connect to server. Make sure the backend is running.');
  } finally {
    setLoading('register-btn', false);
  }
}

// ── Login ────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  clearError('login-error');
  setLoading('login-btn', true);

  const body = {
    name:     document.getElementById('login-name').value.trim(),
    password: document.getElementById('login-pass').value,
  };

  try {
    const res = await post('/login', body);
    if (!res.success) {
      showError('login-error', res.message || 'Login failed. Check your credentials.');
      return;
    }
    currentUser = res.data.user;
    bootDashboard(res.data);
    showToast(`Welcome back, ${currentUser.name}!`);
  } catch (err) {
    console.error('[Login Error]', err);
    showError('login-error', 'Cannot connect to server. Make sure the backend is running.');
  } finally {
    setLoading('login-btn', false);
  }
}

// ── Quick BMI ────────────────────────────────────────────────
async function quickBMI() {
  const h = +document.getElementById('bmi-h').value;
  const w = +document.getElementById('bmi-w').value;
  const el = document.getElementById('bmi-result');
  if (!h || !w || h <= 0 || w <= 0) {
    el.classList.remove('hidden');
    el.innerHTML = 'Please enter valid height and weight.';
    return;
  }
  try {
    const res = await get(`/bmi?height=${h}&weight=${w}`);
    el.classList.remove('hidden');
    if (res.success) {
      el.innerHTML = `<strong>BMI: ${res.data.bmi}</strong> — ${res.data.category}<br/><small>${res.data.advice}</small>`;
    } else {
      el.textContent = res.message || 'Something went wrong. Please try again.';
    }
  } catch (err) {
    console.error('[BMI Error]', err);
    el.classList.remove('hidden');
    el.textContent = 'Something went wrong. Please try again.';
  }
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD BOOT
// ══════════════════════════════════════════════════════════════

function bootDashboard(data) {
  document.getElementById('auth-screen')     .classList.replace('active', 'hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');

  fillOverview(data);
  buildMuscleGrid();
  showPanel('overview');
}

function fillOverview(data) {
  const u = data.user;
  const g = data.goal;

  document.getElementById('welcome-msg')    .textContent = `Welcome, ${u.name}!`;
  document.getElementById('user-goal-badge').textContent = goalLabel(u.goal);

  document.getElementById('dash-bmi')    .textContent = u.bmi;
  document.getElementById('dash-bmi-cat').textContent = bmiCat(u.bmi);
  document.getElementById('dash-height') .textContent = `${u.height} m`;
  document.getElementById('dash-weight') .textContent = `${u.weight} kg`;
  document.getElementById('dash-age')    .textContent = `${u.age} yrs`;
  document.getElementById('dash-goal')   .textContent = goalLabel(u.goal);

  // BMI bar marker: map 10–40 → 0–100%
  const pct = Math.min(100, Math.max(0, ((u.bmi - 10) / 30) * 100));
  document.getElementById('bmi-bar-marker').style.left = pct + '%';

  if (g) {
    document.getElementById('dash-calories').textContent = g.calories;
    document.getElementById('dash-water')   .textContent = g.waterIntake.toFixed(1);
    setWorkoutUI(g.workoutCompleted);
  }

  if (data.workoutPlan) {
    try {
      document.getElementById('rec-workout').innerHTML = marked.parse(data.workoutPlan);
    } catch(e) {
      document.getElementById('rec-workout').textContent = data.workoutPlan;
    }
  }
  if (data.dietTips) {
    try {
      document.getElementById('rec-diet').innerHTML = marked.parse(data.dietTips);
    } catch(e) {
      document.getElementById('rec-diet').textContent = data.dietTips;
    }
  }
  
  if (u.currentStreak && u.currentStreak > 0) {
    document.getElementById('streak-count').textContent = u.currentStreak;
    document.getElementById('streak-badge').classList.remove('hidden');
  } else {
    document.getElementById('streak-badge').classList.add('hidden');
  }

  if (g) {
      renderGoalChart(g);
  }
}

function renderGoalChart(g) {
  const ctx = document.getElementById('goalChart');
  if (!ctx) return;
  
  if (goalChartInstance) {
      goalChartInstance.destroy();
  }
  
  const isDark = true;
  Chart.defaults.color = isDark ? '#e4e4e7' : '#666';
  Chart.defaults.font.family = "'Inter', sans-serif";

  goalChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
          labels: ['Calories Consumed', 'Calories Remaining', 'Water Consumed (ml)', 'Water Remaining (ml)'],
          datasets: [{
              data: [
                  g.caloriesConsumed || 0,
                  Math.max(0, g.calories - (g.caloriesConsumed || 0)),
                  (g.waterConsumed || 0) * 1000,
                  Math.max(0, (g.waterIntake - (g.waterConsumed || 0)) * 1000)
              ],
              backgroundColor: [
                  'rgba(255, 51, 51, 0.9)',
                  'rgba(255, 51, 51, 0.05)',
                  'rgba(14, 165, 233, 0.9)',
                  'rgba(14, 165, 233, 0.05)'
              ],
              hoverBackgroundColor: [
                  '#FF3333',
                  'rgba(255, 51, 51, 0.1)',
                  '#0ea5e9',
                  'rgba(14, 165, 233, 0.1)'
              ],
              borderColor: 'transparent',
              borderWidth: 0,
              borderRadius: 8,
              hoverOffset: 4
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  position: 'bottom',
                  labels: { padding: 20, usePointStyle: true }
              },
              tooltip: {
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  titleFont: { size: 14 },
                  bodyFont: { size: 13 },
                  padding: 12,
                  cornerRadius: 8,
                  callbacks: {
                      label: function(context) {
                          let label = context.label || '';
                          if (label) { label += ': '; }
                          if (context.parsed !== null) {
                              label += context.parsed + (context.label.includes('Water') ? ' ml' : ' kcal');
                          }
                          return label;
                      }
                  }
              }
          },
          cutout: '80%',
          animation: { animateScale: true, animateRotate: true, duration: 1600, easing: 'easeOutQuart' }
      }
  });
}

function setWorkoutUI(done) {
  const txt   = document.getElementById('workout-status-text');
  const btn   = document.getElementById('complete-btn');
  const gdTxt = document.getElementById('gd-workout');
  const gdBtn = document.getElementById('gd-complete-btn');

  if (done) {
    txt.textContent    = '🎉 Workout completed today! Great job!';
    txt.style.color    = '#22c55e';
    if (btn)   btn.style.display   = 'none';
    if (gdTxt) gdTxt.textContent   = '✓ Completed';
    if (gdBtn) gdBtn.style.display = 'none';
  } else {
    txt.textContent    = '🏋 Workout not yet completed today';
    txt.style.color    = '';
    if (btn)   btn.style.display   = '';
    if (gdTxt) gdTxt.textContent   = '✗ Pending';
    if (gdBtn) gdBtn.style.display = '';
  }
}

// ══════════════════════════════════════════════════════════════
// PANEL NAVIGATION
// ══════════════════════════════════════════════════════════════

async function showPanel(name) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.panel === name));
  document.querySelectorAll('.panel').forEach(el => {
    const match = el.id === `panel-${name}`;
    el.classList.toggle('active', match);
    el.classList.toggle('hidden', !match);
  });

  if (name === 'goals')     loadGoals();
  if (name === 'recommend') loadRecommendations();
}

// ══════════════════════════════════════════════════════════════
// EXERCISES
// ══════════════════════════════════════════════════════════════

const MUSCLES = {
  chest:     '🏋', back: '🔙', legs: '🦵',
  shoulders: '💪', arms: '💪', core: '🎯'
};

function buildMuscleGrid() {
  const grid = document.getElementById('muscle-grid');
  grid.innerHTML = '';
  Object.entries(MUSCLES).forEach(([key, emoji]) => {
    const btn = document.createElement('button');
    btn.className = 'muscle-btn';
    btn.dataset.muscle = key;
    btn.innerHTML = `<span class="muscle-emoji">${emoji}</span><span class="muscle-name">${key}</span>`;
    btn.onclick = () => loadExercises(key);
    grid.appendChild(btn);
  });
}

async function loadExercises(muscle) {
  document.querySelectorAll('.muscle-btn').forEach(b =>
    b.classList.toggle('chosen', b.dataset.muscle === muscle));

  try {
    const res = await get(`/exercises/${muscle}`);
    const wrap = document.getElementById('exercise-wrap');
    if (!res.success || !res.data || !res.data.length) {
      wrap.classList.add('hidden');
      showToast('No exercises found for ' + muscle);
      return;
    }
    document.getElementById('exercise-title').textContent =
      `${MUSCLES[muscle] || ''} ${muscle.toUpperCase()} EXERCISES`;

    currentMuscleExercises = res.data;

    document.getElementById('exercise-list').innerHTML = res.data.map((ex, i) => {
      const isDone = completedExercises.has(ex.id);
      return `
        <div class="ex-card ${isDone ? 'done' : ''}" id="ex-card-${ex.id}" onclick="toggleExercise(${ex.id})">
          <div class="ex-card-header">
            <span class="ex-num">#${i+1}</span>
            <span class="ex-name">${ex.name}</span>
            <div class="ex-check ${isDone ? 'checked' : ''}" id="ex-check-${ex.id}">
              ${isDone ? '✓' : ''}
            </div>
          </div>
          <div class="ex-card-body">
            <div class="ex-stat"><span>Sets:</span> <strong>${ex.sets}</strong></div>
            <div class="ex-stat"><span>Reps:</span> <strong>${ex.reps}</strong></div>
          </div>
        </div>
      `;
    }).join('');

    wrap.classList.remove('hidden');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error('[Exercises Error]', err);
    showToast('Something went wrong. Please try again.');
  }
}

function toggleExercise(exId) {
  const card = document.getElementById(`ex-card-${exId}`);
  const check = document.getElementById(`ex-check-${exId}`);
  
  if (completedExercises.has(exId)) {
    completedExercises.delete(exId);
    card.classList.remove('done');
    check.classList.remove('checked');
    check.innerHTML = '';
  } else {
    completedExercises.add(exId);
    card.classList.add('done');
    check.classList.add('checked');
    check.innerHTML = '✓';
    
    // Check if all exercises for current muscle group are completed
    if (currentMuscleExercises.length > 0 && currentMuscleExercises.every(ex => completedExercises.has(ex.id))) {
      showToast('All exercises completed! Workout marked as done! 🎉');
      markWorkoutDone();
    } else {
      showToast('Exercise completed! 💪');
    }
  }
}

// ══════════════════════════════════════════════════════════════
// DAILY GOALS
// ══════════════════════════════════════════════════════════════

async function loadGoals() {
  if (!currentUser) return;
  try {
    const res = await get(`/goals/${currentUser.id}`);
    if (res.success && res.data) {
      const g = res.data;
      document.getElementById('gd-calories').textContent = g.calories;
      document.getElementById('gd-water')   .textContent = g.waterIntake.toFixed(1);
      setWorkoutUI(g.workoutCompleted);
    }
    
    try {
      const historyRes = await get(`/goals/${currentUser.id}/history`);
      if (historyRes.success) {
        completedWorkoutDates.clear();
        historyRes.data.forEach(g => {
          completedWorkoutDates.set(g.goalDate, g);
        });
      }
    } catch (err) { console.error('[History Error]', err); }
    
    renderCalendar();
  } catch (err) {
    console.error('[Goals Error]', err);
    showToast('Something went wrong loading goals.');
  }
}

// ══════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════

function changeMonth(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');
  if (!grid || !monthYearLabel) return;

  grid.innerHTML = '';
  
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day empty';
    grid.appendChild(emptyCell);
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    
    const dateNum = document.createElement('div');
    dateNum.className = 'date-num';
    dateNum.textContent = d;
    cell.appendChild(dateNum);
    
    if (isCurrentMonth && d === today.getDate()) {
      cell.classList.add('today');
    }
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const goalData = completedWorkoutDates.get(dateStr);
    
    if (goalData) {
      if (goalData.workoutCompleted) {
        cell.classList.add('completed');
      }
      
      if (goalData.caloriesConsumed > 0 || goalData.waterConsumed > 0) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'cal-stats';
        
        if (goalData.caloriesConsumed > 0) {
          statsDiv.innerHTML += `<div class="cal-stat kcal"><span class="stat-icon">🔥</span><span>${goalData.caloriesConsumed}</span></div>`;
        }
        if (goalData.waterConsumed > 0) {
          statsDiv.innerHTML += `<div class="cal-stat water"><span class="stat-icon">💧</span><span>${goalData.waterConsumed.toFixed(1)}L</span></div>`;
        }
        cell.appendChild(statsDiv);
      }
    }
    
    grid.appendChild(cell);
  }
}

async function markWorkoutDone() {
  if (!currentUser) return;
  try {
    const res = await post(`/goals/${currentUser.id}/complete`, {});
    if (res.success && res.data) {
      setWorkoutUI(true);
      showToast('Workout marked as completed! 🎉');
      
      // Update streak badge if the backend returned the updated user object
      if (res.data.user) {
        currentUser = res.data.user;
        if (currentUser.currentStreak && currentUser.currentStreak > 0) {
          document.getElementById('streak-count').textContent = currentUser.currentStreak;
          document.getElementById('streak-badge').classList.remove('hidden');
        }
      }
      
      // Update calendar live
      const todayStr = new Date().toISOString().split('T')[0];
      let todayGoal = completedWorkoutDates.get(todayStr) || { workoutCompleted: false, caloriesConsumed: 0, waterConsumed: 0 };
      todayGoal.workoutCompleted = true;
      completedWorkoutDates.set(todayStr, todayGoal);
      renderCalendar();
    } else {
      showToast(res.message || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error('[Workout Complete Error]', err);
    showToast('Something went wrong. Please try again.');
  }
}

async function logFood() {
  if (!currentUser) return;
  const item = document.getElementById('food-item-input').value.trim();
  const cals = +document.getElementById('food-cal-input').value;
  if (!item || cals <= 0) {
      showToast('Please enter a valid food item and calories.');
      return;
  }
  
  try {
      const res = await post('/food', { userId: currentUser.id, foodItem: item, calories: cals });
      if (res.success) {
          showToast(`Logged ${cals} kcal for ${item}!`);
          document.getElementById('food-item-input').value = '';
          document.getElementById('food-cal-input').value = '';
          refreshDashboard({ user: currentUser, goal: res.data });
      } else {
          showToast(res.message || 'Failed to log food.');
      }
  } catch(e) { showToast('Error logging food.'); }
}

async function logWater() {
  if (!currentUser) return;
  const amt = +document.getElementById('water-amount-input').value;
  if (amt <= 0) {
      showToast('Please enter a valid water amount in Litres.');
      return;
  }
  
  try {
      const res = await post('/water', { userId: currentUser.id, amount: amt });
      if (res.success) {
          showToast(`Logged ${amt} L of water!`);
          document.getElementById('water-amount-input').value = '';
          refreshDashboard({ user: currentUser, goal: res.data });
      } else {
          showToast(res.message || 'Failed to log water.');
      }
  } catch(e) { showToast('Error logging water.'); }
}

// ══════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════

async function loadRecommendations() {
  if (!currentUser) return;
  try {
    const res = await get(`/recommendation/${currentUser.id}`);
    if (res.success && res.data) {
      const wp = res.data.workoutPlan || '—';
      const dt = res.data.dietTips || '—';
      try {
        document.getElementById('rec-workout').innerHTML = marked.parse(wp);
      } catch(e) { document.getElementById('rec-workout').textContent = wp; }
      
      try {
        document.getElementById('rec-diet').innerHTML = marked.parse(dt);
      } catch(e) { document.getElementById('rec-diet').textContent = dt; }
    }
  } catch (err) {
    console.error('[Recommendations Error]', err);
    showToast('Something went wrong. Please try again.');
  }
}

// ══════════════════════════════════════════════════════════════
// AI ASSISTANT
// ══════════════════════════════════════════════════════════════

async function sendChat() {
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query || !currentUser) return;

  addMsg(query, 'user');
  input.value = '';

  const typingId = addMsg('<div class="typing-dots"><span></span><span></span><span></span></div>', 'bot');

  try {
    const res = await post('/assistant', { userId: currentUser.id, query });
    removeMsg(typingId);
    if (res.success && res.data) {
      const formattedReply = window.marked ? marked.parse(res.data.reply) : res.data.reply;
      addMsg(formattedReply, 'bot');
    } else {
      addMsg(res.message || 'Server busy, please try again.', 'bot');
    }
  } catch (err) {
    console.error('[Assistant Error]', err);
    removeMsg(typingId);
    addMsg('Server busy, please try again.', 'bot');
  }
}

function insertChip(text) {
  document.getElementById('chat-input').value = text;
  document.getElementById('chat-input').focus();
}

function addMsg(text, role) {
  const id   = 'msg-' + Date.now() + Math.random();
  const wrap = document.getElementById('chat-messages');
  const div  = document.createElement('div');
  div.className = `msg ${role}`;
  div.id = id;
  div.innerHTML = `<span class="avatar">${role === 'bot' ? '🤖' : '👤'}</span>
                   <div class="bubble">${text}</div>`;
  wrap.appendChild(div);
  
  // If user, scroll to bottom. If bot, scroll so the top of the message is visible.
  if (role === 'user') {
    wrap.scrollTop = wrap.scrollHeight;
  } else {
    // Small timeout to allow the DOM to render the new height before scrolling
    setTimeout(() => {
      div.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
  
  return id;
}

function removeMsg(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ══════════════════════════════════════════════════════════════
// EDIT PROFILE MODAL
// ══════════════════════════════════════════════════════════════

function openEditModal() {
  if (!currentUser) return;

  // Pre-fill form with current values
  document.getElementById('edit-name')  .value = currentUser.name;
  document.getElementById('edit-age')   .value = currentUser.age;
  document.getElementById('edit-height').value = currentUser.height;
  document.getElementById('edit-weight').value = currentUser.weight;
  document.getElementById('edit-goal')  .value = currentUser.goal;

  // Reset error
  document.getElementById('edit-error').classList.add('hidden');

  // Show live BMI preview
  updateBmiPreview();

  // Attach live-preview listeners
  ['edit-height', 'edit-weight'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateBmiPreview));

  // Show modal
  const backdrop = document.getElementById('edit-modal');
  const card     = backdrop.querySelector('.modal-card');
  backdrop.classList.remove('hidden');
  backdrop.classList.add('active');
  card.classList.remove('closing');

  // Focus first input
  setTimeout(() => document.getElementById('edit-name').focus(), 50);

  // Trap Escape
  document.addEventListener('keydown', handleEditEsc);
}

function closeEditModal() {
  const backdrop = document.getElementById('edit-modal');
  const card     = backdrop.querySelector('.modal-card');

  // Animate out
  card.classList.add('closing');
  setTimeout(() => {
    backdrop.classList.add('hidden');
    backdrop.classList.remove('active');
    card.classList.remove('closing');
    document.removeEventListener('keydown', handleEditEsc);
  }, 230);
}

function handleBackdropClick(e) {
  if (e.target.id === 'edit-modal') closeEditModal();
}

function handleEditEsc(e) {
  if (e.key === 'Escape') closeEditModal();
}

// Live BMI preview inside modal
function updateBmiPreview() {
  const h = +document.getElementById('edit-height').value;
  const w = +document.getElementById('edit-weight').value;
  const valEl = document.getElementById('bmi-preview-val');
  const catEl = document.getElementById('bmi-preview-cat');

  if (h > 0 && w > 0) {
    const bmi = Math.round((w / (h * h)) * 100) / 100;
    valEl.textContent = bmi;
    catEl.textContent = bmiCat(bmi);
  } else {
    valEl.textContent = '—';
    catEl.textContent = '—';
  }
}

// ── Submit profile update ────────────────────────────────────
async function handleProfileUpdate(e) {
  e.preventDefault();
  document.getElementById('edit-error').classList.add('hidden');
  setLoading('edit-save-btn', true);

  const body = {
    name:   document.getElementById('edit-name')  .value.trim(),
    age:    +document.getElementById('edit-age')   .value,
    height: +document.getElementById('edit-height').value,
    weight: +document.getElementById('edit-weight').value,
    goal:    document.getElementById('edit-goal')  .value,
  };

  // Client-side validation
  if (!body.name)       return showError('edit-error', 'Name is required.'),                    setLoading('edit-save-btn', false);
  if (body.age  <= 0)   return showError('edit-error', 'Enter a valid age.'),                   setLoading('edit-save-btn', false);
  if (body.height <= 0) return showError('edit-error', 'Enter a valid height (e.g. 1.75).'),    setLoading('edit-save-btn', false);
  if (body.weight <= 0) return showError('edit-error', 'Enter a valid weight (e.g. 70).'),      setLoading('edit-save-btn', false);

  // Check if AI needs to regenerate
  const needsAiRegen = body.goal !== currentUser.goal || body.weight !== currentUser.weight || body.height !== currentUser.height;
  if (needsAiRegen) {
    const btnText = document.querySelector('#edit-save-btn .btn-text');
    if (btnText) btnText.textContent = 'Generating AI Plan... (Takes ~10s)';
    showToast('Updating your personalized AI fitness plan... Please wait.');
  }

  try {
    const res = await put(`/user/update/${currentUser.id}`, body);

    if (!res.success) {
      showError('edit-error', res.message || 'Update failed. Please try again.');
      return;
    }

    // Update local state + refresh all dashboard sections
    currentUser = res.data.user;
    refreshDashboard(res.data);

    closeEditModal();
    showToast('✅ Profile updated successfully!');

  } catch (err) {
    console.error('[Profile Update Error]', err);
    showError('edit-error', 'Cannot connect to server. Make sure the backend is running.');
  } finally {
    const btnText = document.querySelector('#edit-save-btn .btn-text');
    if (btnText) btnText.textContent = 'Save Changes';
    setLoading('edit-save-btn', false);
  }
}

// Refresh dashboard with new API data
function refreshDashboard(data) {
  fillOverview(data);

  // If recommendations panel is visible, refresh it too
  if (!document.getElementById('panel-recommend').classList.contains('hidden')) {
    if (data.workoutPlan) {
      try {
        document.getElementById('rec-workout').innerHTML = marked.parse(data.workoutPlan);
      } catch(e) {}
    }
    if (data.dietTips) {
      try {
        document.getElementById('rec-diet').innerHTML = marked.parse(data.dietTips);
      } catch(e) {}
    }
  }
  
  // Refresh goals panel if visible
  if (!document.getElementById('panel-goals').classList.contains('hidden')) {
    const g = data.goal;
    if (g) {
      document.getElementById('gd-calories').textContent = g.calories;
      document.getElementById('gd-water')   .textContent = g.waterIntake.toFixed(1);
      setWorkoutUI(g.workoutCompleted);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════════════

function logout() {
  currentUser = null;
  document.getElementById('dashboard-screen').classList.add('hidden');
  document.getElementById('auth-screen')     .classList.replace('hidden', 'active');
  document.getElementById('login-form')   .reset();
  document.getElementById('register-form').reset();
  document.getElementById('chat-messages').innerHTML = '';
  switchTab('login');
}

// ══════════════════════════════════════════════════════════════
// HTTP
// ══════════════════════════════════════════════════════════════

async function get(path) {
  const res = await fetch(API + path);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(API + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}

async function put(path, body) {
  const res = await fetch(API + path, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError(id) {
  document.getElementById(id).classList.add('hidden');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.querySelector('.btn-text') .classList.toggle('hidden',  loading);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !loading);
  btn.disabled = loading;
}

let _toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function goalLabel(g) {
  return { fat_loss:'Fat Loss', weight_gain:'Weight Gain', maintenance:'Maintenance' }[g] || g;
}

function bmiCat(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}

/* ══════════════════════════════════════════════════════════════
   GymPlus Software — Frontend JavaScript
   API: http://localhost:8080
   ══════════════════════════════════════════════════════════════ */

// NOTE: The 'API' constant is defined in config.js (loaded before this file).
// To change the backend URL, edit config.js — not this file.
let currentUser = null;
let goalChartInstance = null;
const completedExercises = new Set();
let currentMuscleExercises = [];
let currentCalendarDate = new Date();
let completedWorkoutDates = new Map();
let currentMuscleGroup = null;

// ══════════════════════════════════════════════════════════════
// JWT TOKEN MANAGEMENT
// ══════════════════════════════════════════════════════════════

function getToken() {
  return localStorage.getItem('gymplus_token');
}

function setToken(token) {
  localStorage.setItem('gymplus_token', token);
}

function removeToken() {
  localStorage.removeItem('gymplus_token');
}

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
    email:    document.getElementById('reg-email') .value.trim().toLowerCase(),
    age:      +document.getElementById('reg-age')  .value,
    height:   +document.getElementById('reg-height').value,
    weight:   +document.getElementById('reg-weight').value,
    goal:      document.getElementById('reg-goal') .value,
    password:  document.getElementById('reg-pass') .value,
  };

  // Client-side validation
  if (!body.name || body.name.length < 3)
    return showError('register-error', 'Name must be at least 3 characters.'), setLoading('register-btn', false);
  if (!/^[A-Za-z ]+$/.test(body.name))
    return showError('register-error', 'Name should contain only letters and spaces.'), setLoading('register-btn', false);
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    return showError('register-error', 'Please enter a valid email address.'), setLoading('register-btn', false);
  if (body.age < 10 || body.age > 120)
    return showError('register-error', 'Age must be between 10 and 120.'), setLoading('register-btn', false);
  if (body.height < 0.5 || body.height > 3.0)
    return showError('register-error', 'Height must be between 0.5 and 3.0 metres.'), setLoading('register-btn', false);
  if (body.weight < 20 || body.weight > 400)
    return showError('register-error', 'Weight must be between 20 and 400 kg.'), setLoading('register-btn', false);
  if (!body.password || body.password.length < 6)
    return showError('register-error', 'Password must be at least 6 characters.'), setLoading('register-btn', false);

  try {
    const res = await post('/register', body);
    if (!res.success) {
      // Handle validation errors from backend
      if (res.errors) {
        const firstError = Object.values(res.errors)[0];
        showError('register-error', firstError);
      } else {
        showError('register-error', res.message || 'Registration failed. Please try again.');
      }
      return;
    }
    // Store JWT token
    if (res.data.token) {
      setToken(res.data.token);
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
    email:    document.getElementById('login-email').value.trim().toLowerCase(),
    password: document.getElementById('login-pass').value,
  };

  // Client-side validation
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    return showError('login-error', 'Please enter a valid email address.'), setLoading('login-btn', false);
  if (!body.password || body.password.length < 6)
    return showError('login-error', 'Password must be at least 6 characters.'), setLoading('login-btn', false);

  try {
    const res = await post('/login', body);
    if (!res.success) {
      showError('login-error', res.message || 'Login failed. Check your credentials.');
      return;
    }
    // Store JWT token
    if (res.data.token) {
      setToken(res.data.token);
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
  if (h < 0.5 || h > 3.0) {
    el.classList.remove('hidden');
    el.innerHTML = 'Height must be between 0.5 and 3.0 metres.';
    return;
  }
  if (w < 20 || w > 400) {
    el.classList.remove('hidden');
    el.innerHTML = 'Weight must be between 20 and 400 kg.';
    return;
  }
  try {
    // BMI endpoint is public, no token needed
    const res = await fetch(API + `/bmi?height=${h}&weight=${w}`);
    const json = await res.json();
    el.classList.remove('hidden');
    if (json.success) {
      el.innerHTML = `<strong>BMI: ${json.data.bmi}</strong> — ${json.data.category}<br/><small>${json.data.advice}</small>`;
    } else {
      el.textContent = json.message || 'Something went wrong. Please try again.';
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

  const profName = document.getElementById('profile-user-name');
  const profEmail = document.getElementById('profile-user-email');
  if (profName) profName.textContent = u.name;
  if (profEmail) profEmail.textContent = u.email;

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
    currentMuscleGroup = muscle;
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
            <button class="info-btn" onclick="event.stopPropagation(); openExerciseInfo('${ex.name.replace(/'/g, "\\'")}')" aria-label="Exercise Info" title="Learn how to perform this exercise" style="margin-right: 8px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
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
    handleAuthError(err);
    showToast('Something went wrong. Please try again.');
  }
}

async function exchangeExercises() {
  if (!currentMuscleGroup) return;
  const btn = document.getElementById('exchange-btn');
  const btnText = document.getElementById('exchange-btn-text');
  
  // Save original text and state
  const originalText = btnText.textContent;
  btn.disabled = true;
  btnText.textContent = "Loading...";
  btn.style.opacity = '0.6';
  btn.style.cursor = 'not-allowed';
  
  try {
    const res = await fetch(`${API}/exercises/${currentMuscleGroup}/exchange`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const json = await res.json();
    if (json.success) {
      showToast('New exercises generated successfully!');
      // Re-render the newly updated exercises
      await loadExercises(currentMuscleGroup);
    } else {
      showToast(json.message || 'Failed to exchange exercises.');
    }
  } catch (err) {
    console.error('[Exchange Error]', err);
    handleAuthError(err);
    showToast('Something went wrong exchanging exercises.');
  } finally {
    btn.disabled = false;
    btnText.textContent = originalText;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
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
          let dKey = g.goalDate;
          if (Array.isArray(dKey)) {
            dKey = `${dKey[0]}-${String(dKey[1]).padStart(2, '0')}-${String(dKey[2]).padStart(2, '0')}`;
          }
          completedWorkoutDates.set(dKey, g);
        });
      }
    } catch (err) { console.error('[History Error]', err); }
    
    renderCalendar();
  } catch (err) {
    console.error('[Goals Error]', err);
    handleAuthError(err);
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
      
      if (goalData.caloriesConsumed > 0 || goalData.waterConsumed > 0 || (goalData.workoutCompleted && goalData.workoutType)) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'cal-stats';
        
        if (goalData.caloriesConsumed > 0) {
          statsDiv.innerHTML += `<div class="cal-stat kcal"><span class="stat-icon">🔥</span><span>${goalData.caloriesConsumed}</span></div>`;
        }
        if (goalData.waterConsumed > 0) {
          const waterVal = Number(goalData.waterConsumed) || 0;
          statsDiv.innerHTML += `<div class="cal-stat water"><span class="stat-icon">💧</span><span>${waterVal.toFixed(1)}L</span></div>`;
        }
        if (goalData.workoutCompleted && goalData.workoutType) {
          const wType = goalData.workoutType.charAt(0).toUpperCase() + goalData.workoutType.slice(1);
          statsDiv.innerHTML += `<div class="cal-stat workout"><span class="stat-icon">🏋️</span><span>${wType}</span></div>`;
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
    const payload = currentMuscleGroup ? { workoutType: currentMuscleGroup } : {};
    const res = await post(`/goals/${currentUser.id}/complete`, payload);
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
      if (currentMuscleGroup) {
          todayGoal.workoutType = currentMuscleGroup;
      }
      completedWorkoutDates.set(todayStr, todayGoal);
      renderCalendar();
    } else {
      showToast(res.message || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error('[Workout Complete Error]', err);
    handleAuthError(err);
    showToast('Something went wrong. Please try again.');
  }
}

async function logFood() {
  if (!currentUser) return;
  const item = document.getElementById('food-item-input').value.trim();
  const cals = +document.getElementById('food-cal-input').value;
  if (!item) {
      showToast('Please enter a food item name.');
      return;
  }
  if (cals <= 0 || cals > 5000) {
      showToast('Please enter calories between 1 and 5,000 kcal.');
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
  } catch(e) {
    handleAuthError(e);
    showToast('Error logging food.');
  }
}

async function logWater() {
  if (!currentUser) return;
  const amt = +document.getElementById('water-amount-input').value;
  if (amt <= 0 || amt > 5.0) {
      showToast('Please enter a water amount between 0.01 and 5.0 Litres.');
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
  } catch(e) {
    handleAuthError(e);
    showToast('Error logging water.');
  }
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
    handleAuthError(err);
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
    handleAuthError(err);
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
  if (!body.name || body.name.length < 3)
    return showError('edit-error', 'Name must be at least 3 characters.'), setLoading('edit-save-btn', false);
  if (!/^[A-Za-z ]+$/.test(body.name))
    return showError('edit-error', 'Name should contain only letters and spaces.'), setLoading('edit-save-btn', false);
  if (body.age < 10 || body.age > 120)
    return showError('edit-error', 'Age must be between 10 and 120.'), setLoading('edit-save-btn', false);
  if (body.height < 0.5 || body.height > 3.0)
    return showError('edit-error', 'Height must be between 0.5 and 3.0 metres.'), setLoading('edit-save-btn', false);
  if (body.weight < 20 || body.weight > 400)
    return showError('edit-error', 'Weight must be between 20 and 400 kg.'), setLoading('edit-save-btn', false);

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
    handleAuthError(err);
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
  removeToken();
  document.getElementById('dashboard-screen').classList.add('hidden');
  document.getElementById('auth-screen')     .classList.replace('hidden', 'active');
  document.getElementById('login-form')   .reset();
  document.getElementById('register-form').reset();
  document.getElementById('chat-messages').innerHTML = '';
  switchTab('login');
}

// ══════════════════════════════════════════════════════════════
// HTTP — with JWT Authorization headers
// ══════════════════════════════════════════════════════════════

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function get(path) {
  const res = await fetch(API + path, {
    headers: authHeaders(),
  });
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  return res.json();
}

async function post(path, body) {
  const res = await fetch(API + path, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  return res.json();
}

async function put(path, body) {
  const res = await fetch(API + path, {
    method:  'PUT',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// AUTH ERROR HANDLING
// ══════════════════════════════════════════════════════════════

function handleUnauthorized() {
  showToast('Session expired. Please log in again.');
  logout();
}

function handleAuthError(err) {
  if (err && err.message === 'Unauthorized') {
    // Already handled by handleUnauthorized
    return;
  }
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

// ══════════════════════════════════════════════════════════════
// MODULE INFORMATION DICTIONARY & MODAL CONTROL
// ══════════════════════════════════════════════════════════════

const MODULE_INFO_DATA = {
  bmi: {
    title: "⚖️ BMI Index",
    html: `
      <p><strong>Body Mass Index (BMI)</strong> is a simple calculation using a person's height and weight. It is a reliable indicator of body fatness for most people.</p>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px; border-radius: var(--radius-xs); margin-bottom: 16px; font-size: 0.9rem;">
        <span style="font-family: monospace; color: var(--text-1); font-weight: 700;">BMI = Weight (kg) / [Height (m)]²</span>
      </div>
      <p style="margin-bottom: 8px; font-weight: 700; color: var(--text-1);">Standard BMI Categories:</p>
      <ul style="padding-left: 20px; margin-bottom: 16px;">
        <li><span class="blue">●</span> <strong>Underweight:</strong> BMI is less than 18.5</li>
        <li><span class="green">●</span> <strong>Normal Weight:</strong> BMI is 18.5 to 24.9</li>
        <li><span style="color: orange;">●</span> <strong>Overweight:</strong> BMI is 25.0 to 29.9</li>
        <li><span class="red">●</span> <strong>Obese:</strong> BMI is 30.0 or higher</li>
      </ul>
      <p>Your BMI is automatically computed from your profile height and weight. To lower your BMI, seek a calorie deficit (Fat Loss). To increase it, seek a calorie surplus (Weight Gain).</p>
    `
  },
  stats: {
    title: "📋 My Stats",
    html: `
      <p>This module displays your active physical parameters: height, weight, age, and your fitness goal.</p>
      <p>These values serve as inputs to calculate custom daily fitness targets. Keep them updated to receive the most accurate recommendations.</p>
      <p><strong>Action:</strong> Click on the <strong>✏️ Edit Profile</strong> button at the top-right of your screen whenever your stats change to automatically recalculate and adjust your targets.</p>
    `
  },
  calorie: {
    title: "🔥 Calorie Target",
    html: `
      <p>Your daily calorie target represents the estimated energy intake required to achieve your fitness goal:</p>
      <ul style="padding-left: 20px; margin-bottom: 16px;">
        <li><strong>Fat Loss:</strong> Restricts energy intake to a safe deficit (approx. -500 kcal) to encourage body fat burning.</li>
        <li><strong>Weight Gain:</strong> Increases energy intake to a healthy surplus (approx. +300 kcal) to support muscle growth.</li>
        <li><strong>Maintenance:</strong> Matches daily energy expenditure to maintain weight.</li>
      </ul>
      <p>Your daily energy requirements are determined using the scientifically validated <em>Mifflin-St Jeor</em> equation, incorporating your age, height, and weight, adjusted for baseline activity level.</p>
      <p>Log your food intake daily to track your calories and close your red calorie ring!</p>
    `
  },
  water: {
    title: "💧 Water Intake",
    html: `
      <p>Water is crucial for muscle function, joint lubrication, metabolic efficiency, and recovery.</p>
      <p>Your target hydration level is estimated based on your body weight (approx. 35-40ml of water per kg of weight), scaled for basic daily activity.</p>
      <p>Log your water consumption in the <strong>Log Your Intake</strong> module throughout the day. Aim to reach your target and close your blue water ring!</p>
    `
  },
  rings: {
    title: "📊 Activity Rings",
    html: `
      <p>The activity rings provide a real-time progress visualization for your daily health goals:</p>
      <ul style="padding-left: 20px; margin-bottom: 16px;">
        <li><strong class="red">Outer Ring (Red):</strong> Calories Consumed vs. Calorie Target.</li>
        <li><strong class="blue">Middle Ring (Blue):</strong> Water Consumed vs. Water Intake Target.</li>
        <li><strong class="green">Inner Ring (Green):</strong> Today's Workout Status (0% incomplete, 100% complete).</li>
      </ul>
      <p>Aim to close all three rings daily to establish healthy, sustainable habits!</p>
    `
  },
  intake: {
    title: "📝 Log Your Intake",
    html: `
      <p>This module allows you to track what you consume during the day:</p>
      <ul style="padding-left: 20px; margin-bottom: 16px;">
        <li><strong>Log Food:</strong> Enter the name of the food item and its estimated calories (kcal). Press "+ Add Food" to add it to your daily total.</li>
        <li><strong>Log Water:</strong> Enter the volume in Litres (e.g., 0.25 for a cup, 0.5 for a bottle) and press "+ Add Water".</li>
      </ul>
      <p>Every log will immediately update your calorie/water intake displays and the corresponding progress rings.</p>
    `
  },
  exercises: {
    title: "💪 Muscle-Wise Exercises",
    html: `
      <p>This panel shows recommended physical exercises grouped by target muscles (e.g. Chest, Back, Legs).</p>
      <ul style="padding-left: 20px; margin-bottom: 16px;">
        <li>Select a muscle group from the grid to reveal a curated list of exercises.</li>
        <li>Click <strong>🔄 Generate New</strong> to refresh the exercises list with alternatives.</li>
        <li>Review descriptions, targets, sets, reps, and time constraints before starting.</li>
      </ul>
      <p>Follow the workout guidelines and click <strong>Mark Completed</strong> when you finish today's training session.</p>
    `
  },
  daily_goals: {
    title: "🎯 Daily Goals & Activity",
    html: `
      <p>This panel lists your static daily intake goals and lets you track workout compliance.</p>
      <p><strong>Workout Activity Calendar:</strong> A historical record of your training days. Days highlighted in green indicate that you completed your workout.</p>
      <p>Maintain your streak by completing workouts regularly and checking off green circles on the calendar!</p>
    `
  },
  recommend: {
    title: "🧠 Personal Recommendations",
    html: `
      <p>These recommendations are generated dynamically based on your physical stats and fitness goal:</p>
      <ul style="padding-left: 20px; margin-bottom: 16px;">
        <li><strong>Workout Plan:</strong> Curated split frequency, cardiovascular recommendations, and muscle training priorities.</li>
        <li><strong>Diet Tips:</strong> Optimized macro ratios (proteins, fats, carbs) and hydration advice.</li>
      </ul>
      <p>If you change your goal (e.g., from Fat Loss to Weight Gain) in your profile, these tips will automatically update.</p>
    `
  }
};

function openInfoModal(key) {
  const data = MODULE_INFO_DATA[key];
  if (!data) return;

  document.getElementById('info-modal-title').textContent = data.title;
  document.getElementById('info-modal-body').innerHTML = data.html;

  const backdrop = document.getElementById('info-modal');
  const card     = backdrop.querySelector('.modal-card');
  backdrop.classList.remove('hidden');
  backdrop.classList.add('active');
  card.classList.remove('closing');

  document.addEventListener('keydown', handleInfoEsc);
}

function closeInfoModal() {
  const backdrop = document.getElementById('info-modal');
  const card     = backdrop.querySelector('.modal-card');

  card.classList.add('closing');
  setTimeout(() => {
    backdrop.classList.add('hidden');
    backdrop.classList.remove('active');
    card.classList.remove('closing');
    document.removeEventListener('keydown', handleInfoEsc);
  }, 230);
}

function handleInfoBackdropClick(e) {
  if (e.target.id === 'info-modal') closeInfoModal();
}

function handleInfoEsc(e) {
  if (e.key === 'Escape') closeInfoModal();
}

async function openExerciseInfo(name) {
  // Pre-fill the modal with a loading spinner
  document.getElementById('info-modal-title').textContent = "🏋️ " + name;
  document.getElementById('info-modal-body').innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; gap: 16px;">
      <span class="spinner" style="width: 28px; height: 28px; border-width: 3px; border-color: var(--blue) transparent var(--blue) transparent;"></span>
      <span style="color: var(--text-3); font-size: 0.9rem;">Consulting IronMind AI knowledge base...</span>
    </div>
  `;

  // Open the modal immediately so user sees the loading state
  const backdrop = document.getElementById('info-modal');
  const card     = backdrop.querySelector('.modal-card');
  backdrop.classList.remove('hidden');
  backdrop.classList.add('active');
  card.classList.remove('closing');
  document.addEventListener('keydown', handleInfoEsc);

  try {
    const res = await get(`/exercises/info?name=${encodeURIComponent(name)}`);
    if (res.success && res.data && res.data.html) {
      document.getElementById('info-modal-body').innerHTML = res.data.html;
    } else {
      throw new Error(res.message || "Failed to fetch exercise info.");
    }
  } catch (err) {
    console.error('[Exercise Info Error]', err);
    document.getElementById('info-modal-body').innerHTML = `
      <p>Unable to fetch live guide for this exercise.</p>
      <p><strong>Instructions:</strong></p>
      <ol>
        <li>Perform the exercise using a standard gym setup or weights.</li>
        <li>Maintain a controlled motion (slow descent, powerful lift).</li>
        <li>Keep correct posture and engage target muscle groups throughout the movements.</li>
      </ol>
      <p><strong>Safety Tip:</strong> Do not use weights that are too heavy to control. Focus on proper form first.</p>
    `;
  }
}

// ── Auto-Login on Page Load ──────────────────────────────────
(async function initApp() {
  const token = getToken();
  console.log("[initApp] Loaded token:", token);
  if (token) {
    try {
      console.log("[initApp] Verifying token via GET /me...");
      const res = await get('/me');
      console.log("[initApp] Response from GET /me:", res);
      if (res.success && res.data) {
        console.log("[initApp] Session verified! Booting dashboard...");
        currentUser = res.data.user;
        bootDashboard(res.data);
      } else {
        console.warn("[initApp] Auto-login failed: success=false, clearing token.");
        removeToken();
      }
    } catch (err) {
      console.error('[Auto-Login Error]', err);
    }
  } else {
    console.log("[initApp] No token found in localStorage.");
  }
})();

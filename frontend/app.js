document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "https://symptomchecker-1cz2.onrender.com";

    // ================================================================
    // AUTH GUARD
    // ================================================================
    const token = localStorage.getItem('hc_token');
    const userRaw = localStorage.getItem('hc_user');
    if (!token || !userRaw) { window.location.href = 'auth.html'; return; }

    const user = JSON.parse(userRaw);
    const initial = (user.name || 'U').charAt(0).toUpperCase();

    // ================================================================
    // POPULATE USER INFO
    // ================================================================
    document.getElementById('dash-avatar').textContent = initial;
    document.getElementById('dash-greeting').textContent = `Hello, ${user.name || 'there'}! 👋`;
    document.getElementById('dash-email').textContent = user.email;
    document.getElementById('profile-avatar').textContent = initial;
    document.getElementById('profile-name').textContent = user.name || '—';
    document.getElementById('profile-email').textContent = user.email || '—';

    // Show layout
    document.getElementById('dashboard-layout').style.display = 'flex';

    // ================================================================
    // LOGOUT
    // ================================================================
    window.handleLogout = function () {
        localStorage.removeItem('hc_token');
        localStorage.removeItem('hc_user');
        window.location.href = 'auth.html';
    };
    document.getElementById('nav-logout').addEventListener('click', e => {
        e.preventDefault(); handleLogout();
    });

    // ================================================================
    // PANEL ROUTING — all panels live inside the sidebar layout
    // ================================================================
    const PANELS = {
        dashboard: document.getElementById('panel-dashboard'),
        'new-check': document.getElementById('panel-new-check'),
        results: document.getElementById('panel-results'),
        history: document.getElementById('panel-history'),
        profile: document.getElementById('panel-profile'),
        settings: document.getElementById('panel-settings'),
        help: document.getElementById('panel-help'),
        placeholder: document.getElementById('panel-placeholder'),
    };

    const navItems = document.querySelectorAll('.nav-item[data-section]');

    function showPanel(name) {
        Object.values(PANELS).forEach(p => { if (p) p.style.display = 'none'; });
        if (PANELS[name]) PANELS[name].style.display = 'block';
    }

    function setActiveNav(section) {
        navItems.forEach(el =>
            el.classList.toggle('active', el.dataset.section === section)
        );
    }

    function activateNav(section) {
        setActiveNav(section);

        switch (section) {
            case 'dashboard':
                showPanel('dashboard');
                loadDashboardHome();
                break;
            case 'new-check':
                showPanel('new-check');
                if (symptomsList.length === 0) fetchSymptoms();
                searchInput.focus();
                break;
            case 'history':
                showPanel('history');
                loadHistoryPanel();
                break;
            case 'profile': showPanel('profile'); break;
            case 'settings': showPanel('settings'); break;
            case 'help': showPanel('help'); break;
            case 'saved':
                document.getElementById('placeholder-title').textContent = 'Saved Reports';
                showPanel('placeholder'); break;
            case 'insights':
                document.getElementById('placeholder-title').textContent = 'Health Insights';
                showPanel('placeholder'); break;
            case 'diseases':
                document.getElementById('placeholder-title').textContent = 'Common Diseases';
                showPanel('placeholder'); break;
            case 'guide':
                document.getElementById('placeholder-title').textContent = 'Symptom Guide';
                showPanel('placeholder'); break;
            default:
                showPanel('dashboard');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', e => { e.preventDefault(); activateNav(item.dataset.section); });
    });

    // ── CTA on dashboard ──
    document.getElementById('btn-go-check').addEventListener('click', () => activateNav('new-check'));

    // ── Results header buttons ──
    document.getElementById('btn-check-again').addEventListener('click', () => {
        clearSymptoms();
        activateNav('new-check');
    });
    document.getElementById('btn-back-dash').addEventListener('click', () => {
        clearSymptoms();
        activateNav('dashboard');
    });

    // ================================================================
    // DARK MODE
    // ================================================================
    const darkToggle = document.getElementById('dark-mode-toggle');
    const themeBtn = document.getElementById('btn-theme');

    function applyTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        themeBtn.querySelector('i').className = dark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        if (darkToggle) darkToggle.checked = dark;
        localStorage.setItem('hc_dark', dark ? '1' : '0');
    }

    applyTheme(localStorage.getItem('hc_dark') === '1');

    if (darkToggle) darkToggle.addEventListener('change', () => applyTheme(darkToggle.checked));
    themeBtn.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark-mode')));

    // ================================================================
    // DASHBOARD — stats + recent history
    // ================================================================
    async function loadDashboardHome() {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) { handleLogout(); return; }
            const data = await res.json();
            renderDashboardHistory(data.history || []);
        } catch {
            document.getElementById('history-list').innerHTML =
                '<p class="empty-history">⚠️ Could not load history — is the backend running?</p>';
        }
    }

    function renderDashboardHistory(history) {
        document.getElementById('stat-checks').textContent = history.length;
        const statLast = document.getElementById('stat-last');
        const histList = document.getElementById('history-list');

        if (history.length === 0) {
            statLast.textContent = 'N/A';
            histList.innerHTML = '<p class="empty-history">No checks yet — start your first symptom check!</p>';
            return;
        }

        const latest = history[0];
        statLast.textContent = latest.timestamp
            ? new Date(latest.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'N/A';

        histList.innerHTML = '';
        history.forEach(item => buildHistoryRow(item, histList));
    }

    async function loadHistoryPanel() {
        const histList = document.getElementById('history-list-full');
        histList.innerHTML = '<p class="empty-history">Loading…</p>';
        try {
            const res = await fetch(`${API_BASE_URL}/auth/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) { handleLogout(); return; }
            const data = await res.json();
            const hist = data.history || [];
            histList.innerHTML = '';
            if (!hist.length) {
                histList.innerHTML = '<p class="empty-history">No checks yet.</p>';
                return;
            }
            hist.forEach(item => buildHistoryRow(item, histList));
        } catch {
            document.getElementById('history-list-full').innerHTML =
                '<p class="empty-history">⚠️ Could not load history.</p>';
        }
    }

    function buildHistoryRow(item, container) {
        const div = document.createElement('div');
        div.className = 'history-row';
        const symptoms = (item.symptoms || []).map(s => formatName(s)).join(', ') || 'N/A';
        const timeStr = item.timestamp
            ? new Date(item.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
            : '';
        div.innerHTML = `
            <div class="history-row-left">
                <div class="history-row-title">${item.top_prediction || 'Unknown'}</div>
                <div class="history-row-symptoms"><i class="fa-solid fa-tag"></i>${symptoms}</div>
            </div>
            <div class="history-row-time">${timeStr}</div>
        `;
        container.appendChild(div);
    }

    // ================================================================
    // SYMPTOM CHECK — state & DOM refs
    // ================================================================
    let symptomsList = [];
    let selectedSymptoms = [];
    let activeIndex = -1;

    const searchInput = document.getElementById('symptom-search');
    const autocompleteList = document.getElementById('autocomplete-list');
    const pillsContainer = document.getElementById('selected-symptoms');
    const btnAnalyze = document.getElementById('btn-analyze');
    const countBadge = document.getElementById('symptom-count');

    async function fetchSymptoms() {
        try {
            const res = await fetch(`${API_BASE_URL}/symptoms`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            symptomsList = Array.isArray(data) ? data : (data.symptoms || []);
            console.log(`Loaded ${symptomsList.length} symptoms.`);
        } catch (err) {
            console.error('Failed to fetch symptoms:', err);
            showSearchError();
        }
    }

    function showSearchError() {
        const p = document.createElement('p');
        p.className = 'check-empty-state';
        p.style.color = '#E74C3C';
        p.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Cannot reach backend. Make sure the server is running on port 8000.';
        searchInput.parentNode.insertBefore(p, searchInput.parentNode.firstChild);
    }

    // ── Autocomplete ──
    function formatName(raw) {
        return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function renderDropdown(query) {
        autocompleteList.innerHTML = '';
        if (!query) { autocompleteList.style.display = 'none'; return; }

        const q = query.toLowerCase().replace(/\s+/g, '_');
        const qAlt = query.toLowerCase();

        const matches = symptomsList
            .filter(s => !selectedSymptoms.includes(s) &&
                (s.toLowerCase().includes(q) || formatName(s).toLowerCase().includes(qAlt)))
            .slice(0, 15);

        if (!matches.length) { autocompleteList.style.display = 'none'; return; }

        matches.forEach(sym => {
            const item = document.createElement('div');
            item.className = 'check-autocomplete-item';
            const display = formatName(sym);
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            item.innerHTML = display.replace(regex, '<strong>$1</strong>');
            item.addEventListener('mousedown', e => { e.preventDefault(); addSymptom(sym); });
            autocompleteList.appendChild(item);
        });

        autocompleteList.style.display = 'block';
    }

    function closeDropdown() {
        autocompleteList.innerHTML = '';
        autocompleteList.style.display = 'none';
    }

    searchInput.addEventListener('input', () => renderDropdown(searchInput.value.trim()));
    searchInput.addEventListener('blur', () => setTimeout(closeDropdown, 150));
    searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) renderDropdown(searchInput.value.trim()); });

    searchInput.addEventListener('keydown', e => {
        const items = autocompleteList.querySelectorAll('.check-autocomplete-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            highlightItem(items, activeIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            highlightItem(items, activeIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].dispatchEvent(new Event('mousedown'));
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    function highlightItem(items, idx) {
        items.forEach(i => i.classList.remove('autocomplete-active'));
        if (items[idx]) items[idx].classList.add('autocomplete-active');
    }

    // ── Pills ──
    function addSymptom(sym) {
        if (!selectedSymptoms.includes(sym)) {
            selectedSymptoms.push(sym);
            renderPills();
        }
        searchInput.value = '';
        activeIndex = -1;
        closeDropdown();
        searchInput.focus();
    }

    function removeSymptom(sym) {
        selectedSymptoms = selectedSymptoms.filter(s => s !== sym);
        renderPills();
    }

    function clearSymptoms() {
        selectedSymptoms = [];
        searchInput.value = '';
        closeDropdown();
        renderPills();
    }

    function renderPills() {
        pillsContainer.innerHTML = '';
        countBadge.textContent = selectedSymptoms.length;

        if (!selectedSymptoms.length) {
            pillsContainer.innerHTML = `
                <p class="check-empty-state">
                    <i class="fa-regular fa-hand-pointer"></i>
                    Search and click a symptom above to add it here.
                </p>`;
            return;
        }

        selectedSymptoms.forEach(sym => {
            const pill = document.createElement('div');
            pill.className = 'symptom-pill';
            pill.innerHTML = `<span>${formatName(sym)}</span><i class="fa-solid fa-xmark" title="Remove"></i>`;
            pill.querySelector('.fa-xmark').addEventListener('click', () => removeSymptom(sym));
            pillsContainer.appendChild(pill);
        });
    }

    // ── Analyze ──
    btnAnalyze.addEventListener('click', async () => {
        if (!selectedSymptoms.length) {
            alert('Please select at least one symptom before analyzing.');
            return;
        }

        // Switch to results panel immediately
        setActiveNav('new-check');
        showPanel('results');

        // Show symptom tags
        const bar = document.getElementById('results-symptom-bar');
        bar.innerHTML = selectedSymptoms
            .map(s => `<span class="results-symptom-tag">${formatName(s)}</span>`)
            .join('');

        const spinner = document.getElementById('loading-spinner');
        const container = document.getElementById('results-container');
        container.innerHTML = '';
        spinner.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symptoms: selectedSymptoms })
            });
            spinner.style.display = 'none';
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            data.error ? showResultError(data.error) : renderResults(data.predictions);
        } catch (err) {
            console.error('Prediction error:', err);
            spinner.style.display = 'none';
            showResultError('Network error — make sure the backend is running on port 8000.');
        }
    });

    function showResultError(msg) {
        document.getElementById('results-container').innerHTML =
            `<div class="check-disclaimer" style="border-left-color:#E74C3C;">
                <i class="fa-solid fa-triangle-exclamation" style="color:#E74C3C;"></i>
                <p>⚠️ ${msg}</p>
             </div>`;
    }

    function renderResults(predictions) {
        const container = document.getElementById('results-container');
        if (!predictions || !predictions.length) {
            container.innerHTML = '<p class="check-empty-state" style="padding:2rem;">No matching conditions found for these symptoms.</p>';
            return;
        }

        predictions.forEach((p, i) => {
            let badgeColor = '#E74C3C';
            if (p.confidence > 75) badgeColor = '#27AE60';
            else if (p.confidence > 40) badgeColor = '#F39C12';

            const precHTML = (p.precautions || [])
                .map(pr => `<li><i class="fa-solid fa-circle-check"></i> ${capitalize(pr)}</li>`)
                .join('');

            const card = document.createElement('div');
            card.className = 'result-card';
            card.style.animationDelay = `${i * 0.08}s`;
            card.innerHTML = `
                <div class="result-card-header">
                    <span class="result-card-name">${p.disease}</span>
                    <span class="result-card-badge" style="background:${badgeColor};">${p.confidence}% Match</span>
                </div>
                <p class="result-card-desc">${p.description || 'Description not available.'}</p>
                ${precHTML ? `
                    <p class="result-card-precs-label">Recommended Actions</p>
                    <ul class="result-card-precs">${precHTML}</ul>
                ` : ''}
            `;
            container.appendChild(card);
        });
    }

    function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

    // ================================================================
    // INIT
    // ================================================================
    activateNav('dashboard');
});

document.addEventListener("DOMContentLoaded", () => {
    // API URL
    const API_BASE_URL = "http://localhost:8000";

    // Global state
    let symptomsList = [];
    let selectedSymptoms = [];

    // Setup fetching of symptoms
    async function fetchSymptoms() {
        try {
            const res = await fetch(`${API_BASE_URL}/symptoms`);
            if (res.ok) {
                const data = await res.json();
                symptomsList = data.symptoms;
                autocomplete(document.getElementById("symptom-search"), symptomsList);
            }
        } catch (err) {
            console.error("Failed to fetch symptoms", err);
        }
    }

    // Wizard navigation
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    // Step 1 logic
    const understandToggle = document.getElementById('understand-toggle');
    const btnStart = document.getElementById('btn-start');

    understandToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            btnStart.disabled = false;
            btnStart.classList.remove('disabled-btn');
        } else {
            btnStart.disabled = true;
            btnStart.classList.add('disabled-btn');
        }
    });

    btnStart.addEventListener('click', () => {
        step1.classList.remove('active-step');
        step2.classList.add('active-step');
        // Fetch symptoms list when moving to step 2 if not already done
        if (symptomsList.length === 0) fetchSymptoms();
    });

    // Step 2 logic
    const searchInput = document.getElementById('symptom-search');
    const selectedContainer = document.getElementById('selected-symptoms');
    const btnAnalyze = document.getElementById('btn-analyze');

    function renderSelectedSymptoms() {
        selectedContainer.innerHTML = '';
        if (selectedSymptoms.length === 0) {
            selectedContainer.innerHTML = '<p class="empty-state">No symptoms selected yet. Search above.</p>';
            return;
        }

        selectedSymptoms.forEach(sym => {
            const pill = document.createElement('div');
            pill.className = 'symptom-pill';
            pill.innerHTML = `
                ${formatSymptomName(sym)} 
                <i class="fa-solid fa-xmark" data-sym="${sym}"></i>
            `;
            selectedContainer.appendChild(pill);
        });

        // Add remove handlers
        selectedContainer.querySelectorAll('.fa-xmark').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const symToRemove = e.target.getAttribute('data-sym');
                selectedSymptoms = selectedSymptoms.filter(s => s !== symToRemove);
                renderSelectedSymptoms();
            });
        });
    }

    function formatSymptomName(symName) {
        return symName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    // Autocomplete implementation
    function autocomplete(inp, arr) {
        let currentFocus;
        inp.addEventListener("input", function (e) {
            let a, b, i, val = this.value;
            closeAllLists();
            if (!val) { return false; }
            currentFocus = -1;

            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(a);

            // Limit results to top 15 matches for performance
            let matches = 0;
            for (i = 0; i < arr.length; i++) {
                // If the item starts with or contains the letters
                if (arr[i].toLowerCase().includes(val.toLowerCase()) && !selectedSymptoms.includes(arr[i])) {
                    if (matches >= 15) break;
                    b = document.createElement("DIV");
                    const formattedMatch = formatSymptomName(arr[i]);
                    // Highlight matching part
                    const regex = new RegExp(`(${val})`, "gi");
                    b.innerHTML = formattedMatch.replace(regex, "<strong>$1</strong>");
                    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";

                    b.addEventListener("click", function (e) {
                        const rawSym = this.getElementsByTagName("input")[0].value;
                        if (!selectedSymptoms.includes(rawSym)) {
                            selectedSymptoms.push(rawSym);
                            renderSelectedSymptoms();
                        }
                        inp.value = "";
                        closeAllLists();
                    });
                    a.appendChild(b);
                    matches++;
                }
            }
        });

        inp.addEventListener("keydown", function (e) {
            let x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) { // down
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) { // up
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) { // enter
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
            }
        });

        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add("autocomplete-active");
        }
        function removeActive(x) {
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }
        function closeAllLists(elmnt) {
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
        // Click outside to close
        document.addEventListener("click", function (e) {
            closeAllLists(e.target);
        });
    }

    // Step 3 - analyze
    btnAnalyze.addEventListener('click', async () => {
        if (selectedSymptoms.length === 0) {
            alert("Please select at least one symptom.");
            return;
        }

        step2.classList.remove('active-step');
        step3.classList.add('active-step');

        const loader = document.getElementById('loading-spinner');
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';
        loader.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE_URL}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symptoms: selectedSymptoms })
            });

            loader.style.display = 'none';

            if (res.ok) {
                const data = await res.json();
                renderResults(data.predictions);
            } else {
                resultsContainer.innerHTML = '<p class="empty-state">Error analyzing symptoms. Please try again.</p>';
            }
        } catch (err) {
            console.error(err);
            loader.style.display = 'none';
            resultsContainer.innerHTML = '<p class="empty-state">Network error connecting to API.</p>';
        }
    });

    function renderResults(predictions) {
        const resultsContainer = document.getElementById('results-container');

        if (!predictions || predictions.length === 0) {
            resultsContainer.innerHTML = '<p class="empty-state">No matching conditions found base on these symptoms.</p>';
            return;
        }

        predictions.forEach(p => {
            let scoreClass = 'score-low';
            if (p.confidence > 75) scoreClass = 'score-high';
            else if (p.confidence > 40) scoreClass = 'score-med';

            const precautionsHTML = p.precautions.map(prec => `<li><i class="fa-solid fa-check-circle"></i> ${prec.charAt(0).toUpperCase() + prec.slice(1)}</li>`).join('');

            resultsContainer.innerHTML += `
                <div class="result-box">
                    <div class="result-header">
                        <span class="disease-name">${p.disease}</span>
                        <span class="confidence-score ${scoreClass}">${p.confidence}% Match</span>
                    </div>
                    <p class="disease-desc">${p.description}</p>
                    ${precautionsHTML.length > 0 ? `<ul class="precautions-list"><strong>Recommended Actions:</strong> ${precautionsHTML}</ul>` : ''}
                </div>
            `;
        });
    }

    // Restart logic
    document.getElementById('btn-restart').addEventListener('click', () => {
        selectedSymptoms = [];
        renderSelectedSymptoms();
        step3.classList.remove('active-step');
        step2.classList.add('active-step');
    });
});

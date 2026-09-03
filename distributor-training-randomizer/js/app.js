/**
 * DISTRIBUTOR TRAINING GROUP RANDOMIZER - APP CONTROLLER
 * Handles individual participant entry, immediate group assignment display,
 * live 7/6 roster updates, and storage logging.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Form Elements
    const form = document.getElementById("individual-entry-form");
    const inputName = document.getElementById("input-dist-name");
    const inputOffice = document.getElementById("input-dist-office");
    const btnSubmit = document.getElementById("btn-submit-distributor");
    const btnDemoFill = document.getElementById("btn-demo-fill");
    const btnQuickReset = document.getElementById("btn-quick-reset");

    // Status Elements
    const statusTotalCount = document.getElementById("status-total-count");
    const statusG1Count = document.getElementById("status-g1-count");
    const statusG2Count = document.getElementById("status-g2-count");
    const validationAlert = document.getElementById("validation-alert");
    const validationAlertText = document.getElementById("validation-alert-text");
    const roundCompleteBanner = document.getElementById("round-complete-banner");

    // Assignment Result Elements
    const assignmentResultBox = document.getElementById("assignment-result-box");
    const assignedDistName = document.getElementById("assigned-dist-name");
    const assignedDistOffice = document.getElementById("assigned-dist-office");
    const assignedGroupPill = document.getElementById("assigned-group-pill");
    const assignedGroupText = document.getElementById("assigned-group-text");

    // Live Roster Elements
    const liveGroup1List = document.getElementById("live-group1-list");
    const liveGroup2List = document.getElementById("live-group2-list");

    // Modal Elements
    const confirmModal = document.getElementById("confirm-modal");
    const modalConfirmTitle = document.getElementById("modal-confirm-title");
    const modalConfirmMessage = document.getElementById("modal-confirm-message");
    const modalConfirmOk = document.getElementById("modal-confirm-ok");
    const modalConfirmCancel = document.getElementById("modal-confirm-cancel");
    const modalConfirmClose = document.getElementById("modal-confirm-close");
    let pendingConfirmAction = null;

    // Toast Container
    const toastContainer = document.getElementById("toast-container");

    // Sample names pool for demo/testing
    const DEMO_POOL = [
        { name: "John Smith", office: "Lagos Branch" },
        { name: "Sarah Jones", office: "Abuja Central" },
        { name: "David Adeleke", office: "Port Harcourt North" },
        { name: "Fatima Bello", office: "Kano Commercial" },
        { name: "Emeka Okafor", office: "Enugu Regional" },
        { name: "Grace Mensah", office: "Accra Metro" },
        { name: "Tunde Bakare", office: "Ibadan Station" },
        { name: "Amina Yusuf", office: "Kaduna South" },
        { name: "Chidi Nwosu", office: "Calabar Harbor" },
        { name: "Ngozi Obi", office: "Onitsha Market" },
        { name: "Ibrahim Musa", office: "Sokoto Outpost" },
        { name: "Blessing Eze", office: "Benin City Hub" },
        { name: "Kofi Annan", office: "Kumasi Terminal" }
    ];

    // =========================================================================
    // 1. ROSTER & STATUS RENDERING
    // =========================================================================

    function updateRosterUI() {
        const roster = getActiveRoster();
        const counts = getRosterGroupCounts(roster);

        // Update counters
        statusTotalCount.textContent = `${counts.total} / ${TOTAL_CAPACITY}`;
        statusG1Count.textContent = `Group 1: ${counts.group1} / ${GROUP_1_CAPACITY}`;
        statusG2Count.textContent = `Group 2: ${counts.group2} / ${GROUP_2_CAPACITY}`;

        // Disable registration if full
        if (counts.isFull) {
            btnSubmit.disabled = true;
            btnSubmit.style.opacity = "0.6";
            btnSubmit.style.cursor = "not-allowed";
            roundCompleteBanner.style.display = "flex";
            if (btnDemoFill) btnDemoFill.style.display = "none";
        } else {
            btnSubmit.disabled = false;
            btnSubmit.style.opacity = "1";
            btnSubmit.style.cursor = "pointer";
            roundCompleteBanner.style.display = "none";
            if (btnDemoFill) btnDemoFill.style.display = "inline-flex";
        }

        // Render Group 1 Slots (Fixed 7 slots)
        const g1Members = roster.filter(m => m.group === 1);
        liveGroup1List.innerHTML = "";
        for (let i = 0; i < GROUP_1_CAPACITY; i++) {
            const li = document.createElement("li");
            li.className = "group-member-item";
            if (g1Members[i]) {
                li.innerHTML = `
                    <span class="member-number">${i + 1}.</span>
                    <span class="member-name">${escapeHtml(g1Members[i].name)}</span>
                    <span class="member-separator">—</span>
                    <span class="member-office">${escapeHtml(g1Members[i].office)}</span>
                `;
            } else {
                li.style.opacity = "0.45";
                li.style.borderStyle = "dashed";
                li.innerHTML = `
                    <span class="member-number">${i + 1}.</span>
                    <span class="member-name" style="font-weight: 400; font-style: italic;">Open Slot</span>
                    <span class="member-separator">—</span>
                    <span class="member-office">Awaiting distributor</span>
                `;
            }
            liveGroup1List.appendChild(li);
        }

        // Render Group 2 Slots (Fixed 6 slots)
        const g2Members = roster.filter(m => m.group === 2);
        liveGroup2List.innerHTML = "";
        for (let i = 0; i < GROUP_2_CAPACITY; i++) {
            const li = document.createElement("li");
            li.className = "group-member-item";
            if (g2Members[i]) {
                li.innerHTML = `
                    <span class="member-number">${i + 1}.</span>
                    <span class="member-name">${escapeHtml(g2Members[i].name)}</span>
                    <span class="member-separator">—</span>
                    <span class="member-office">${escapeHtml(g2Members[i].office)}</span>
                `;
            } else {
                li.style.opacity = "0.45";
                li.style.borderStyle = "dashed";
                li.innerHTML = `
                    <span class="member-number">${i + 1}.</span>
                    <span class="member-name" style="font-weight: 400; font-style: italic;">Open Slot</span>
                    <span class="member-separator">—</span>
                    <span class="member-office">Awaiting distributor</span>
                `;
            }
            liveGroup2List.appendChild(li);
        }
    }

    // =========================================================================
    // 2. REGISTRATION & RANDOMIZATION WORKFLOW
    // =========================================================================

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        hideValidationAlert();

        const name = inputName.value.trim();
        const office = inputOffice.value.trim();

        if (!name || !office) {
            showValidationAlert("Please enter both your name and office location.");
            if (!name) inputName.focus();
            else inputOffice.focus();
            return;
        }

        const result = assignIndividualDistributor(name, office);

        if (!result.success) {
            showValidationAlert(result.message);
            return;
        }

        // Clear input form
        inputName.value = "";
        inputOffice.value = "";

        // Display immediate result banner
        displayAssignmentResult(result.member);

        // Update live roster view
        updateRosterUI();

        showToast(`Welcome ${result.member.name}! You are in GROUP ${result.member.group}.`);

        if (result.isRoundCompleted) {
            showToast("All 13 spots filled! Training round archived in Records.");
        }
    });

    /**
     * Highlights the user's assigned group immediately.
     */
    function displayAssignmentResult(member) {
        assignedDistName.textContent = member.name;
        assignedDistOffice.textContent = member.office;
        assignedGroupText.textContent = `GROUP ${member.group}`;

        if (member.group === 1) {
            assignmentResultBox.style.borderLeftColor = "var(--group1-accent)";
            assignedGroupPill.style.backgroundColor = "var(--group1-badge-bg)";
            assignedGroupPill.style.color = "var(--group1-badge-text)";
        } else {
            assignmentResultBox.style.borderLeftColor = "var(--group2-accent)";
            assignedGroupPill.style.backgroundColor = "var(--group2-badge-bg)";
            assignedGroupPill.style.color = "var(--group2-badge-text)";
        }

        assignmentResultBox.style.display = "block";
        assignmentResultBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Demo Fill: automatically picks an unregistered demo participant
    btnDemoFill.addEventListener("click", () => {
        const roster = getActiveRoster();
        const available = DEMO_POOL.find(d => !roster.some(m => m.name.toLowerCase() === d.name.toLowerCase()));

        if (!available) {
            showToast("All demo distributors are already registered.");
            return;
        }

        inputName.value = available.name;
        inputOffice.value = available.office;
        inputName.focus();
    });

    // Quick Reset
    btnQuickReset.addEventListener("click", () => {
        showConfirmation(
            "Reset Active Roster",
            "Are you sure you want to reset the active roster? Any registered distributors in this current uncompleted round will be cleared. (Completed past rounds in Records are unaffected).",
            () => {
                clearActiveRoster();
                assignmentResultBox.style.display = "none";
                hideValidationAlert();
                updateRosterUI();
                showToast("Active training roster has been reset.");
            }
        );
    });

    // =========================================================================
    // 3. VALIDATION & UTILS
    // =========================================================================

    function showValidationAlert(message) {
        validationAlertText.textContent = message;
        validationAlert.classList.add("active");
    }

    function hideValidationAlert() {
        validationAlert.classList.remove("active");
    }

    function showConfirmation(title, message, onConfirm) {
        modalConfirmTitle.textContent = title;
        modalConfirmMessage.textContent = message;
        pendingConfirmAction = onConfirm;
        confirmModal.classList.add("active");
        modalConfirmOk.focus();
    }

    function closeConfirmation() {
        confirmModal.classList.remove("active");
        pendingConfirmAction = null;
    }

    modalConfirmCancel.addEventListener("click", closeConfirmation);
    modalConfirmClose.addEventListener("click", closeConfirmation);
    confirmModal.addEventListener("click", (e) => {
        if (e.target === confirmModal) closeConfirmation();
    });

    modalConfirmOk.addEventListener("click", () => {
        if (typeof pendingConfirmAction === "function") {
            pendingConfirmAction();
        }
        closeConfirmation();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && confirmModal.classList.contains("active")) {
            closeConfirmation();
        }
    });

    function showToast(message) {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transition = "opacity 0.3s ease";
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3500);
    }

    function escapeHtml(string) {
        if (!string) return "";
        return String(string)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial render
    updateRosterUI();
});

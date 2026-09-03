/**
 * DISTRIBUTOR TRAINING GROUP RANDOMIZER - RECORDS CONTROLLER
 * Handles history list rendering, exact historical record viewing (no re-randomization),
 * and password-protected admin actions.
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const recordsListContainer = document.getElementById("records-list-container");
    const recordsEmptyState = document.getElementById("records-empty-state");
    const totalRecordsCount = document.getElementById("total-records-count");

    // Admin Elements
    const adminTriggerContainer = document.getElementById("admin-trigger-container");
    const btnAdminResetTrigger = document.getElementById("btn-admin-reset-trigger");
    const adminPanel = document.getElementById("admin-panel");
    const btnLockAdmin = document.getElementById("btn-lock-admin");
    const btnAdminResetEntries = document.getElementById("btn-admin-reset-entries");
    const btnAdminClearRecords = document.getElementById("btn-admin-clear-records");
    const btnAdminResetApp = document.getElementById("btn-admin-reset-app");

    // Admin Auth Modal Elements
    const adminPasswordModal = document.getElementById("admin-password-modal");
    const adminPasswordForm = document.getElementById("admin-password-form");
    const adminPasswordInput = document.getElementById("admin-password-input");
    const adminAuthError = document.getElementById("admin-auth-error");
    const modalAdminClose = document.getElementById("modal-admin-close");
    const modalAdminCancel = document.getElementById("modal-admin-cancel");

    // Historical Result Detail Modal
    const historicalModal = document.getElementById("historical-modal");
    const histModalRoundId = document.getElementById("hist-modal-round-id");
    const histModalDatetime = document.getElementById("hist-modal-datetime");
    const histGroup1List = document.getElementById("hist-group1-list");
    const histGroup2List = document.getElementById("hist-group2-list");
    const modalHistoryClose = document.getElementById("modal-history-close");
    const modalHistoryOk = document.getElementById("modal-history-ok");
    const btnHistCopy = document.getElementById("btn-hist-copy");
    let activeHistoricalRecord = null;

    // Confirmation Modal Elements
    const confirmModal = document.getElementById("confirm-modal");
    const modalConfirmTitle = document.getElementById("modal-confirm-title");
    const modalConfirmMessage = document.getElementById("modal-confirm-message");
    const modalConfirmOk = document.getElementById("modal-confirm-ok");
    const modalConfirmCancel = document.getElementById("modal-confirm-cancel");
    const modalConfirmClose = document.getElementById("modal-confirm-close");
    let pendingAdminAction = null;

    // Toast Container
    const toastContainer = document.getElementById("toast-container");

    // =========================================================================
    // 1. RECORDS LIST RENDERING
    // =========================================================================

    /**
     * Renders all historical training records, newest first.
     */
    function renderRecordsList() {
        const records = getTrainingRecords();
        totalRecordsCount.textContent = records.length;

        if (records.length === 0) {
            recordsListContainer.innerHTML = "";
            recordsEmptyState.style.display = "block";
            return;
        }

        recordsEmptyState.style.display = "none";
        recordsListContainer.innerHTML = "";

        records.forEach((record) => {
            const card = document.createElement("article");
            card.className = "record-card";
            card.setAttribute("aria-labelledby", `card-title-${record.id}`);

            // Separate date and time if available
            let displayTime = "";
            let displayDate = record.displayDate;
            if (record.displayDate && record.displayDate.includes("—")) {
                const parts = record.displayDate.split("—");
                displayDate = parts[0].trim();
                displayTime = parts[1] ? parts[1].trim() : "";
            }

            card.innerHTML = `
                <div class="record-card-info">
                    <h3 id="card-title-${record.id}" class="record-card-id">${escapeHtml(record.id)}</h3>
                    <div class="record-card-date">
                        <span>${escapeHtml(displayDate)}</span>
                        ${displayTime ? `<span aria-hidden="true">&bull;</span> <span>${escapeHtml(displayTime)}</span>` : ""}
                    </div>
                    <div class="record-card-groups-summary">
                        <span class="group-summary-tag tag-g1">Group 1: ${record.group1 ? record.group1.length : 7} Offices</span>
                        <span class="group-summary-tag tag-g2">Group 2: ${record.group2 ? record.group2.length : 6} Offices</span>
                    </div>
                </div>
                <div class="record-card-actions">
                    <button type="button" class="btn-secondary btn-view-result" data-round-id="${escapeHtml(record.id)}">
                        <span>View Result</span>
                        <span aria-hidden="true">&rarr;</span>
                    </button>
                </div>
            `;

            recordsListContainer.appendChild(card);
        });

        // Attach View Result event listeners
        recordsListContainer.querySelectorAll(".btn-view-result").forEach((btn) => {
            btn.addEventListener("click", () => {
                const roundId = btn.getAttribute("data-round-id");
                openHistoricalResultModal(roundId);
            });
        });
    }

    // =========================================================================
    // 2. HISTORICAL RECORD VIEWING (STRICTLY NO RE-RANDOMIZATION)
    // =========================================================================

    /**
     * Opens the modal displaying the exact groups that were created in this round.
     * Historical records must never be modified or shuffled again.
     * 
     * @param {string} roundId 
     */
    function openHistoricalResultModal(roundId) {
        const record = getRecordById(roundId);
        if (!record) {
            showToast("Record not found.");
            return;
        }

        activeHistoricalRecord = record;

        histModalRoundId.textContent = record.id;
        histModalDatetime.textContent = record.displayDate || record.createdAt;

        // Group 1: 7 distributors exactly as saved
        histGroup1List.innerHTML = "";
        if (Array.isArray(record.group1)) {
            record.group1.forEach((dist, idx) => {
                const li = document.createElement("li");
                li.className = "group-member-item";
                li.innerHTML = `
                    <span class="member-number">${idx + 1}.</span>
                    <span class="member-name">${escapeHtml(dist.name)}</span>
                    <span class="member-separator">—</span>
                    <span class="member-office">${escapeHtml(dist.office)}</span>
                `;
                histGroup1List.appendChild(li);
            });
        }

        // Group 2: 6 distributors exactly as saved
        histGroup2List.innerHTML = "";
        if (Array.isArray(record.group2)) {
            record.group2.forEach((dist, idx) => {
                const li = document.createElement("li");
                li.className = "group-member-item";
                li.innerHTML = `
                    <span class="member-number">${idx + 1}.</span>
                    <span class="member-name">${escapeHtml(dist.name)}</span>
                    <span class="member-separator">—</span>
                    <span class="member-office">${escapeHtml(dist.office)}</span>
                `;
                histGroup2List.appendChild(li);
            });
        }

        historicalModal.classList.add("active");
    }

    function closeHistoricalModal() {
        historicalModal.classList.remove("active");
        activeHistoricalRecord = null;
    }

    modalHistoryClose.addEventListener("click", closeHistoricalModal);
    modalHistoryOk.addEventListener("click", closeHistoricalModal);
    historicalModal.addEventListener("click", (e) => {
        if (e.target === historicalModal) closeHistoricalModal();
    });

    btnHistCopy.addEventListener("click", () => {
        if (!activeHistoricalRecord) return;
        let text = `HISTORICAL TRAINING RECORD: ${activeHistoricalRecord.id}\n`;
        text += `Date & Time: ${activeHistoricalRecord.displayDate}\n\n`;

        text += `GROUP 1 (7 Distributors)\n`;
        text += `----------------------------------------\n`;
        activeHistoricalRecord.group1.forEach((item, idx) => {
            text += `${idx + 1}. ${item.name} — ${item.office}\n`;
        });

        text += `\nGROUP 2 (6 Distributors)\n`;
        text += `----------------------------------------\n`;
        activeHistoricalRecord.group2.forEach((item, idx) => {
            text += `${idx + 1}. ${item.name} — ${item.office}\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            showToast("Historical record copied to clipboard!");
        }).catch(() => {
            showToast("Failed to copy to clipboard.");
        });
    });

    // =========================================================================
    // 3. ADMIN AUTHENTICATION & UI STATE
    // =========================================================================

    /**
     * Updates the UI depending on whether the administrator session is active.
     */
    function syncAdminUIState() {
        const authenticated = isAdminAuthenticated();
        if (authenticated) {
            adminPanel.classList.add("active");
            adminTriggerContainer.style.display = "none";
        } else {
            adminPanel.classList.remove("active");
            adminTriggerContainer.style.display = "block";
        }
    }

    function openAdminAuthModal() {
        adminAuthError.classList.remove("active");
        adminPasswordInput.value = "";
        adminPasswordModal.classList.add("active");
        setTimeout(() => adminPasswordInput.focus(), 100);
    }

    function closeAdminAuthModal() {
        adminPasswordModal.classList.remove("active");
        adminPasswordInput.value = "";
        adminAuthError.classList.remove("active");
    }

    btnAdminResetTrigger.addEventListener("click", () => {
        if (isAdminAuthenticated()) {
            syncAdminUIState();
        } else {
            openAdminAuthModal();
        }
    });

    modalAdminClose.addEventListener("click", closeAdminAuthModal);
    modalAdminCancel.addEventListener("click", closeAdminAuthModal);
    adminPasswordModal.addEventListener("click", (e) => {
        if (e.target === adminPasswordModal) closeAdminAuthModal();
    });

    adminPasswordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const enteredPassword = adminPasswordInput.value;
        const isCorrect = verifyAdminPassword(enteredPassword);

        if (isCorrect) {
            closeAdminAuthModal();
            syncAdminUIState();
            showToast("Administrator access granted for this session.");
        } else {
            adminAuthError.classList.add("active");
            adminPasswordInput.select();
        }
    });

    btnLockAdmin.addEventListener("click", () => {
        lockAdminSession();
        syncAdminUIState();
        showToast("Administrator controls locked.");
    });

    // =========================================================================
    // 4. ADMIN ACTIONS (DESTRUCTIVE & PROTECTED)
    // =========================================================================

    // Action 1: Reset Current Entries
    btnAdminResetEntries.addEventListener("click", () => {
        if (!isAdminAuthenticated()) {
            openAdminAuthModal();
            return;
        }

        showConfirmation(
            "Reset Current Entries",
            "Are you sure you want to reset the active roster? This clears the active group assignments without deleting historical records.",
            async () => {
                clearDistributorEntries();
                if (typeof clearSupabaseRoster === "function") {
                    await clearSupabaseRoster();
                }
                showToast("Active roster has been cleared.");
            }
        );
    });

    // Action 2: Clear All Training Records
    btnAdminClearRecords.addEventListener("click", () => {
        if (!isAdminAuthenticated()) {
            openAdminAuthModal();
            return;
        }

        showConfirmation(
            "WARNING: Clear All Records",
            "WARNING: This will permanently delete all training group records stored on this browser. This action cannot be undone. Continue?",
            () => {
                clearAllTrainingRecords();
                renderRecordsList();
                showToast("All training records have been permanently cleared.");
            }
        );
    });

    // Action 3: Reset Entire Application
    btnAdminResetApp.addEventListener("click", () => {
        if (!isAdminAuthenticated()) {
            openAdminAuthModal();
            return;
        }

        showConfirmation(
            "RESET APPLICATION",
            "Are you sure you want to perform a full application reset? This will permanently clear all distributor entries, all training records, and temporary session states.",
            async () => {
                resetEntireApplication();
                if (typeof clearSupabaseRoster === "function") {
                    await clearSupabaseRoster();
                }
                renderRecordsList();
                showToast("Application has been completely reset.");
            }
        );
    });

    // =========================================================================
    // 5. GENERIC CONFIRMATION MODAL & UTILS
    // =========================================================================

    function showConfirmation(title, message, onConfirm) {
        modalConfirmTitle.textContent = title;
        modalConfirmMessage.textContent = message;
        pendingAdminAction = onConfirm;
        confirmModal.classList.add("active");
        modalConfirmOk.focus();
    }

    function closeConfirmation() {
        confirmModal.classList.remove("active");
        pendingAdminAction = null;
    }

    modalConfirmCancel.addEventListener("click", closeConfirmation);
    modalConfirmClose.addEventListener("click", closeConfirmation);
    confirmModal.addEventListener("click", (e) => {
        if (e.target === confirmModal) closeConfirmation();
    });

    modalConfirmOk.addEventListener("click", () => {
        if (typeof pendingAdminAction === "function") {
            pendingAdminAction();
        }
        closeConfirmation();
    });

    // Keyboard ESC listener
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (adminPasswordModal.classList.contains("active")) closeAdminAuthModal();
            if (historicalModal.classList.contains("active")) closeHistoricalModal();
            if (confirmModal.classList.contains("active")) closeConfirmation();
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
        }, 3000);
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

    // =========================================================================
    // 6. INITIALIZATION
    // =========================================================================
    renderRecordsList();
    syncAdminUIState();
});

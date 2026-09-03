/**
 * DISTRIBUTOR TRAINING GROUP RANDOMIZER
 * Core Utilities, Group Assignment Algorithm, Storage & Administration
 */

// =============================================================================
// 1. CONFIGURATION
// =============================================================================

/**
 * ADMINISTRATOR PASSWORD
 * 
 * IMPORTANT SECURITY NOTICE:
 * Stored client-side for basic protection against accidental resets.
 * Not cryptographically secure. Anyone inspecting the browser can view it.
 */
const ADMIN_PASSWORD = "CHANGE_THIS_PASSWORD";

// Storage Keys
const STORAGE_KEYS = {
    ACTIVE_ROSTER: "distributorActiveRoster",
    ENTRIES: "distributorTrainingEntries",
    RECORDS: "distributorTrainingRecords",
    HAS_RANDOMIZED: "hasRandomized",
    SESSION_ADMIN: "distributorAdminAuthenticated"
};

// Application Constants
const TOTAL_CAPACITY = 13;
const GROUP_1_CAPACITY = 7;
const GROUP_2_CAPACITY = 6;

// =============================================================================
// 2. STORAGE MANAGEMENT
// =============================================================================

function getStoredData(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) {
            return defaultValue;
        }
        return JSON.parse(raw);
    } catch (err) {
        console.warn(`[Storage] Failed to parse item "${key}" from localStorage:`, err);
        return defaultValue;
    }
}

function setStoredData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.error(`[Storage] Failed to store item "${key}" in localStorage:`, err);
        return false;
    }
}

/**
 * Retrieves the currently active roster of registered participants in this round.
 * @returns {Array<{id: string, name: string, office: string, group: number, assignedAt: string}>}
 */
function getActiveRoster() {
    const roster = getStoredData(STORAGE_KEYS.ACTIVE_ROSTER, []);
    return Array.isArray(roster) ? roster : [];
}

/**
 * Saves the active roster to localStorage.
 */
function saveActiveRoster(roster) {
    return setStoredData(STORAGE_KEYS.ACTIVE_ROSTER, roster);
}

/**
 * Clears the active roster.
 */
function clearActiveRoster() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROSTER);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Gets all previous training records, newest first.
 * @returns {Array<Object>}
 */
function getTrainingRecords() {
    const records = getStoredData(STORAGE_KEYS.RECORDS, []);
    return Array.isArray(records) ? records : [];
}

/**
 * Saves a new training record to localStorage.
 */
function saveTrainingRecord(record) {
    const records = getTrainingRecords();
    const exists = records.some(r => r.id === record.id);
    if (exists) {
        record.id = `${record.id}-${Math.floor(100 + Math.random() * 900)}`;
    }
    records.unshift(record);
    const success = setStoredData(STORAGE_KEYS.RECORDS, records);
    if (success) {
        setStoredData(STORAGE_KEYS.HAS_RANDOMIZED, true);
    }
    return success;
}

/**
 * Retrieves a specific historical record by its unique Round ID.
 */
function getRecordById(roundId) {
    const records = getTrainingRecords();
    return records.find(r => r.id === roundId) || null;
}

/**
 * Clears all training records from localStorage.
 */
function clearAllTrainingRecords() {
    try {
        localStorage.removeItem(STORAGE_KEYS.RECORDS);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Complete application wipe.
 */
function resetEntireApplication() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROSTER);
        localStorage.removeItem(STORAGE_KEYS.ENTRIES);
        localStorage.removeItem(STORAGE_KEYS.RECORDS);
        localStorage.removeItem(STORAGE_KEYS.HAS_RANDOMIZED);
        return true;
    } catch (err) {
        return false;
    }
}

// =============================================================================
// 3. ADMIN AUTHENTICATION
// =============================================================================

function isAdminAuthenticated() {
    try {
        return sessionStorage.getItem(STORAGE_KEYS.SESSION_ADMIN) === "true";
    } catch (err) {
        return false;
    }
}

function verifyAdminPassword(password) {
    if (password === ADMIN_PASSWORD) {
        try {
            sessionStorage.setItem(STORAGE_KEYS.SESSION_ADMIN, "true");
        } catch (err) {
            console.warn("[Session] Could not write to sessionStorage:", err);
        }
        return true;
    }
    return false;
}

function lockAdminSession() {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_ADMIN);
    } catch (err) {
        console.warn("[Session] Could not remove admin session:", err);
    }
}

// =============================================================================
// 4. INDIVIDUAL RANDOMIZATION & GROUP ASSIGNMENT
// =============================================================================

/**
 * Generates a unique Round ID: RND-YYYYMMDD-HHMMSS
 */
function generateRoundId(date = new Date()) {
    const pad = (num) => String(num).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `RND-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Formats a date into a clean string: "September 3, 2026 — 3:42 PM"
 */
function formatDisplayDateTime(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Unknown Date";
    const optionsDate = { year: "numeric", month: "long", day: "numeric" };
    const optionsTime = { hour: "numeric", minute: "2-digit", hour12: true };
    return `${d.toLocaleDateString("en-US", optionsDate)} — ${d.toLocaleTimeString("en-US", optionsTime)}`;
}

/**
 * Computes current occupancy of Group 1 and Group 2 from the active roster.
 */
function getRosterGroupCounts(roster = getActiveRoster()) {
    let group1Count = 0;
    let group2Count = 0;
    roster.forEach(member => {
        if (member.group === 1) group1Count++;
        else if (member.group === 2) group2Count++;
    });
    return {
        group1: group1Count,
        group2: group2Count,
        total: roster.length,
        remainingG1: Math.max(0, GROUP_1_CAPACITY - group1Count),
        remainingG2: Math.max(0, GROUP_2_CAPACITY - group2Count),
        isFull: roster.length >= TOTAL_CAPACITY
    };
}

/**
 * Randomly assigns an individual distributor into Group 1 (capacity 7) or Group 2 (capacity 6).
 * Uses unbiased proportional randomization based on remaining capacities.
 * 
 * @param {string} name 
 * @param {string} office 
 * @returns {{success: boolean, message?: string, member?: Object, isRoundCompleted?: boolean}}
 */
function assignIndividualDistributor(name, office) {
    const cleanedName = String(name || "").trim();
    const cleanedOffice = String(office || "").trim();

    if (!cleanedName || !cleanedOffice) {
        return {
            success: false,
            message: "Please enter both your name and office location."
        };
    }

    const roster = getActiveRoster();
    const counts = getRosterGroupCounts(roster);

    if (counts.isFull) {
        return {
            success: false,
            message: "All 13 distributor spots for this training round have been filled."
        };
    }

    // Check for duplicate name in current round
    const duplicate = roster.find(m => m.name.toLowerCase() === cleanedName.toLowerCase());
    if (duplicate) {
        return {
            success: false,
            message: `"${cleanedName}" is already registered in Group ${duplicate.group}.`
        };
    }

    // Determine assigned group fairly based on remaining slots
    let assignedGroup = 1;
    if (counts.remainingG1 > 0 && counts.remainingG2 > 0) {
        // Unbiased random choice weighted by remaining capacity
        const totalRemaining = counts.remainingG1 + counts.remainingG2;
        const randomVal = Math.random() * totalRemaining;
        assignedGroup = randomVal < counts.remainingG1 ? 1 : 2;
    } else if (counts.remainingG1 > 0) {
        assignedGroup = 1;
    } else {
        assignedGroup = 2;
    }

    const now = new Date();
    const member = {
        id: `DST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: cleanedName,
        office: cleanedOffice,
        group: assignedGroup,
        assignedAt: now.toISOString(),
        displayTime: formatDisplayDateTime(now)
    };

    roster.push(member);
    saveActiveRoster(roster);

    // If this entry completes the 13 distributors, automatically log the full round record
    let isRoundCompleted = false;
    if (roster.length === TOTAL_CAPACITY) {
        isRoundCompleted = true;
        archiveCompletedRound(roster);
    }

    return {
        success: true,
        member,
        isRoundCompleted,
        roster
    };
}

/**
 * Archives a completed 13-person roster into the historical training records log.
 */
function archiveCompletedRound(roster) {
    const group1 = roster.filter(m => m.group === 1).map(m => ({ name: m.name, office: m.office }));
    const group2 = roster.filter(m => m.group === 2).map(m => ({ name: m.name, office: m.office }));

    const now = new Date();
    const record = {
        id: generateRoundId(now),
        createdAt: now.toISOString(),
        displayDate: formatDisplayDateTime(now),
        group1,
        group2
    };

    saveTrainingRecord(record);
    return record;
}

/**
 * Automated Test Suite for Distributor Training Group Randomizer (Individual Entry Mode)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const mockStorage = { local: {}, session: {} };

global.localStorage = {
    getItem: (key) => (key in mockStorage.local ? mockStorage.local[key] : null),
    setItem: (key, val) => { mockStorage.local[key] = String(val); },
    removeItem: (key) => { delete mockStorage.local[key]; },
    clear: () => { mockStorage.local = {}; }
};

global.sessionStorage = {
    getItem: (key) => (key in mockStorage.session ? mockStorage.session[key] : null),
    setItem: (key, val) => { mockStorage.session[key] = String(val); },
    removeItem: (key) => { delete mockStorage.session[key]; },
    clear: () => { mockStorage.session = {}; }
};

const randomizerCode = fs.readFileSync(path.join(__dirname, 'js', 'randomizer.js'), 'utf8');
vm.runInThisContext(randomizerCode);

console.log("=== RUNNING INDIVIDUAL ENTRY TEST SUITE ===");

// -------------------------------------------------------------
// Test 1: Simulate 100 complete rounds of 13 participants
// -------------------------------------------------------------
console.log("\n[Test 1] Testing 100 Complete Rounds of Individual Randomization...");
clearAllTrainingRecords();

for (let round = 0; round < 100; round++) {
    clearActiveRoster();

    for (let i = 1; i <= 13; i++) {
        const res = assignIndividualDistributor(`Distributor ${i}`, `Office ${i}`);
        assert.strictEqual(res.success, true, `Entry ${i} must succeed in round ${round}`);
        assert(res.member.group === 1 || res.member.group === 2, "Group must be 1 or 2");

        if (i === 13) {
            assert.strictEqual(res.isRoundCompleted, true, "Round must be marked complete on 13th entry");
        } else {
            assert.strictEqual(res.isRoundCompleted, false, "Round must not be marked complete before 13 entries");
        }
    }

    // Check full roster counts
    const roster = getActiveRoster();
    assert.strictEqual(roster.length, 13);
    const g1 = roster.filter(m => m.group === 1);
    const g2 = roster.filter(m => m.group === 2);
    assert.strictEqual(g1.length, 7, `Group 1 must have exactly 7 members in round ${round}`);
    assert.strictEqual(g2.length, 6, `Group 2 must have exactly 6 members in round ${round}`);

    // Verify rejection when round is full (14th person)
    const overflowRes = assignIndividualDistributor("Extra Person", "Extra Office");
    assert.strictEqual(overflowRes.success, false, "Must reject 14th distributor when round is full");
}

// Verify 100 historical records created
const allRecords = getTrainingRecords();
assert.strictEqual(allRecords.length, 100, "Should have 100 completed training records logged");
console.log("✓ Test 1 passed: 100 rounds verified with exact 7 in Group 1 and 6 in Group 2, auto-archived.");

// -------------------------------------------------------------
// Test 2: Validation & Duplicates
// -------------------------------------------------------------
console.log("\n[Test 2] Testing Validation & Duplicate Prevention...");
clearActiveRoster();
const blankName = assignIndividualDistributor("", "Office 1");
assert.strictEqual(blankName.success, false, "Must reject blank name");

const blankOffice = assignIndividualDistributor("Name 1", "");
assert.strictEqual(blankOffice.success, false, "Must reject blank office");

const firstValid = assignIndividualDistributor("Alice Smith", "Lagos");
assert.strictEqual(firstValid.success, true);

const duplicate = assignIndividualDistributor("Alice Smith", "Lagos Alternate");
assert.strictEqual(duplicate.success, false, "Must reject duplicate participant name in active round");
console.log("✓ Test 2 passed: Validation & duplicate check operational.");

// -------------------------------------------------------------
// Test 3: Admin Actions
// -------------------------------------------------------------
console.log("\n[Test 3] Testing Admin Controls & Password...");
assert.strictEqual(isAdminAuthenticated(), false);
assert.strictEqual(verifyAdminPassword("WRONG"), false);
assert.strictEqual(verifyAdminPassword("EJI2379"), true);
assert.strictEqual(isAdminAuthenticated(), true);

resetEntireApplication();
assert.strictEqual(getActiveRoster().length, 0);
assert.strictEqual(getTrainingRecords().length, 0);
console.log("✓ Test 3 passed: Admin password & application reset operational.");

console.log("\n=================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY!");
console.log("=================================================");

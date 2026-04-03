'use strict';

const HTML = `
  <div id="dayTitle"></div>
  <p id="dayFocus"></p>
  <p id="dayInstruction"></p>
  <p id="dayPrompt"></p>
  <div class="progress-bar"><div id="progressFill" class="progress-fill"></div></div>
  <p id="progressText"></p>
  <button id="completeBtn" type="button">Mark Day Complete</button>
  <button id="resetBtn" type="button">Reset Progress</button>
  <button id="saveJournalBtn" type="button">Save Journal</button>
  <p id="saveMessage"></p>
  <textarea id="journalEntry"></textarea>
  <select id="mood"><option value="">Choose one</option><option>Good</option></select>
  <select id="energy"><option value="">Choose one</option><option>3</option></select>
  <select id="stress"><option value="">Choose one</option><option>2</option></select>
`;

// ─── helpers ────────────────────────────────────────────────────────────────

function midnight(year, month, day) {
  return new Date(year, month - 1, day).getTime();
}

/** Load (or re-load) the script fresh for each test suite requiring it. */
function loadScript() {
  jest.resetModules();
  document.body.innerHTML = HTML;
  return require('../script');
}

// ─── days array ─────────────────────────────────────────────────────────────

describe('days array', () => {
  let script;

  beforeAll(() => {
    localStorage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(midnight(2025, 1, 1));
    script = loadScript();
  });

  afterAll(() => jest.restoreAllMocks());

  test('contains exactly 30 entries', () => {
    expect(script.days).toHaveLength(30);
  });

  test('day 1 has correct hard-coded content', () => {
    expect(script.days[0].title).toBe('Day 1: Begin Gently');
    expect(script.days[0].focus).toBe('Intention: Start softly and simply.');
    expect(script.days[0].instruction).toContain('5 minutes');
    expect(script.days[0].prompt).toBe('What did it feel like to slow down?');
  });

  test('day 2 has correct hard-coded content', () => {
    expect(script.days[1].title).toBe('Day 2: Breath and Posture');
    expect(script.days[1].instruction).toContain('6 minutes');
  });

  test('day 3 has correct hard-coded content', () => {
    expect(script.days[2].title).toBe('Day 3: Slowing Down');
    expect(script.days[2].instruction).toContain('7 minutes');
  });

  test.each([4, 5, 10, 14, 15, 20, 30])('day %i has generated content', (i) => {
    const d = script.days[i - 1];
    expect(d.title).toBe(`Day ${i}`);
    expect(d.focus).toBe('Intention: Stay present and keep going.');
    expect(d.prompt).toBe('What did you notice in your mind and body today?');
  });

  test('generated walking minutes cap at 20 (days 15–30)', () => {
    for (let i = 15; i <= 30; i++) {
      expect(script.days[i - 1].instruction).toContain('20 minutes');
    }
  });

  test('generated walking minutes increase correctly for days 4–14', () => {
    for (let i = 4; i <= 14; i++) {
      const expected = 5 + i;
      expect(script.days[i - 1].instruction).toContain(`${expected} minutes`);
    }
  });

  test('every day entry has required keys', () => {
    script.days.forEach((d) => {
      expect(d).toHaveProperty('title');
      expect(d).toHaveProperty('focus');
      expect(d).toHaveProperty('instruction');
      expect(d).toHaveProperty('prompt');
    });
  });
});

// ─── getTodayLocalMidnight ───────────────────────────────────────────────────

describe('getTodayLocalMidnight', () => {
  let script;
  const FIXED = new Date(2025, 5, 15, 14, 30, 0); // 15 Jun 2025 14:30

  beforeAll(() => {
    localStorage.clear();
    jest.useFakeTimers().setSystemTime(FIXED);
    script = loadScript();
  });

  afterAll(() => jest.useRealTimers());

  test('returns a Date instance', () => {
    expect(script.getTodayLocalMidnight()).toBeInstanceOf(Date);
  });

  test('time components are zero', () => {
    const d = script.getTodayLocalMidnight();
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  test('year, month, date match the mocked current day', () => {
    const d = script.getTodayLocalMidnight();
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // June → 5 (0-indexed)
    expect(d.getDate()).toBe(15);
  });
});

// ─── getStartDate ────────────────────────────────────────────────────────────

describe('getStartDate', () => {
  const FIXED = new Date(2025, 0, 10); // 10 Jan 2025

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers().setSystemTime(FIXED);
    loadScript(); // side-effect: fires loadDay which calls getStartDate
  });

  afterEach(() => jest.useRealTimers());

  test('sets startDate in localStorage when none exists', () => {
    expect(localStorage.getItem('startDate')).not.toBeNull();
  });

  test('persists the current date as ISO string on first call', () => {
    const stored = new Date(localStorage.getItem('startDate'));
    expect(stored.getFullYear()).toBe(2025);
    expect(stored.getMonth()).toBe(0);
    expect(stored.getDate()).toBe(10);
  });

  test('reuses an existing startDate from localStorage', () => {
    const existing = new Date(2025, 0, 1).toISOString();
    localStorage.setItem('startDate', existing);
    const { getStartDate } = loadScript();
    expect(getStartDate().toISOString()).toBe(existing);
  });
});

// ─── getUnlockedDay ──────────────────────────────────────────────────────────

describe('getUnlockedDay', () => {
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  function setup(startYear, startMonth, startDay, nowYear, nowMonth, nowDay) {
    localStorage.clear();
    const startIso = new Date(startYear, startMonth - 1, startDay).toISOString();
    localStorage.setItem('startDate', startIso);
    jest.useFakeTimers().setSystemTime(new Date(nowYear, nowMonth - 1, nowDay));
    return loadScript();
  }

  test('returns 1 when start date is today', () => {
    const { getUnlockedDay } = setup(2025, 6, 1, 2025, 6, 1);
    expect(getUnlockedDay()).toBe(1);
  });

  test('returns 2 after 1 day has passed', () => {
    const { getUnlockedDay } = setup(2025, 6, 1, 2025, 6, 2);
    expect(getUnlockedDay()).toBe(2);
  });

  test('returns 15 after 14 days have passed', () => {
    const { getUnlockedDay } = setup(2025, 6, 1, 2025, 6, 15);
    expect(getUnlockedDay()).toBe(15);
  });

  test('returns 30 after exactly 29 days have passed', () => {
    const { getUnlockedDay } = setup(2025, 6, 1, 2025, 6, 30);
    expect(getUnlockedDay()).toBe(30);
  });

  test('clamps to 30 even when more than 29 days have passed', () => {
    const { getUnlockedDay } = setup(2025, 1, 1, 2025, 6, 15);
    expect(getUnlockedDay()).toBe(30);
  });

  test('never returns less than 1 (start date in future)', () => {
    const { getUnlockedDay } = setup(2025, 6, 15, 2025, 6, 1);
    expect(getUnlockedDay()).toBe(1);
  });
});

// ─── getCurrentDayToShow ─────────────────────────────────────────────────────

describe('getCurrentDayToShow', () => {
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  function setupWith(completedList, daysElapsed) {
    localStorage.clear();
    const startIso = new Date(2025, 0, 1).toISOString();
    localStorage.setItem('startDate', startIso);
    localStorage.setItem('completedDays', JSON.stringify(completedList));
    const now = new Date(2025, 0, 1 + daysElapsed);
    jest.useFakeTimers().setSystemTime(now);
    return loadScript();
  }

  test('returns 1 when nothing completed and on day 1', () => {
    const { getCurrentDayToShow } = setupWith([], 0);
    expect(getCurrentDayToShow()).toBe(1);
  });

  test('returns next incomplete day when unlocked', () => {
    // Completed days 1 and 2 on day 3 (2 days elapsed)
    const { getCurrentDayToShow } = setupWith([1, 2], 2);
    expect(getCurrentDayToShow()).toBe(3);
  });

  test('does not show day beyond unlocked day', () => {
    // Completed day 1 but only 1 day elapsed (unlockedDay = 2, next = 2)
    const { getCurrentDayToShow } = setupWith([1], 1);
    expect(getCurrentDayToShow()).toBe(2);
  });

  test('caps at 30 when all 30 days are completed', () => {
    const allDone = Array.from({ length: 30 }, (_, i) => i + 1);
    const { getCurrentDayToShow } = setupWith(allDone, 30);
    expect(getCurrentDayToShow()).toBe(30);
  });
});

// ─── updateProgress ──────────────────────────────────────────────────────────

describe('updateProgress', () => {
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  function setupWithCompleted(n) {
    localStorage.clear();
    const completed = Array.from({ length: n }, (_, i) => i + 1);
    localStorage.setItem('completedDays', JSON.stringify(completed));
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1 + n));
    return loadScript();
  }

  test('shows "0 of 30 days completed" at start', () => {
    setupWithCompleted(0);
    expect(document.getElementById('progressText').textContent).toBe('0 of 30 days completed');
  });

  test('shows correct count after some completions', () => {
    setupWithCompleted(10);
    expect(document.getElementById('progressText').textContent).toBe('10 of 30 days completed');
  });

  test('shows "30 of 30 days completed" when finished', () => {
    setupWithCompleted(30);
    expect(document.getElementById('progressText').textContent).toBe('30 of 30 days completed');
  });

  test('sets progressFill width to correct percentage', () => {
    setupWithCompleted(15);
    const fill = document.getElementById('progressFill');
    expect(fill.style.width).toBe('50%');
  });

  test('sets progressFill width to 0% at start', () => {
    setupWithCompleted(0);
    expect(document.getElementById('progressFill').style.width).toBe('0%');
  });

  test('sets progressFill width to 100% when complete', () => {
    setupWithCompleted(30);
    expect(document.getElementById('progressFill').style.width).toBe('100%');
  });
});

// ─── loadDay – normal (active) day ──────────────────────────────────────────

describe('loadDay – active day', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1)); // day 1
    loadScript();
  });

  afterEach(() => jest.useRealTimers());

  test('sets dayTitle to the day title', () => {
    expect(document.getElementById('dayTitle').textContent).toBe('Day 1: Begin Gently');
  });

  test('sets dayFocus', () => {
    expect(document.getElementById('dayFocus').textContent).toContain('Intention');
  });

  test('sets dayInstruction', () => {
    expect(document.getElementById('dayInstruction').textContent).not.toBe('');
  });

  test('sets dayPrompt', () => {
    expect(document.getElementById('dayPrompt').textContent).not.toBe('');
  });

  test('completeBtn is enabled and labelled correctly', () => {
    const btn = document.getElementById('completeBtn');
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Mark Day Complete');
  });
});

// ─── loadDay – today complete (all caught-up, next day locked) ───────────────
//
// After a user completes the latest unlocked day the completeBtn handler sets
// "✅ Today Complete" messaging.  On the next page load, getCurrentDayToShow()
// will return the same day (still the most-recently-unlocked one) and the
// "completed day" branch of loadDay fires, showing the ✅ title.

describe('loadDay – today complete state', () => {
  beforeEach(() => {
    localStorage.clear();
    // Day 1 is the only unlocked day and has already been completed.
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    localStorage.setItem('completedDays', JSON.stringify([1]));
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1)); // unlockedDay = 1
    loadScript();
  });

  afterEach(() => jest.useRealTimers());

  test('shows completed title with ✅', () => {
    expect(document.getElementById('dayTitle').textContent).toContain('✅');
  });

  test('shows the day focus text', () => {
    expect(document.getElementById('dayFocus').textContent).not.toBe('');
  });

  test('completeBtn is disabled', () => {
    expect(document.getElementById('completeBtn').disabled).toBe(true);
  });

  test('completeBtn text contains "Completed"', () => {
    expect(document.getElementById('completeBtn').textContent).toContain('Completed');
  });
});

// ─── loadDay – already completed day ─────────────────────────────────────────

describe('loadDay – completed day', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    localStorage.setItem('completedDays', JSON.stringify([1]));
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();
  });

  afterEach(() => jest.useRealTimers());

  test('appends ✅ to dayTitle', () => {
    expect(document.getElementById('dayTitle').textContent).toContain('✅');
  });

  test('completeBtn shows completed state and is disabled', () => {
    const btn = document.getElementById('completeBtn');
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Completed');
  });
});

// ─── completeBtn click handler ───────────────────────────────────────────────

describe('completeBtn click', () => {
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  test('saves completed day to localStorage', () => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();

    document.getElementById('completeBtn').click();

    const stored = JSON.parse(localStorage.getItem('completedDays'));
    expect(stored).toContain(1);
  });

  test('disables completeBtn after click', () => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();

    document.getElementById('completeBtn').click();
    expect(document.getElementById('completeBtn').disabled).toBe(true);
  });

  test('updates button text to "Completed ✅"', () => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();

    document.getElementById('completeBtn').click();
    expect(document.getElementById('completeBtn').textContent).toContain('Completed');
  });

  test('does not duplicate day in completedDays on double click', () => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();

    document.getElementById('completeBtn').click();
    document.getElementById('completeBtn').click();

    const stored = JSON.parse(localStorage.getItem('completedDays'));
    expect(stored.filter((d) => d === 1)).toHaveLength(1);
  });

  test('updates progress text after completing a day', () => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();

    document.getElementById('completeBtn').click();
    expect(document.getElementById('progressText').textContent).toBe('1 of 30 days completed');
  });

  test('shows challenge-complete message after day 30', () => {
    localStorage.clear();
    // 29 days already completed
    const prev = Array.from({ length: 29 }, (_, i) => i + 1);
    localStorage.setItem('completedDays', JSON.stringify(prev));
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 1, 1)); // 31 days elapsed → unlockedDay 30
    loadScript();

    document.getElementById('completeBtn').click();
    expect(document.getElementById('dayTitle').textContent).toContain('Challenge Complete');
  });

  test('does nothing when day is locked', () => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    localStorage.setItem('completedDays', JSON.stringify([1, 2]));
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 2)); // unlockedDay=2, nextIncomplete=3 → locked
    loadScript();

    document.getElementById('completeBtn').click();
    // completedDays should still be [1,2]
    const stored = JSON.parse(localStorage.getItem('completedDays'));
    expect(stored).toHaveLength(2);
  });
});

// ─── saveJournalBtn click handler ────────────────────────────────────────────

describe('saveJournalBtn click', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 1));
    loadScript();
  });

  afterEach(() => jest.useRealTimers());

  test('saves journal entry to localStorage', () => {
    document.getElementById('journalEntry').value = 'Felt great today';
    document.getElementById('mood').value = 'Good';
    document.getElementById('energy').value = '3';
    document.getElementById('stress').value = '2';

    document.getElementById('saveJournalBtn').click();

    const stored = JSON.parse(localStorage.getItem('journalDay1'));
    expect(stored.entry).toBe('Felt great today');
    expect(stored.mood).toBe('Good');
    expect(stored.energy).toBe('3');
    expect(stored.stress).toBe('2');
  });

  test('shows save confirmation message', () => {
    document.getElementById('saveJournalBtn').click();
    expect(document.getElementById('saveMessage').textContent).toContain('saved');
  });

  test('saves empty entry without error', () => {
    document.getElementById('journalEntry').value = '';
    document.getElementById('saveJournalBtn').click();

    const stored = JSON.parse(localStorage.getItem('journalDay1'));
    expect(stored).not.toBeNull();
    expect(stored.entry).toBe('');
  });

  test('overwrites an existing journal entry for the same day', () => {
    document.getElementById('journalEntry').value = 'First entry';
    document.getElementById('saveJournalBtn').click();

    document.getElementById('journalEntry').value = 'Updated entry';
    document.getElementById('saveJournalBtn').click();

    const stored = JSON.parse(localStorage.getItem('journalDay1'));
    expect(stored.entry).toBe('Updated entry');
  });
});

// ─── resetBtn click handler ──────────────────────────────────────────────────

describe('resetBtn click', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('startDate', new Date(2025, 0, 1).toISOString());
    localStorage.setItem('completedDays', JSON.stringify([1, 2, 3]));
    for (let i = 1; i <= 3; i++) {
      localStorage.setItem(`journalDay${i}`, JSON.stringify({ entry: 'test' }));
    }
    jest.useFakeTimers().setSystemTime(new Date(2025, 0, 4));
    loadScript();
  });

  afterEach(() => jest.useRealTimers());

  test('clears completedDays from localStorage after confirmation', () => {
    window.confirm = jest.fn(() => true);
    document.getElementById('resetBtn').click();
    expect(localStorage.getItem('completedDays')).toBeNull();
  });

  test('clears startDate from localStorage and re-initializes it on reset', () => {
    const originalStart = localStorage.getItem('startDate');
    window.confirm = jest.fn(() => true);
    document.getElementById('resetBtn').click();
    // loadDay() is called at the end of the reset handler which re-initializes
    // startDate to today's date via getStartDate().
    const newStart = localStorage.getItem('startDate');
    expect(newStart).not.toBeNull();
    // The new startDate should reflect today (the mocked system time).
    const newDate = new Date(newStart);
    expect(newDate.getDate()).toBe(4);   // Jan 4, 2025
    expect(newDate.getMonth()).toBe(0);  // January
    expect(newDate.getFullYear()).toBe(2025);
  });

  test('removes all journalDay entries after confirmation', () => {
    window.confirm = jest.fn(() => true);
    document.getElementById('resetBtn').click();
    for (let i = 1; i <= 30; i++) {
      expect(localStorage.getItem(`journalDay${i}`)).toBeNull();
    }
  });

  test('clears journal form fields after confirmation', () => {
    document.getElementById('journalEntry').value = 'something';
    window.confirm = jest.fn(() => true);
    document.getElementById('resetBtn').click();
    expect(document.getElementById('journalEntry').value).toBe('');
  });

  test('does NOT clear data when user cancels', () => {
    window.confirm = jest.fn(() => false);
    document.getElementById('resetBtn').click();
    expect(localStorage.getItem('completedDays')).not.toBeNull();
    expect(localStorage.getItem('startDate')).not.toBeNull();
  });

  test('reloads to day 1 display after reset', () => {
    window.confirm = jest.fn(() => true);
    document.getElementById('resetBtn').click();
    expect(document.getElementById('dayTitle').textContent).toBe('Day 1: Begin Gently');
  });
});

/**
 * Latin Square Practice App Orchestrator
 */

class LatinSquareApp {
    constructor() {
        this.storage = new StorageManager();
        this.sound = new SoundEffects();
        this.settings = this.storage.getSettings();
        this.engine = new LatinSquareEngine(this.settings.gridSize);

        // State
        this.currentMode = 'practice'; // 'practice', 'exam', 'blitz'
        this.currentPuzzle = null;
        this.userNotes = {}; // key: "r,c" -> string
        this.questionStartTime = Date.now();
        this.isAnswered = false;

        // Exam State
        this.examState = {
            active: false,
            timerInterval: null,
            timeRemaining: 0,
            questionIndex: 0,
            totalQuestions: 20,
            correctCount: 0,
            answers: []
        };

        this.init();
    }

    init() {
        this.applySettings();
        this.setupEventListeners();
        this.loadNewPuzzle();
    }

    applySettings() {
        document.body.setAttribute('data-theme', this.settings.theme);
        this.engine.setSize(this.settings.gridSize);

        // Update instruction letters text based on size
        const letterList = LETTERS.slice(0, this.settings.gridSize);
        const lastLetter = letterList[letterList.length - 1];
        const leadingLetters = letterList.slice(0, -1).join(', ');
        const instructionSymbols = document.getElementById('instruction-symbols');
        if (instructionSymbols) {
            instructionSymbols.textContent = `In the square there can only occur the letters ${leadingLetters} and ${lastLetter}.`;
        }

        // Apply sound setting
        this.sound.muted = !this.settings.soundEnabled;
        this.updateSoundIcon();

        // Apply font scale
        this.applyFontScale(this.settings.fontSizeLevel);

        // Update difficulty badge
        const badgeDifficulty = document.getElementById('badge-difficulty');
        if (badgeDifficulty) {
            badgeDifficulty.textContent = `Difficulty: ${this.settings.difficulty.toUpperCase()}`;
        }
    }

    applyFontScale(level) {
        const scales = { 1: 0.85, 2: 1.0, 3: 1.18 };
        const scale = scales[level] || 1.0;
        document.documentElement.style.setProperty('--font-scale', scale);

        document.querySelectorAll('.font-scaler-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx + 1 === level);
        });
    }

    setupEventListeners() {
        // Mode Tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });

        // Instructions Accordion
        const btnToggleInstructions = document.getElementById('btn-toggle-instructions');
        const instructionsContent = document.getElementById('instructions-content');
        const instructionToggleIcon = document.getElementById('instruction-toggle-icon');

        if (btnToggleInstructions) {
            btnToggleInstructions.addEventListener('click', () => {
                const isHidden = instructionsContent.style.display === 'none';
                instructionsContent.style.display = isHidden ? 'block' : 'none';
                instructionToggleIcon.textContent = isHidden ? '︽' : '︾';
            });
        }

        // Font Scaler Buttons
        document.querySelectorAll('.font-scaler-btn').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                this.settings.fontSizeLevel = idx + 1;
                this.storage.saveSettings(this.settings);
                this.applyFontScale(this.settings.fontSizeLevel);
                this.sound.playClick();
            });
        });

        // Nav Actions
        document.getElementById('btn-sound').addEventListener('click', () => {
            this.settings.soundEnabled = !this.sound.toggleMute();
            this.storage.saveSettings(this.settings);
            this.updateSoundIcon();
            if (this.settings.soundEnabled) this.sound.playClick();
        });

        document.getElementById('btn-stats').addEventListener('click', () => {
            this.openStatsModal();
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Practice Controls
        document.getElementById('btn-next').addEventListener('click', () => {
            this.sound.playClick();
            this.loadNewPuzzle();
        });

        document.getElementById('btn-hint').addEventListener('click', () => {
            this.showSolutionModal();
        });

        document.getElementById('btn-clear-notes').addEventListener('click', () => {
            this.userNotes = {};
            this.renderGrid();
            this.sound.playClick();
        });

        // Exam Controls
        document.getElementById('btn-skip-exam').addEventListener('click', () => {
            this.handleExamAnswer(null); // Skipped
        });

        document.getElementById('btn-end-exam').addEventListener('click', () => {
            if (confirm('Are you sure you want to end the exam early?')) {
                this.finishExam();
            }
        });

        // Exam summary retake & back
        document.getElementById('btn-exam-retake').addEventListener('click', () => {
            this.closeModal('modal-exam-result');
            this.startExam();
        });

        document.getElementById('btn-exam-back-practice').addEventListener('click', () => {
            this.closeModal('modal-exam-result');
            this.switchMode('practice');
        });

        // Modal Close Buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetModal = e.target.closest('[data-close]').dataset.close;
                this.closeModal(targetModal);
            });
        });

        // Save Settings Form
        document.getElementById('btn-save-settings').addEventListener('click', () => {
            this.saveSettingsFromForm();
        });

        // Reset Stats
        document.getElementById('btn-reset-stats').addEventListener('click', () => {
            if (confirm('Reset all statistics and exam records?')) {
                this.storage.resetStats();
                this.openStatsModal();
            }
        });

        // Global Keyboard Handler
        window.addEventListener('keydown', (e) => {
            // Ignore if in input or select
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            const key = e.key.toUpperCase();

            // Check if key is a valid answer letter
            const currentLetters = LETTERS.slice(0, this.settings.gridSize);
            if (currentLetters.includes(key)) {
                this.submitAnswer(key);
                return;
            }

            // Space: Next question
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.currentMode === 'practice') {
                    this.loadNewPuzzle();
                } else if (this.currentMode === 'exam') {
                    this.handleExamAnswer(null); // Skip
                }
                return;
            }

            // 'H': Hint
            if (key === 'H' && this.currentMode === 'practice') {
                this.showSolutionModal();
                return;
            }

            // 'Escape': Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    }

    updateSoundIcon() {
        const soundOn = document.getElementById('icon-sound-on');
        const soundOff = document.getElementById('icon-sound-off');
        if (soundOn && soundOff) {
            soundOn.style.display = this.sound.muted ? 'none' : 'block';
            soundOff.style.display = this.sound.muted ? 'block' : 'none';
        }
    }

    switchMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        const practiceControls = document.getElementById('practice-controls');
        const examControls = document.getElementById('exam-controls');
        const badgeTimer = document.getElementById('badge-timer');
        const badgeProgress = document.getElementById('badge-progress');

        if (mode === 'exam') {
            practiceControls.style.display = 'none';
            examControls.style.display = 'flex';
            badgeTimer.style.display = 'inline-flex';
            badgeProgress.style.display = 'inline-flex';
            this.startExam();
        } else {
            // Stop any active exam timer
            if (this.examState.timerInterval) {
                clearInterval(this.examState.timerInterval);
                this.examState.timerInterval = null;
            }
            practiceControls.style.display = 'flex';
            examControls.style.display = 'none';
            badgeTimer.style.display = 'none';
            badgeProgress.style.display = 'none';
            this.loadNewPuzzle();
        }
    }

    loadNewPuzzle() {
        this.isAnswered = false;
        this.userNotes = {};
        this.clearFeedback();

        // Generate puzzle
        this.currentPuzzle = this.engine.generatePuzzle(this.settings.difficulty);
        this.questionStartTime = Date.now();

        this.renderGrid();
        this.renderAnswerColumn();
        this.updateStreakBadge();
    }

    renderGrid() {
        const gridContainer = document.getElementById('latin-grid');
        gridContainer.innerHTML = '';

        const n = this.settings.gridSize;
        const target = this.currentPuzzle.target;
        const initialGrid = this.currentPuzzle.initialGrid;

        for (let r = 0; r < n; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'grid-row';

            for (let c = 0; c < n; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (r === target.r && c === target.c) {
                    cell.classList.add('target-cell');
                    cell.textContent = '?';
                } else if (initialGrid[r][c] !== '') {
                    cell.textContent = initialGrid[r][c];
                } else {
                    // Empty cell -> editable note in practice mode
                    cell.classList.add('editable-cell');
                    const note = this.userNotes[`${r},${c}`];
                    if (note) {
                        cell.textContent = note;
                        cell.classList.add('has-note');
                    }

                    // Click to cycle/type draft letters in scratchpad
                    cell.addEventListener('click', () => {
                        this.handleCellDraftInput(r, c);
                    });
                }

                rowDiv.appendChild(cell);
            }
            gridContainer.appendChild(rowDiv);
        }
    }

    handleCellDraftInput(r, c) {
        if (this.isAnswered) return;
        const key = `${r},${c}`;
        const current = this.userNotes[key] || '';
        const letters = LETTERS.slice(0, this.settings.gridSize);
        const nextIdx = current === '' ? 0 : (letters.indexOf(current) + 1);

        if (nextIdx >= letters.length) {
            delete this.userNotes[key];
        } else {
            this.userNotes[key] = letters[nextIdx];
        }

        this.renderGrid();
        this.sound.playClick();
    }

    renderAnswerColumn() {
        const colContainer = document.getElementById('answer-column');
        colContainer.innerHTML = '';

        const letters = LETTERS.slice(0, this.settings.gridSize);
        letters.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = letter;
            btn.dataset.letter = letter;

            btn.addEventListener('click', () => {
                this.submitAnswer(letter);
            });

            colContainer.appendChild(btn);
        });
    }

    submitAnswer(chosenLetter) {
        if (this.isAnswered && this.currentMode !== 'blitz') return;

        const timeTakenMs = Date.now() - this.questionStartTime;
        const isCorrect = chosenLetter === this.currentPuzzle.correctAnswer;

        if (this.currentMode === 'exam') {
            this.handleExamAnswer(chosenLetter, isCorrect, timeTakenMs);
            return;
        }

        // Practice or Blitz Mode
        this.isAnswered = true;
        const buttons = document.querySelectorAll('.answer-btn');

        buttons.forEach(btn => {
            if (btn.dataset.letter === chosenLetter) {
                btn.classList.add(isCorrect ? 'selected-correct' : 'selected-wrong');
            }
            if (!isCorrect && btn.dataset.letter === this.currentPuzzle.correctAnswer) {
                btn.classList.add('reveal-correct');
            }
        });

        // Play Sound
        if (isCorrect) {
            this.sound.playCorrect();
            this.showFeedback('✓ Correct! Well reasoned.', 'correct');
        } else {
            this.sound.playWrong();
            this.showFeedback(`✗ Incorrect. The correct missing letter is "${this.currentPuzzle.correctAnswer}".`, 'wrong');
            document.getElementById('latin-grid').classList.add('shake');
            setTimeout(() => {
                document.getElementById('latin-grid').classList.remove('shake');
            }, 350);
        }

        // Record in LocalStorage
        this.storage.recordAnswer(isCorrect, timeTakenMs, this.settings.difficulty);
        this.updateStreakBadge();

        // Speed Blitz auto-advance
        if (this.currentMode === 'blitz') {
            setTimeout(() => {
                this.loadNewPuzzle();
            }, isCorrect ? 400 : 900);
        }
    }

    showFeedback(msg, type) {
        const banner = document.getElementById('feedback-banner');
        banner.textContent = msg;
        banner.className = `feedback-banner ${type}`;
    }

    clearFeedback() {
        const banner = document.getElementById('feedback-banner');
        banner.textContent = '';
        banner.className = 'feedback-banner';
    }

    updateStreakBadge() {
        const stats = this.storage.getStats();
        const streakBadge = document.getElementById('badge-streak');
        if (streakBadge) {
            streakBadge.textContent = `🔥 Streak: ${stats.currentStreak}`;
        }
    }

    /* =========================================================================
       Exam Mode Logic
       ========================================================================= */
    startExam() {
        this.examState = {
            active: true,
            timerInterval: null,
            timeRemaining: parseInt(this.settings.examDuration, 10),
            questionIndex: 1,
            totalQuestions: parseInt(this.settings.examQuestions, 10),
            correctCount: 0,
            answers: []
        };

        this.updateExamBadges();
        this.loadNewPuzzle();

        // Start countdown timer
        this.examState.timerInterval = setInterval(() => {
            this.examState.timeRemaining--;
            this.updateExamBadges();

            if (this.examState.timeRemaining <= 0) {
                clearInterval(this.examState.timerInterval);
                this.examState.timerInterval = null;
                this.finishExam();
            }
        }, 1000);
    }

    updateExamBadges() {
        const badgeTimer = document.getElementById('badge-timer');
        const badgeProgress = document.getElementById('badge-progress');

        const mins = Math.floor(Math.max(0, this.examState.timeRemaining) / 60).toString().padStart(2, '0');
        const secs = (Math.max(0, this.examState.timeRemaining) % 60).toString().padStart(2, '0');

        badgeTimer.textContent = `⏱ ${mins}:${secs}`;
        badgeProgress.textContent = `Question ${this.examState.questionIndex}/${this.examState.totalQuestions}`;
    }

    handleExamAnswer(chosenLetter, isCorrect, timeTakenMs) {
        this.examState.answers.push({
            questionNumber: this.examState.questionIndex,
            chosen: chosenLetter,
            correct: this.currentPuzzle.correctAnswer,
            isCorrect: !!isCorrect,
            timeTakenMs: timeTakenMs || 0
        });

        if (isCorrect) {
            this.examState.correctCount++;
            this.sound.playClick();
        } else {
            this.sound.playClick();
        }

        if (this.examState.questionIndex >= this.examState.totalQuestions) {
            this.finishExam();
        } else {
            this.examState.questionIndex++;
            this.updateExamBadges();
            this.loadNewPuzzle();
        }
    }

    finishExam() {
        if (this.examState.timerInterval) {
            clearInterval(this.examState.timerInterval);
            this.examState.timerInterval = null;
        }

        this.sound.playComplete();

        const totalAnswered = this.examState.answers.length;
        const correct = this.examState.correctCount;
        const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;
        const totalTimeSpent = this.examState.answers.reduce((acc, a) => acc + a.timeTakenMs, 0);
        const avgSpeedSec = totalAnswered > 0 ? ((totalTimeSpent / totalAnswered) / 1000).toFixed(1) : 0;

        const resultRecord = {
            score: `${correct}/${this.examState.totalQuestions}`,
            accuracy: `${accuracy}%`,
            correctCount: correct,
            totalQuestions: this.examState.totalQuestions,
            avgSpeedSec: `${avgSpeedSec}s`,
            gridSize: `${this.settings.gridSize}x${this.settings.gridSize}`,
            difficulty: this.settings.difficulty
        };

        this.storage.recordExamSession(resultRecord);

        // Populate Exam Result Modal
        document.getElementById('exam-res-score').textContent = `${correct} / ${this.examState.totalQuestions}`;
        document.getElementById('exam-res-accuracy').textContent = `${accuracy}%`;
        document.getElementById('exam-res-speed').textContent = `${avgSpeedSec}s`;

        let feedbackText = '';
        if (accuracy >= 90) {
            feedbackText = '🏆 Outstanding! Pilot-tier cognitive speed and precision.';
        } else if (accuracy >= 75) {
            feedbackText = '⭐ Great job! You meet high cognitive assessment standards.';
        } else {
            feedbackText = '💡 Keep practicing! Focus on spotting rows and columns with 3+ filled letters first.';
        }
        document.getElementById('exam-res-feedback').textContent = feedbackText;

        this.openModal('modal-exam-result');
    }

    /* =========================================================================
       Step-by-Step Logic Modal
       ========================================================================= */
    showSolutionModal() {
        if (!this.currentPuzzle) return;
        const stepsList = document.getElementById('solution-steps-list');
        stepsList.innerHTML = '';

        const steps = this.currentPuzzle.steps || [];

        if (steps.length === 0) {
            stepsList.innerHTML = `<p>Direct deduction: surrounding constraints in row ${this.currentPuzzle.target.r + 1} and column ${this.currentPuzzle.target.c + 1} directly isolate "${this.currentPuzzle.correctAnswer}".</p>`;
        } else {
            steps.forEach((step, idx) => {
                const stepDiv = document.createElement('div');
                stepDiv.className = `explanation-step ${step.isTarget ? 'target-step' : ''}`;

                const typeNames = {
                    naked_single: 'Row/Column Elimination',
                    hidden_single_row: 'Row Unique Placement',
                    hidden_single_col: 'Column Unique Placement'
                };

                stepDiv.innerHTML = `
                    <div class="explanation-step-title">
                        <span>Step ${idx + 1}: ${typeNames[step.type] || 'Deduction'}</span>
                        <span style="color: var(--accent-pink); font-weight: bold;">(R${step.r + 1}, C${step.c + 1}) &rarr; ${step.val}</span>
                    </div>
                    <div>${step.explanation}</div>
                `;

                // Hover step to highlight row and column in grid
                stepDiv.addEventListener('mouseenter', () => {
                    this.highlightGridCell(step.r, step.c);
                });
                stepDiv.addEventListener('mouseleave', () => {
                    this.clearGridHighlights();
                });

                stepsList.appendChild(stepDiv);
            });
        }

        this.openModal('modal-solution');
    }

    highlightGridCell(targetR, targetC) {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            const r = parseInt(cell.dataset.r, 10);
            const c = parseInt(cell.dataset.c, 10);
            if (r === targetR && c === targetC) {
                cell.classList.add('highlight-focus');
            } else if (r === targetR) {
                cell.classList.add('highlight-row');
            } else if (c === targetC) {
                cell.classList.add('highlight-col');
            }
        });
    }

    clearGridHighlights() {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('highlight-focus', 'highlight-row', 'highlight-col');
        });
    }

    /* =========================================================================
       Stats & Settings Modals
       ========================================================================= */
    openStatsModal() {
        const stats = this.storage.getStats();
        const accuracy = stats.totalSolved > 0 ? Math.round((stats.totalCorrect / stats.totalSolved) * 100) : 0;
        const avgTime = stats.totalSolved > 0 ? ((stats.totalTimeMs / stats.totalSolved) / 1000).toFixed(1) : 0;

        document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
        document.getElementById('stat-solved').textContent = stats.totalSolved;
        document.getElementById('stat-streak').textContent = stats.bestStreak;
        document.getElementById('stat-avg-time').textContent = `${avgTime}s`;

        // Render Exam Sessions
        const historyList = document.getElementById('exam-history-list');
        if (stats.examSessions && stats.examSessions.length > 0) {
            historyList.innerHTML = stats.examSessions.map(session => {
                const date = new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `
                    <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px solid var(--border-light);">
                        <span>${date} (${session.gridSize}, ${session.difficulty})</span>
                        <strong>Score: ${session.score} (${session.accuracy})</strong>
                    </div>
                `;
            }).join('');
        } else {
            historyList.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">No exam sessions recorded yet.</p>';
        }

        this.openModal('modal-stats');
    }

    openSettingsModal() {
        document.getElementById('setting-theme').value = this.settings.theme;
        document.getElementById('setting-size').value = this.settings.gridSize;
        document.getElementById('setting-difficulty').value = this.settings.difficulty;
        document.getElementById('setting-exam-duration').value = this.settings.examDuration;
        document.getElementById('setting-exam-count').value = this.settings.examQuestions;

        this.openModal('modal-settings');
    }

    saveSettingsFromForm() {
        this.settings.theme = document.getElementById('setting-theme').value;
        this.settings.gridSize = parseInt(document.getElementById('setting-size').value, 10);
        this.settings.difficulty = document.getElementById('setting-difficulty').value;
        this.settings.examDuration = parseInt(document.getElementById('setting-exam-duration').value, 10);
        this.settings.examQuestions = parseInt(document.getElementById('setting-exam-count').value, 10);

        this.storage.saveSettings(this.settings);
        this.applySettings();
        this.closeModal('modal-settings');
        this.loadNewPuzzle();
    }

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new LatinSquareApp();
});

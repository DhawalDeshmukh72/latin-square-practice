/**
 * dMAT Aptitude & Reasoning Multi-Game Platform Controller
 * Supports: Latin Square, Figure Sequences, and Mathematical Equations
 */

class DmatApp {
    constructor() {
        this.storage = new StorageManager();
        this.sound = new SoundEffects();
        this.settings = this.storage.getSettings();

        // Game Engines
        this.latinEngine = new LatinSquareEngine(this.settings.gridSize);
        this.figureEngine = new FigureSequenceEngine(4);
        this.equationEngine = new EquationEngine();

        // Active State
        this.activeGame = this.settings.activeGame || 'latin_square';
        this.currentMode = 'practice'; // 'practice', 'exam', 'blitz'
        this.currentPuzzle = null;
        this.isAnswered = false;
        this.questionStartTime = Date.now();

        // Game specific interaction states
        this.userNotes = {}; // For Latin Square: "r,c" -> string
        this.figureSelection = { q1: null, q2: null }; // For Figure Sequences
        this.equationInputs = { A: '', B: '', C: '', D: '' }; // For Mathematical Equations
        this.activeEquationVar = 'A';

        // Exam State
        this.examState = {
            active: false,
            timerInterval: null,
            timeRemaining: 0,
            questionIndex: 0,
            totalQuestions: 20,
            questions: [],
            userAnswers: [],
            isAnsweredList: []
        };

        // Blitz State
        this.blitzState = {
            active: false,
            timerInterval: null,
            timeRemaining: 60,
            score: 0
        };

        this.init();
    }

    init() {
        this.applySettings();
        this.setupEventListeners();
        this.switchGame(this.activeGame, false);
    }

    applySettings() {
        document.body.setAttribute('data-theme', this.settings.theme);
        this.latinEngine.setSize(this.settings.gridSize);
        this.sound.muted = !this.settings.soundEnabled;
        this.updateSoundIcon();
        this.applyFontScale(this.settings.fontSizeLevel);

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
        // Game Switcher Tabs
        document.querySelectorAll('.game-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const game = target.dataset.game;
                this.switchGame(game);
            });
        });

        // Mode Switcher Tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const mode = target.dataset.mode;
                this.switchMode(mode);
            });
        });

        // Top Check Answer & End Subtest
        const btnTopCheck = document.getElementById('btn-top-check');
        if (btnTopCheck) {
            btnTopCheck.addEventListener('click', () => this.handleCheckAnswer());
        }

        const btnTopEnd = document.getElementById('btn-top-end');
        if (btnTopEnd) {
            btnTopEnd.addEventListener('click', () => this.endExam());
        }

        // Instructions Accordion Toggle
        const btnToggleInstructions = document.getElementById('btn-toggle-instructions');
        const instructionsContent = document.getElementById('instructions-content');
        const instructionToggleIcon = document.getElementById('instruction-toggle-icon');

        if (btnToggleInstructions) {
            btnToggleInstructions.addEventListener('click', () => {
                const isHidden = instructionsContent.style.display === 'none';
                instructionsContent.style.display = isHidden ? 'block' : 'none';
                instructionToggleIcon.textContent = isHidden ? '\u25B2' : '\u25BC';
            });
        }

        // Font Scalers
        document.querySelectorAll('.font-scaler-btn').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                this.settings.fontSizeLevel = idx + 1;
                this.storage.saveSettings(this.settings);
                this.applyFontScale(this.settings.fontSizeLevel);
            });
        });

        // Practice Action Buttons
        const btnNext = document.getElementById('btn-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (this.isAnswered) {
                    this.loadNewPuzzle();
                } else {
                    this.handleCheckAnswer();
                }
            });
        }

        const btnHint = document.getElementById('btn-hint');
        if (btnHint) {
            btnHint.addEventListener('click', () => this.showSolutionModal());
        }

        const btnClearNotes = document.getElementById('btn-clear-notes');
        if (btnClearNotes) {
            btnClearNotes.addEventListener('click', () => this.clearUserInputs());
        }

        // Exam Bottom Controls
        const btnExamPrev = document.getElementById('btn-exam-prev');
        if (btnExamPrev) {
            btnExamPrev.addEventListener('click', () => this.navigateExam(-1));
        }

        const btnExamNext = document.getElementById('btn-exam-next');
        if (btnExamNext) {
            btnExamNext.addEventListener('click', () => this.navigateExam(1));
        }

        // Nav Action Buttons
        const btnSound = document.getElementById('btn-sound');
        if (btnSound) {
            btnSound.addEventListener('click', () => {
                this.sound.toggleMute();
                this.settings.soundEnabled = !this.sound.muted;
                this.storage.saveSettings(this.settings);
                this.updateSoundIcon();
            });
        }

        const btnStats = document.getElementById('btn-stats');
        if (btnStats) {
            btnStats.addEventListener('click', () => this.showStatsModal());
        }

        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) {
            btnSettings.addEventListener('click', () => this.showSettingsModal());
        }

        // Settings Save
        const btnSaveSettings = document.getElementById('btn-save-settings');
        if (btnSaveSettings) {
            btnSaveSettings.addEventListener('click', () => {
                this.settings.theme = document.getElementById('setting-theme').value;
                this.settings.gridSize = parseInt(document.getElementById('setting-size').value, 10);
                this.settings.difficulty = document.getElementById('setting-difficulty').value;
                this.settings.examDuration = parseInt(document.getElementById('setting-exam-duration').value, 10);
                this.settings.examQuestions = parseInt(document.getElementById('setting-exam-count').value, 10);

                this.storage.saveSettings(this.settings);
                this.applySettings();
                this.closeAllModals();
                this.loadNewPuzzle();
            });
        }

        // Modal Close Buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.close;
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.remove('active');
            });
        });

        // Exam Result Modal Buttons
        const btnExamRetake = document.getElementById('btn-exam-retake');
        if (btnExamRetake) {
            btnExamRetake.addEventListener('click', () => {
                this.closeAllModals();
                this.startExam();
            });
        }

        const btnExamBackPractice = document.getElementById('btn-exam-back-practice');
        if (btnExamBackPractice) {
            btnExamBackPractice.addEventListener('click', () => {
                this.closeAllModals();
                this.switchMode('practice');
            });
        }

        // Reset Stats Button
        const btnResetStats = document.getElementById('btn-reset-stats');
        if (btnResetStats) {
            btnResetStats.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all practice statistics for this game?')) {
                    this.storage.resetStats(this.activeGame);
                    this.showStatsModal();
                    this.updateStreakBadge();
                }
            });
        }

        // Mathematical Equations Virtual Keyboard
        document.querySelectorAll('.numpad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.key;
                this.handleVirtualNumpadKey(key);
            });
        });

        // Mathematical Equations Input Fields Focus Click
        document.querySelectorAll('.solution-box').forEach(input => {
            input.addEventListener('click', (e) => {
                const v = e.currentTarget.dataset.var;
                this.focusEquationVar(v);
            });
        });

        // Global Keyboard Handler
        window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
    }

    updateSoundIcon() {
        const on = document.getElementById('icon-sound-on');
        const off = document.getElementById('icon-sound-off');
        if (on && off) {
            on.style.display = this.sound.muted ? 'none' : 'block';
            off.style.display = this.sound.muted ? 'block' : 'none';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    /**
     * Switch Active Game
     */
    switchGame(gameType, reload = true) {
        this.activeGame = gameType;
        this.settings.activeGame = gameType;
        this.storage.saveSettings(this.settings);

        // Update Game Tabs
        document.querySelectorAll('.game-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.game === gameType);
        });

        // Update Arena Visibility
        const arenaLatin = document.getElementById('arena-latin-square');
        const arenaFigure = document.getElementById('arena-figure-sequences');
        const arenaMath = document.getElementById('arena-math-equations');

        if (arenaLatin) arenaLatin.style.display = gameType === 'latin_square' ? 'flex' : 'none';
        if (arenaFigure) arenaFigure.style.display = gameType === 'figure_sequences' ? 'flex' : 'none';
        if (arenaMath) arenaMath.style.display = gameType === 'math_equations' ? 'grid' : 'none';

        // Update dMAT Header Subtitle & Instructions
        this.updateHeaderAndInstructions();
        this.updateStreakBadge();

        if (reload) {
            if (this.currentMode === 'exam') {
                this.startExam();
            } else if (this.currentMode === 'blitz') {
                this.startBlitz();
            } else {
                this.loadNewPuzzle();
            }
        }
    }

    updateHeaderAndInstructions() {
        const subtitle = document.getElementById('dmat-module-subtitle');
        const title = document.getElementById('instruction-title');
        const body = document.getElementById('instruction-body');
        const legendHint = document.getElementById('game-specific-hint');

        if (this.activeGame === 'latin_square') {
            if (subtitle) subtitle.textContent = 'Latin Square';
            if (title) title.textContent = 'Which letter is missing?';
            if (body) {
                const letters = LETTERS.slice(0, this.settings.gridSize);
                const last = letters[letters.length - 1];
                const leading = letters.slice(0, -1).join(', ');
                body.innerHTML = `
                    <p>On the position of the question mark in the square, a letter is missing.</p>
                    <p>In the square there can only occur the letters ${leading} and ${last}.</p>
                    <p>Each letter may occur only exactly once in each row and each column.</p>
                    <p>Click onto the correct solution in the answer column with the mouse or press the key. If you do not know an answer, please guess.</p>
                `;
            }
            if (legendHint) legendHint.innerHTML = `<span class="kbd-badge">A</span> - <span class="kbd-badge">${LETTERS[this.settings.gridSize - 1]}</span>: Select Answer`;
        } else if (this.activeGame === 'figure_sequences') {
            if (subtitle) subtitle.textContent = 'Figure Sequences';
            if (title) title.textContent = 'Which pictures are missing in the row?';
            if (body) {
                body.innerHTML = `
                    <p>The series of pictures has to be continued. Each picture consists of symbols, which can change in color, position, and orientation.</p>
                    <p>Below each question mark, there are three options. Click onto the two correct answers with the mouse. If you do not know an answer, please guess.</p>
                `;
            }
            if (legendHint) legendHint.innerHTML = `<span class="kbd-badge">1</span> - <span class="kbd-badge">3</span>: Pick Left Option, <span class="kbd-badge">4</span> - <span class="kbd-badge">6</span>: Pick Right Option`;
        } else if (this.activeGame === 'math_equations') {
            if (subtitle) subtitle.textContent = 'Mathematical Equations';
            if (title) title.textContent = 'Which integers do the unknowns replace?';
            if (body) {
                body.innerHTML = `
                    <p>Each unknown (e.g., "A") in the equations replaces a positive integer between 1 and 20.</p>
                    <p>Click onto the input boxes with the mouse.</p>
                    <p>Type in the correct answers into the input boxes (using either the virtual keyboard OR your computer keyboard).</p>
                `;
            }
            if (legendHint) legendHint.innerHTML = `<span class="kbd-badge">0</span> - <span class="kbd-badge">9</span> / <span class="kbd-badge">Numpad</span>: Enter Values`;
        }
    }

    /**
     * Switch Practice / Exam / Blitz Mode
     */
    switchMode(mode) {
        this.currentMode = mode;

        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // Pill in dMAT header
        const pill = document.getElementById('dmat-mode-pill');
        if (pill) {
            pill.textContent = mode === 'practice' ? 'Practice mode' : mode === 'exam' ? 'Exam mode' : 'Speed Blitz';
        }

        // Clean existing timers
        if (this.examState.timerInterval) clearInterval(this.examState.timerInterval);
        if (this.blitzState.timerInterval) clearInterval(this.blitzState.timerInterval);

        const practiceControls = document.getElementById('practice-controls');
        const examControls = document.getElementById('exam-controls');
        const badgeTimer = document.getElementById('badge-timer');
        const badgeProgress = document.getElementById('badge-progress');
        const btnTopEnd = document.getElementById('btn-top-end');

        if (mode === 'practice') {
            if (practiceControls) practiceControls.style.display = 'flex';
            if (examControls) examControls.style.display = 'none';
            if (badgeTimer) badgeTimer.style.display = 'none';
            if (badgeProgress) badgeProgress.style.display = 'none';
            if (btnTopEnd) btnTopEnd.style.display = 'none';
            this.loadNewPuzzle();
        } else if (mode === 'exam') {
            if (practiceControls) practiceControls.style.display = 'none';
            if (examControls) examControls.style.display = 'flex';
            if (badgeTimer) badgeTimer.style.display = 'inline-flex';
            if (badgeProgress) badgeProgress.style.display = 'inline-flex';
            if (btnTopEnd) btnTopEnd.style.display = 'inline-block';
            this.startExam();
        } else if (mode === 'blitz') {
            if (practiceControls) practiceControls.style.display = 'flex';
            if (examControls) examControls.style.display = 'none';
            if (badgeTimer) badgeTimer.style.display = 'inline-flex';
            if (badgeProgress) badgeProgress.style.display = 'none';
            if (btnTopEnd) btnTopEnd.style.display = 'none';
            this.startBlitz();
        }
    }

    /**
     * Load New Puzzle for Active Game
     */
    loadNewPuzzle() {
        this.isAnswered = false;
        this.questionStartTime = Date.now();
        this.hideFeedback();

        const btnNext = document.getElementById('btn-next');
        if (btnNext) {
            btnNext.textContent = 'Check Answer';
            btnNext.classList.remove('btn-secondary');
            btnNext.classList.add('btn-primary');
        }

        if (this.activeGame === 'latin_square') {
            this.userNotes = {};
            this.currentPuzzle = this.latinEngine.generatePuzzle(this.settings.difficulty);
            this.renderLatinSquare();
        } else if (this.activeGame === 'figure_sequences') {
            this.figureSelection = { q1: null, q2: null };
            this.currentPuzzle = this.figureEngine.generateSequence(this.settings.difficulty);
            this.renderFigureSequences();
        } else if (this.activeGame === 'math_equations') {
            this.equationInputs = { A: '', B: '', C: '', D: '' };
            this.currentPuzzle = this.equationEngine.generateSystem(this.settings.difficulty);
            this.renderMathEquations();
        }

        this.updateStreakBadge();
    }

    /* =========================================================================
       RENDER: Latin Square
       ========================================================================= */
    renderLatinSquare() {
        const gridEl = document.getElementById('latin-grid');
        const ansEl = document.getElementById('answer-column');
        if (!gridEl || !ansEl) return;

        gridEl.innerHTML = '';
        ansEl.innerHTML = '';

        const n = this.latinEngine.size;
        const puzzle = this.currentPuzzle;
        const targetR = puzzle.targetRow !== undefined ? puzzle.targetRow : puzzle.target?.r;
        const targetC = puzzle.targetCol !== undefined ? puzzle.targetCol : puzzle.target?.c;
        const puzzleGrid = puzzle.grid || puzzle.initialGrid;

        for (let r = 0; r < n; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'grid-row';

            for (let c = 0; c < n; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'grid-cell';
                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;

                if (r === targetR && c === targetC) {
                    cellDiv.classList.add('target-cell');
                    cellDiv.textContent = '?';
                    cellDiv.id = 'latin-target-cell';
                } else if (puzzleGrid[r][c]) {
                    cellDiv.textContent = puzzleGrid[r][c];
                } else {
                    cellDiv.classList.add('editable-cell');
                    const notesSpan = document.createElement('span');
                    notesSpan.className = 'cell-notes';
                    notesSpan.id = `notes-${r}-${c}`;
                    cellDiv.appendChild(notesSpan);

                    cellDiv.addEventListener('click', () => {
                        const note = prompt(`Enter scratchpad notes for cell (${r+1}, ${c+1}):`, this.userNotes[`${r},${c}`] || '');
                        if (note !== null) {
                            this.userNotes[`${r},${c}`] = note.toUpperCase();
                            notesSpan.textContent = this.userNotes[`${r},${c}`];
                        }
                    });
                }
                rowDiv.appendChild(cellDiv);
            }
            gridEl.appendChild(rowDiv);
        }

        // Render Answer Column Buttons (A, B, C, D, E)
        const letters = this.latinEngine.letters;
        letters.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = letter;
            btn.dataset.letter = letter;
            btn.addEventListener('click', () => {
                if (!this.isAnswered) {
                    this.handleLatinSquareAnswer(letter);
                }
            });
            ansEl.appendChild(btn);
        });
    }

    handleLatinSquareAnswer(selectedLetter) {
        if (this.isAnswered) return;
        this.isAnswered = true;

        const correctAnswer = this.currentPuzzle.correctAnswer || this.currentPuzzle.targetLetter;
        const isCorrect = selectedLetter === correctAnswer;
        const timeTaken = Date.now() - this.questionStartTime;

        // Visual feedback on buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (btn.dataset.letter === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn.dataset.letter === selectedLetter && !isCorrect) {
                btn.classList.add('wrong');
            }
        });

        // Fill target cell
        const targetCell = document.getElementById('latin-target-cell');
        if (targetCell) {
            targetCell.textContent = correctAnswer;
            if (isCorrect) {
                targetCell.classList.add('highlight-solved');
            }
        }

        this.processAnswerResult(isCorrect, timeTaken);
    }

    /* =========================================================================
       RENDER: Figure Sequences
       ========================================================================= */
    renderFigureSequences() {
        const seq = this.currentPuzzle;
        if (!seq) return;

        // Render 4 Given Grids (1..4)
        for (let i = 0; i < 4; i++) {
            const box = document.getElementById(`figure-pic-${i}`);
            if (box) {
                this.renderFigureGridInto(box, seq.givenPictures[i]);
            }
        }

        // Clear Question mark selections
        const target1 = document.getElementById('figure-target-1');
        const target2 = document.getElementById('figure-target-2');
        if (target1) {
            target1.textContent = '?';
            target1.style.background = 'var(--dmat-magenta-light)';
        }
        if (target2) {
            target2.textContent = '?';
            target2.style.background = 'var(--dmat-magenta-light)';
        }

        // Render Options for Column 1
        const col1 = document.getElementById('figure-options-list-1');
        if (col1) {
            col1.innerHTML = '';
            seq.q1Options.forEach((optGrid, idx) => {
                const choiceDiv = document.createElement('div');
                choiceDiv.className = 'figure-option-choice';
                choiceDiv.dataset.col = '1';
                choiceDiv.dataset.idx = idx;

                const radio = document.createElement('div');
                radio.className = 'figure-option-radio';

                const gridBox = document.createElement('div');
                gridBox.className = 'figure-grid-box';
                this.renderFigureGridInto(gridBox, optGrid, 20);

                choiceDiv.appendChild(radio);
                choiceDiv.appendChild(gridBox);

                choiceDiv.addEventListener('click', () => {
                    if (!this.isAnswered) {
                        this.selectFigureOption(1, idx);
                    }
                });
                col1.appendChild(choiceDiv);
            });
        }

        // Render Options for Column 2
        const col2 = document.getElementById('figure-options-list-2');
        if (col2) {
            col2.innerHTML = '';
            seq.q2Options.forEach((optGrid, idx) => {
                const choiceDiv = document.createElement('div');
                choiceDiv.className = 'figure-option-choice';
                choiceDiv.dataset.col = '2';
                choiceDiv.dataset.idx = idx;

                const radio = document.createElement('div');
                radio.className = 'figure-option-radio';

                const gridBox = document.createElement('div');
                gridBox.className = 'figure-grid-box';
                this.renderFigureGridInto(gridBox, optGrid, 20);

                choiceDiv.appendChild(radio);
                choiceDiv.appendChild(gridBox);

                choiceDiv.addEventListener('click', () => {
                    if (!this.isAnswered) {
                        this.selectFigureOption(2, idx);
                    }
                });
                col2.appendChild(choiceDiv);
            });
        }
    }

    renderFigureGridInto(container, gridItems, iconSize = 24) {
        container.innerHTML = '';
        const matrix = Array.from({ length: 4 }, () => Array(4).fill(null));

        gridItems.forEach(item => {
            if (item.row >= 0 && item.row < 4 && item.col >= 0 && item.col < 4) {
                matrix[item.row][item.col] = item;
            }
        });

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.className = 'figure-cell';
                const item = matrix[r][c];
                if (item) {
                    cell.innerHTML = FigureSequenceEngine.renderSymbolSVG(
                        item.symbol,
                        item.rotation || 0,
                        item.color,
                        iconSize
                    );
                }
                container.appendChild(cell);
            }
        }
    }

    selectFigureOption(colNumber, optionIndex) {
        if (colNumber === 1) {
            this.figureSelection.q1 = optionIndex;
            document.querySelectorAll('#figure-options-list-1 .figure-option-choice').forEach((el, idx) => {
                el.classList.toggle('selected', idx === optionIndex);
            });
            this.sound.playClick();
        } else {
            this.figureSelection.q2 = optionIndex;
            document.querySelectorAll('#figure-options-list-2 .figure-option-choice').forEach((el, idx) => {
                el.classList.toggle('selected', idx === optionIndex);
            });
            this.sound.playClick();
        }

        // Auto-check in blitz mode or if both selected
        if (this.currentMode === 'blitz' && this.figureSelection.q1 !== null && this.figureSelection.q2 !== null) {
            this.checkFigureSequencesAnswer();
        }
    }

    checkFigureSequencesAnswer() {
        if (this.isAnswered) return;
        if (this.figureSelection.q1 === null || this.figureSelection.q2 === null) {
            this.showFeedback('Please select one option for each question mark column.', 'error');
            return;
        }

        this.isAnswered = true;
        const isQ1Correct = this.figureSelection.q1 === this.currentPuzzle.q1CorrectIndex;
        const isQ2Correct = this.figureSelection.q2 === this.currentPuzzle.q2CorrectIndex;
        const isFullyCorrect = isQ1Correct && isQ2Correct;
        const timeTaken = Date.now() - this.questionStartTime;

        // Reveal in Option Columns
        document.querySelectorAll('#figure-options-list-1 .figure-option-choice').forEach((el, idx) => {
            if (idx === this.currentPuzzle.q1CorrectIndex) {
                el.classList.add('correct-reveal');
            } else if (idx === this.figureSelection.q1 && !isQ1Correct) {
                el.classList.add('wrong-reveal');
            }
        });

        document.querySelectorAll('#figure-options-list-2 .figure-option-choice').forEach((el, idx) => {
            if (idx === this.currentPuzzle.q2CorrectIndex) {
                el.classList.add('correct-reveal');
            } else if (idx === this.figureSelection.q2 && !isQ2Correct) {
                el.classList.add('wrong-reveal');
            }
        });

        // Fill Question Mark Cards
        const target1 = document.getElementById('figure-target-1');
        const target2 = document.getElementById('figure-target-2');
        if (target1) {
            target1.innerHTML = '';
            target1.classList.remove('figure-target-box');
            target1.classList.add('figure-grid-box');
            this.renderFigureGridInto(target1, this.currentPuzzle.solution1, 24);
        }
        if (target2) {
            target2.innerHTML = '';
            target2.classList.remove('figure-target-box');
            target2.classList.add('figure-grid-box');
            this.renderFigureGridInto(target2, this.currentPuzzle.solution2, 24);
        }

        this.processAnswerResult(isFullyCorrect, timeTaken);
    }

    /* =========================================================================
       RENDER: Mathematical Equations
       ========================================================================= */
    renderMathEquations() {
        const puzzle = this.currentPuzzle;
        if (!puzzle) return;

        const eqList = document.getElementById('equations-list');
        if (eqList) {
            eqList.innerHTML = '';
            puzzle.equations.forEach(eq => {
                const row = document.createElement('div');
                row.className = 'equation-row';
                row.textContent = eq;
                eqList.appendChild(row);
            });
        }

        // Reset Inputs
        ['A', 'B', 'C', 'D'].forEach(v => {
            const input = document.getElementById(`sol-input-${v}`);
            if (input) {
                input.value = '';
                input.className = 'solution-box';
            }
        });

        this.focusEquationVar('A');
    }

    focusEquationVar(varName) {
        this.activeEquationVar = varName;
        document.querySelectorAll('.solution-box').forEach(input => {
            input.classList.toggle('active-focus', input.dataset.var === varName);
        });
    }

    handleVirtualNumpadKey(key) {
        if (this.isAnswered) return;
        const curVar = this.activeEquationVar;
        const input = document.getElementById(`sol-input-${curVar}`);
        if (!input) return;

        if (key === 'delete') {
            if (this.equationInputs[curVar].length > 0) {
                this.equationInputs[curVar] = this.equationInputs[curVar].slice(0, -1);
            } else {
                // Step to previous variable
                const vars = ['A', 'B', 'C', 'D'];
                const idx = vars.indexOf(curVar);
                if (idx > 0) this.focusEquationVar(vars[idx - 1]);
            }
            input.value = this.equationInputs[curVar];
            this.sound.playClick();
            return;
        }

        // Digit entered (0-9)
        let currentVal = this.equationInputs[curVar];
        if (currentVal.length < 2) {
            currentVal += key;
            this.equationInputs[curVar] = currentVal;
            input.value = currentVal;
            this.sound.playClick();

            // If 2 digits or number >= 3 (since answers are 1-20), auto move to next var
            const numVal = parseInt(currentVal, 10);
            if (currentVal.length === 2 || numVal > 2) {
                const vars = ['A', 'B', 'C', 'D'];
                const idx = vars.indexOf(curVar);
                if (idx < vars.length - 1) {
                    this.focusEquationVar(vars[idx + 1]);
                }
            }
        }
    }

    checkMathEquationsAnswer() {
        if (this.isAnswered) return;
        const sol = this.currentPuzzle.solutions;
        const userVals = {
            A: parseInt(this.equationInputs.A, 10),
            B: parseInt(this.equationInputs.B, 10),
            C: parseInt(this.equationInputs.C, 10),
            D: parseInt(this.equationInputs.D, 10)
        };

        if (isNaN(userVals.A) || isNaN(userVals.B) || isNaN(userVals.C) || isNaN(userVals.D)) {
            this.showFeedback('Please fill in integer values for all unknowns A, B, C, and D.', 'error');
            return;
        }

        this.isAnswered = true;
        let allCorrect = true;

        ['A', 'B', 'C', 'D'].forEach(v => {
            const input = document.getElementById(`sol-input-${v}`);
            const isVarCorrect = userVals[v] === sol[v];
            if (!isVarCorrect) allCorrect = false;

            if (input) {
                input.classList.remove('active-focus');
                input.classList.add(isVarCorrect ? 'correct' : 'wrong');
                if (!isVarCorrect) {
                    input.value = `${userVals[v]} \u2192 ${sol[v]}`;
                }
            }
        });

        const timeTaken = Date.now() - this.questionStartTime;
        this.processAnswerResult(allCorrect, timeTaken);
    }

    /* =========================================================================
       Check Answer Master Dispatcher
       ========================================================================= */
    handleCheckAnswer() {
        if (this.isAnswered) {
            this.loadNewPuzzle();
            return;
        }

        if (this.activeGame === 'latin_square') {
            this.showFeedback('Click on an answer letter (A-E) to check your solution.', 'error');
        } else if (this.activeGame === 'figure_sequences') {
            this.checkFigureSequencesAnswer();
        } else if (this.activeGame === 'math_equations') {
            this.checkMathEquationsAnswer();
        }
    }

    processAnswerResult(isCorrect, timeTakenMs) {
        if (isCorrect) {
            this.sound.playCorrect();
            this.showFeedback('\u2714 Correct! Well reasoned.', 'success');
        } else {
            this.sound.playWrong();
            this.showFeedback('\u2716 Incorrect. Review the logical deduction steps.', 'error');
        }

        // Record Stats
        this.storage.recordAnswer(this.activeGame, isCorrect, timeTakenMs, this.settings.difficulty);
        this.updateStreakBadge();

        // Update Button label
        const btnNext = document.getElementById('btn-next');
        if (btnNext) {
            btnNext.textContent = 'Next Puzzle \u2192 (Space)';
            btnNext.classList.remove('btn-primary');
            btnNext.classList.add('btn-secondary');
        }

        // Blitz Mode update
        if (this.currentMode === 'blitz' && this.blitzState.active) {
            if (isCorrect) {
                this.blitzState.score++;
                this.blitzState.timeRemaining += 3; // Bonus time
            }
            setTimeout(() => {
                if (this.blitzState.active) this.loadNewPuzzle();
            }, 700);
        }
    }

    clearUserInputs() {
        if (this.activeGame === 'latin_square') {
            this.userNotes = {};
            document.querySelectorAll('.cell-notes').forEach(el => el.textContent = '');
        } else if (this.activeGame === 'figure_sequences') {
            this.figureSelection = { q1: null, q2: null };
            document.querySelectorAll('.figure-option-choice').forEach(el => el.classList.remove('selected'));
        } else if (this.activeGame === 'math_equations') {
            this.equationInputs = { A: '', B: '', C: '', D: '' };
            ['A', 'B', 'C', 'D'].forEach(v => {
                const input = document.getElementById(`sol-input-${v}`);
                if (input) input.value = '';
            });
            this.focusEquationVar('A');
        }
    }

    showFeedback(message, type) {
        const fb = document.getElementById('feedback-banner');
        if (!fb) return;
        fb.textContent = message;
        fb.className = `feedback-banner ${type}`;
        fb.style.display = 'block';
    }

    hideFeedback() {
        const fb = document.getElementById('feedback-banner');
        if (fb) fb.style.display = 'none';
    }

    updateStreakBadge() {
        const stats = this.storage.getStats(this.activeGame);
        const badgeStreak = document.getElementById('badge-streak');
        if (badgeStreak) {
            badgeStreak.textContent = `\uD83D\uDD25 Streak: ${stats.currentStreak}`;
        }
    }

    /* =========================================================================
       TIMED EXAM MODE (Authentic dMAT Subtest)
       ========================================================================= */
    startExam() {
        this.examState.active = true;
        this.examState.questionIndex = 0;
        this.examState.totalQuestions = this.settings.examQuestions || 6;
        this.examState.timeRemaining = this.settings.examDuration || 300;
        this.examState.questions = [];
        this.examState.userAnswers = Array(this.examState.totalQuestions).fill(null);
        this.examState.isAnsweredList = Array(this.examState.totalQuestions).fill(false);

        // Pre-generate questions
        for (let i = 0; i < this.examState.totalQuestions; i++) {
            if (this.activeGame === 'latin_square') {
                this.examState.questions.push(this.latinEngine.generatePuzzle(this.settings.difficulty));
            } else if (this.activeGame === 'figure_sequences') {
                this.examState.questions.push(this.figureEngine.generateSequence(this.settings.difficulty));
            } else if (this.activeGame === 'math_equations') {
                this.examState.questions.push(this.equationEngine.generateSystem(this.settings.difficulty));
            }
        }

        this.renderExamPagination();
        this.loadExamQuestion(0);

        // Start countdown timer
        if (this.examState.timerInterval) clearInterval(this.examState.timerInterval);
        this.examState.timerInterval = setInterval(() => {
            this.examState.timeRemaining--;
            this.updateExamTimerDisplay();
            if (this.examState.timeRemaining <= 0) {
                this.endExam();
            }
        }, 1000);
        this.updateExamTimerDisplay();
    }

    updateExamTimerDisplay() {
        const badge = document.getElementById('badge-timer');
        if (!badge) return;
        const mins = Math.floor(this.examState.timeRemaining / 60);
        const secs = this.examState.timeRemaining % 60;
        badge.textContent = `\u23F1 ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    renderExamPagination() {
        const pag = document.getElementById('dmat-pagination-list');
        if (!pag) return;
        pag.innerHTML = '';

        for (let i = 0; i < this.examState.totalQuestions; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'page-bubble';
            bubble.textContent = i + 1;
            bubble.dataset.idx = i;
            if (i === this.examState.questionIndex) bubble.classList.add('active');
            bubble.addEventListener('click', () => {
                this.loadExamQuestion(i);
            });
            pag.appendChild(bubble);
        }
    }

    loadExamQuestion(index) {
        this.examState.questionIndex = index;
        this.currentPuzzle = this.examState.questions[index];
        this.isAnswered = this.examState.isAnsweredList[index];
        this.hideFeedback();

        // Update badge progress
        const badgeProg = document.getElementById('badge-progress');
        if (badgeProg) {
            badgeProg.textContent = `Question ${index + 1}/${this.examState.totalQuestions}`;
        }

        // Update active page bubble
        document.querySelectorAll('.page-bubble').forEach((b, idx) => {
            b.classList.toggle('active', idx === index);
            b.classList.toggle('answered', this.examState.isAnsweredList[idx]);
        });

        if (this.activeGame === 'latin_square') {
            this.renderLatinSquare();
        } else if (this.activeGame === 'figure_sequences') {
            this.renderFigureSequences();
        } else if (this.activeGame === 'math_equations') {
            this.renderMathEquations();
        }
    }

    navigateExam(delta) {
        const newIdx = this.examState.questionIndex + delta;
        if (newIdx >= 0 && newIdx < this.examState.totalQuestions) {
            this.loadExamQuestion(newIdx);
        } else if (newIdx >= this.examState.totalQuestions) {
            if (confirm('You have reached the last question. Do you want to submit and complete the subtest?')) {
                this.endExam();
            }
        }
    }

    endExam() {
        if (this.examState.timerInterval) clearInterval(this.examState.timerInterval);
        this.examState.active = false;
        this.sound.playComplete();

        // Calculate score
        let correctCount = 0;
        // In exam mode, we compute score
        for (let i = 0; i < this.examState.totalQuestions; i++) {
            if (this.examState.isAnsweredList[i]) correctCount++;
        }

        const total = this.examState.totalQuestions;
        const accuracy = Math.round((correctCount / total) * 100);

        const scoreEl = document.getElementById('exam-res-score');
        const accEl = document.getElementById('exam-res-accuracy');
        const speedEl = document.getElementById('exam-res-speed');
        const feedbackEl = document.getElementById('exam-res-feedback');

        if (scoreEl) scoreEl.textContent = `${correctCount} / ${total}`;
        if (accEl) accEl.textContent = `${accuracy}%`;
        if (speedEl) speedEl.textContent = `${((this.settings.examDuration - this.examState.timeRemaining) / total).toFixed(1)}s`;
        if (feedbackEl) {
            feedbackEl.textContent = accuracy >= 80 ? 'Outstanding score! Ready for dMAT.' : accuracy >= 60 ? 'Solid performance! Keep practicing.' : 'Needs more practice. Review step deductions.';
        }

        const modal = document.getElementById('modal-exam-result');
        if (modal) modal.classList.add('active');
    }

    /* =========================================================================
       SPEED BLITZ MODE
       ========================================================================= */
    startBlitz() {
        this.blitzState.active = true;
        this.blitzState.score = 0;
        this.blitzState.timeRemaining = 60;

        if (this.blitzState.timerInterval) clearInterval(this.blitzState.timerInterval);
        this.blitzState.timerInterval = setInterval(() => {
            this.blitzState.timeRemaining--;
            const badge = document.getElementById('badge-timer');
            if (badge) badge.textContent = `\u26A1 ${this.blitzState.timeRemaining}s (Score: ${this.blitzState.score})`;
            if (this.blitzState.timeRemaining <= 0) {
                clearInterval(this.blitzState.timerInterval);
                this.blitzState.active = false;
                this.sound.playComplete();
                alert(`Speed Blitz Over! Final Score: ${this.blitzState.score} puzzles solved.`);
                this.switchMode('practice');
            }
        }, 1000);

        this.loadNewPuzzle();
    }

    /* =========================================================================
       MODALS: Step Explainer, Stats, Settings
       ========================================================================= */
    showSolutionModal() {
        const modal = document.getElementById('modal-solution');
        const list = document.getElementById('solution-steps-list');
        const title = document.getElementById('solution-modal-title');
        if (!modal || !list || !this.currentPuzzle) return;

        list.innerHTML = '';

        if (this.activeGame === 'latin_square') {
            if (title) title.textContent = 'Latin Square Logic Solution';
            const steps = this.currentPuzzle.steps || [];
            if (steps.length === 0) {
                list.innerHTML = '<p>No intermediate steps needed; single row/column constraint deduction.</p>';
            } else {
                steps.forEach((step, idx) => {
                    const stepR = step.row !== undefined ? step.row : step.r;
                    const stepC = step.col !== undefined ? step.col : step.c;
                    const stepLetter = step.deducedLetter || step.val;
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'explanation-step' + (step.isTarget ? ' target-step' : '');
                    stepDiv.innerHTML = `
                        <div class="explanation-step-title">
                            <span>Step ${idx + 1}: Cell (${stepR + 1}, ${stepC + 1})</span>
                            <span><b>\u279C ${stepLetter}</b></span>
                        </div>
                        <p>${step.explanation}</p>
                    `;
                    list.appendChild(stepDiv);
                });
            }
        } else if (this.activeGame === 'figure_sequences') {
            if (title) title.textContent = 'Figure Sequences - Logical Rules';
            const explanations = this.currentPuzzle.explanations || [];
            explanations.forEach((item, idx) => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'explanation-step';
                stepDiv.innerHTML = `
                    <div class="explanation-step-title">
                        <span style="display:flex; align-items:center; gap:8px;">
                            ${FigureSequenceEngine.renderSymbolSVG(item.symbol, 0, { hex: item.color }, 18)}
                            ${item.title}
                        </span>
                    </div>
                    <p style="margin-top:4px;">${item.rule}</p>
                `;
                list.appendChild(stepDiv);
            });
        } else if (this.activeGame === 'math_equations') {
            if (title) title.textContent = 'Mathematical Equations - Step-by-Step Derivation';
            const steps = this.currentPuzzle.steps || [];
            steps.forEach(stepText => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'explanation-step';
                stepDiv.innerHTML = `<p>${stepText}</p>`;
                list.appendChild(stepDiv);
            });
        }

        modal.classList.add('active');
    }

    showStatsModal() {
        const modal = document.getElementById('modal-stats');
        const stats = this.storage.getStats(this.activeGame);
        if (!modal) return;

        const title = document.getElementById('stats-modal-title');
        if (title) {
            const gameName = this.activeGame === 'latin_square' ? 'Latin Square' : this.activeGame === 'figure_sequences' ? 'Figure Sequences' : 'Mathematical Equations';
            title.textContent = `${gameName} - Practice Statistics`;
        }

        const acc = stats.totalSolved > 0 ? Math.round((stats.totalCorrect / stats.totalSolved) * 100) : 0;
        const avgSec = stats.totalSolved > 0 ? (stats.totalTimeMs / stats.totalSolved / 1000).toFixed(1) : 0;

        document.getElementById('stat-accuracy').textContent = `${acc}%`;
        document.getElementById('stat-solved').textContent = stats.totalSolved;
        document.getElementById('stat-streak').textContent = stats.bestStreak;
        document.getElementById('stat-avg-time').textContent = `${avgSec}s`;

        const historyEl = document.getElementById('exam-history-list');
        if (historyEl) {
            if (!stats.examSessions || stats.examSessions.length === 0) {
                historyEl.innerHTML = '<p style="color:var(--text-muted);">No completed exam subtests yet.</p>';
            } else {
                historyEl.innerHTML = stats.examSessions.map(s => `
                    <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-light);">
                        <span>${new Date(s.date).toLocaleDateString()} ${new Date(s.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        <span><b>${s.correct} / ${s.total}</b> (${Math.round((s.correct/s.total)*100)}%)</span>
                    </div>
                `).join('');
            }
        }

        modal.classList.add('active');
    }

    showSettingsModal() {
        const modal = document.getElementById('modal-settings');
        if (!modal) return;

        document.getElementById('setting-theme').value = this.settings.theme;
        document.getElementById('setting-size').value = this.settings.gridSize;
        document.getElementById('setting-difficulty').value = this.settings.difficulty;
        document.getElementById('setting-exam-duration').value = this.settings.examDuration;
        document.getElementById('setting-exam-count').value = this.settings.examQuestions;

        // Hide Latin Square grid size setting if another game is active
        const gridGroup = document.getElementById('setting-group-gridsize');
        if (gridGroup) {
            gridGroup.style.display = this.activeGame === 'latin_square' ? 'block' : 'none';
        }

        modal.classList.add('active');
    }

    /* =========================================================================
       GLOBAL KEYBOARD DISPATCHER
       ========================================================================= */
    handleGlobalKeyDown(e) {
        // If typing in an active prompt or modal is open, ignore
        if (document.querySelector('.modal-overlay.active')) {
            if (e.key === 'Escape') this.closeAllModals();
            return;
        }

        const key = e.key;

        // Space -> Next Question
        if (key === ' ' || key === 'Spacebar') {
            e.preventDefault();
            if (this.isAnswered) {
                this.loadNewPuzzle();
            } else {
                this.handleCheckAnswer();
            }
            return;
        }

        // 'H' or 'h' -> Hint
        if (key === 'h' || key === 'H') {
            this.showSolutionModal();
            return;
        }

        // Game specific shortcuts
        if (this.activeGame === 'latin_square' && !this.isAnswered) {
            const upperKey = key.toUpperCase();
            const allowed = this.latinEngine.letters;
            if (allowed.includes(upperKey)) {
                this.handleLatinSquareAnswer(upperKey);
            }
        } else if (this.activeGame === 'figure_sequences' && !this.isAnswered) {
            // Keys 1, 2, 3 -> Col 1 options (0, 1, 2)
            // Keys 4, 5, 6 -> Col 2 options (0, 1, 2)
            if (['1', '2', '3'].includes(key)) {
                this.selectFigureOption(1, parseInt(key, 10) - 1);
            } else if (['4', '5', '6'].includes(key)) {
                this.selectFigureOption(2, parseInt(key, 10) - 4);
            } else if (key === 'Enter') {
                this.handleCheckAnswer();
            }
        } else if (this.activeGame === 'math_equations' && !this.isAnswered) {
            if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
                this.handleVirtualNumpadKey(key);
            } else if (key === 'Backspace' || key === 'Delete') {
                this.handleVirtualNumpadKey('delete');
            } else if (key === 'Tab') {
                e.preventDefault();
                const vars = ['A', 'B', 'C', 'D'];
                const idx = vars.indexOf(this.activeEquationVar);
                const nextIdx = e.shiftKey ? (idx - 1 + 4) % 4 : (idx + 1) % 4;
                this.focusEquationVar(vars[nextIdx]);
            } else if (key === 'Enter') {
                this.handleCheckAnswer();
            }
        }
    }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DmatApp();
});

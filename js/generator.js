/**
 * Latin Square Generator and Solver
 * Supports 4x4 (A-D), 5x5 (A-E), 6x6 (A-F)
 */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

class LatinSquareEngine {
    constructor(size = 5) {
        this.size = size;
        this.letters = LETTERS.slice(0, size);
    }

    setSize(size) {
        this.size = size;
        this.letters = LETTERS.slice(0, size);
    }

    /**
     * Generate a complete, valid Latin Square
     */
    generateFullSquare() {
        const n = this.size;
        // Start with a standard cyclic Latin square
        const grid = Array.from({ length: n }, (_, r) =>
            Array.from({ length: n }, (_, c) => (r + c) % n)
        );

        // Shuffle rows
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [grid[i], grid[j]] = [grid[j], grid[i]];
        }

        // Shuffle columns
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            for (let r = 0; r < n; r++) {
                [grid[r][i], grid[r][j]] = [grid[r][j], grid[r][i]];
            }
        }

        // Random permutation of symbols
        const perm = [...Array(n).keys()];
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }

        // Map numbers to letter symbols
        const letterGrid = Array.from({ length: n }, () => Array(n).fill(''));
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                letterGrid[r][c] = this.letters[perm[grid[r][c]]];
            }
        }

        return letterGrid;
    }

    /**
     * Check if a letter placement is valid in the given grid
     */
    isValid(grid, r, c, val) {
        for (let i = 0; i < this.size; i++) {
            if (i !== c && grid[r][i] === val) return false;
            if (i !== r && grid[i][c] === val) return false;
        }
        return true;
    }

    /**
     * Find candidates for cell (r, c)
     */
    getCandidates(grid, r, c) {
        if (grid[r][c] !== '') return [];
        const used = new Set();
        for (let i = 0; i < this.size; i++) {
            if (grid[r][i]) used.add(grid[r][i]);
            if (grid[i][c]) used.add(grid[i][c]);
        }
        return this.letters.filter(l => !used.has(l));
    }

    /**
     * Count solutions using backtracking (capped at maxCount)
     */
    countSolutions(grid, maxCount = 2) {
        let count = 0;
        const n = this.size;

        const solve = (g) => {
            let minCandidates = null;
            let bestR = -1;
            let bestC = -1;

            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (g[r][c] === '') {
                        const candidates = this.getCandidates(g, r, c);
                        if (candidates.length === 0) return; // Dead end
                        if (minCandidates === null || candidates.length < minCandidates.length) {
                            minCandidates = candidates;
                            bestR = r;
                            bestC = c;
                            if (candidates.length === 1) break;
                        }
                    }
                }
                if (minCandidates && minCandidates.length === 1) break;
            }

            if (bestR === -1) {
                count++;
                return;
            }

            for (const val of minCandidates) {
                g[bestR][bestC] = val;
                solve(g);
                g[bestR][bestC] = '';
                if (count >= maxCount) return;
            }
        };

        const copy = grid.map(row => [...row]);
        solve(copy);
        return count;
    }

    /**
     * Deduce steps using human-like logic
     * Returns deductions list and whether the puzzle is fully human-solvable without guessing
     */
    analyzeLogic(initialGrid, targetR, targetC) {
        const n = this.size;
        const grid = initialGrid.map(row => [...row]);
        const steps = [];
        let changed = true;

        while (changed) {
            changed = false;

            // Strategy 1: Naked Single (Cell has only 1 candidate remaining)
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (grid[r][c] === '') {
                        const candidates = this.getCandidates(grid, r, c);
                        if (candidates.length === 1) {
                            const val = candidates[0];
                            const rowLetters = grid[r].filter(Boolean);
                            const colLetters = grid.map(row => row[c]).filter(Boolean);
                            
                            grid[r][c] = val;
                            steps.push({
                                type: 'naked_single',
                                r, c,
                                val,
                                explanation: `Row ${r + 1} and Column ${c + 1} already contain [${Array.from(new Set([...rowLetters, ...colLetters])).sort().join(', ')}]. Thus, only '${val}' can fit in cell (Row ${r + 1}, Col ${c + 1}).`,
                                isTarget: (r === targetR && c === targetC)
                            });
                            changed = true;
                            if (r === targetR && c === targetC) {
                                return { solved: true, steps, finalGrid: grid };
                            }
                        }
                    }
                }
            }

            if (changed) continue;

            // Strategy 2: Hidden Single in Row (Letter can only appear in one position in row)
            for (let r = 0; r < n; r++) {
                for (const letter of this.letters) {
                    if (grid[r].includes(letter)) continue;
                    const possibleCols = [];
                    for (let c = 0; c < n; c++) {
                        if (grid[r][c] === '' && this.getCandidates(grid, r, c).includes(letter)) {
                            possibleCols.push(c);
                        }
                    }
                    if (possibleCols.length === 1) {
                        const c = possibleCols[0];
                        grid[r][c] = letter;
                        steps.push({
                            type: 'hidden_single_row',
                            r, c,
                            val: letter,
                            explanation: `In Row ${r + 1}, the letter '${letter}' cannot go into other empty columns because they already have '${letter}' in their respective columns. Therefore, cell (Row ${r + 1}, Col ${c + 1}) must be '${letter}'.`,
                            isTarget: (r === targetR && c === targetC)
                        });
                        changed = true;
                        if (r === targetR && c === targetC) {
                            return { solved: true, steps, finalGrid: grid };
                        }
                    }
                }
            }

            if (changed) continue;

            // Strategy 3: Hidden Single in Column
            for (let c = 0; c < n; c++) {
                for (const letter of this.letters) {
                    const colVals = grid.map(row => row[c]);
                    if (colVals.includes(letter)) continue;
                    const possibleRows = [];
                    for (let r = 0; r < n; r++) {
                        if (grid[r][c] === '' && this.getCandidates(grid, r, c).includes(letter)) {
                            possibleRows.push(r);
                        }
                    }
                    if (possibleRows.length === 1) {
                        const r = possibleRows[0];
                        grid[r][c] = letter;
                        steps.push({
                            type: 'hidden_single_col',
                            r, c,
                            val: letter,
                            explanation: `In Column ${c + 1}, the letter '${letter}' cannot go into other empty rows because they already have '${letter}' in their respective rows. Therefore, cell (Row ${r + 1}, Col ${c + 1}) must be '${letter}'.`,
                            isTarget: (r === targetR && c === targetC)
                        });
                        changed = true;
                        if (r === targetR && c === targetC) {
                            return { solved: true, steps, finalGrid: grid };
                        }
                    }
                }
            }
        }

        const isTargetSolved = grid[targetR][targetC] !== '';
        return { solved: isTargetSolved, steps, finalGrid: grid };
    }

    /**
     * Generate a puzzle matching the requested difficulty
     */
    generatePuzzle(difficulty = 'medium') {
        const n = this.size;
        let attempts = 0;

        while (attempts < 100) {
            attempts++;
            const fullSquare = this.generateFullSquare();
            
            // Choose a target cell for the '?'
            const targetR = Math.floor(Math.random() * n);
            const targetC = Math.floor(Math.random() * n);
            const correctAnswer = fullSquare[targetR][targetC];

            // Create puzzle grid by removing cells
            const puzzleGrid = fullSquare.map(row => [...row]);
            puzzleGrid[targetR][targetC] = '';

            // Determine target clue count based on difficulty & size
            let minClues, maxClues, minSteps, maxSteps;
            if (difficulty === 'easy') {
                minClues = Math.floor(n * n * 0.55);
                maxClues = Math.floor(n * n * 0.70);
                minSteps = 1;
                maxSteps = 2;
            } else if (difficulty === 'medium') {
                minClues = Math.floor(n * n * 0.40);
                maxClues = Math.floor(n * n * 0.55);
                minSteps = 2;
                maxSteps = 4;
            } else if (difficulty === 'hard') {
                minClues = Math.floor(n * n * 0.30);
                maxClues = Math.floor(n * n * 0.42);
                minSteps = 3;
                maxSteps = 7;
            } else { // expert
                minClues = Math.floor(n * n * 0.22);
                maxClues = Math.floor(n * n * 0.35);
                minSteps = 4;
                maxSteps = 12;
            }

            // Shuffle all non-target cells to attempt removal
            const cellPositions = [];
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (r !== targetR || c !== targetC) {
                        cellPositions.push([r, c]);
                    }
                }
            }
            // Shuffle
            for (let i = cellPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cellPositions[i], cellPositions[j]] = [cellPositions[j], cellPositions[i]];
            }

            let currentClues = n * n - 1;

            for (const [r, c] of cellPositions) {
                if (currentClues <= minClues) break;

                const backup = puzzleGrid[r][c];
                puzzleGrid[r][c] = '';

                // Verify the target cell still has a uniquely solvable answer
                const numSolutions = this.countSolutions(puzzleGrid, 2);
                if (numSolutions !== 1) {
                    // Not unique, restore
                    puzzleGrid[r][c] = backup;
                } else {
                    currentClues--;
                }
            }

            // Analyze human logical difficulty
            const logicAnalysis = this.analyzeLogic(puzzleGrid, targetR, targetC);

            if (logicAnalysis.solved) {
                const stepCount = logicAnalysis.steps.length;
                const matchDifficulty = (
                    (difficulty === 'easy' && stepCount <= maxSteps) ||
                    (difficulty === 'medium' && stepCount >= minSteps && stepCount <= maxSteps) ||
                    (difficulty === 'hard' && stepCount >= minSteps) ||
                    (difficulty === 'expert')
                );

                if (matchDifficulty || attempts > 70) {
                    return {
                        size: n,
                        letters: this.letters,
                        target: { r: targetR, c: targetC },
                        correctAnswer,
                        initialGrid: puzzleGrid,
                        fullSquare,
                        difficulty,
                        steps: logicAnalysis.steps,
                        clueCount: currentClues
                    };
                }
            }
        }

        // Guaranteed fallback if needed
        const fullSquare = this.generateFullSquare();
        const targetR = 0;
        const targetC = 0;
        const correctAnswer = fullSquare[targetR][targetC];
        const fallbackGrid = fullSquare.map(row => [...row]);
        fallbackGrid[targetR][targetC] = '';

        return {
            size: n,
            letters: this.letters,
            target: { r: targetR, c: targetC },
            correctAnswer,
            initialGrid: fallbackGrid,
            fullSquare,
            difficulty,
            steps: [{
                type: 'naked_single',
                r: 0, c: 0,
                val: correctAnswer,
                explanation: `Target cell can be deduced directly from surrounding row and column values.`,
                isTarget: true
            }],
            clueCount: n * n - 1
        };
    }
}

// Export for node or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LatinSquareEngine, LETTERS };
} else {
    window.LatinSquareEngine = LatinSquareEngine;
    window.LETTERS = LETTERS;
}

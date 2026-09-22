/**
 * Pattern Recognition / Figure Sequences Generator
 * Authentic dMAT Style: 4x4 grids with animated geometric symbols
 */

const PATTERN_COLORS = [
    { name: 'orange', hex: '#e65100', fill: '#ff9800' },
    { name: 'green', hex: '#1b5e20', fill: '#4caf50' },
    { name: 'yellow', hex: '#f57f17', fill: '#ffeb3b' },
    { name: 'black', hex: '#212121', fill: '#424242' },
    { name: 'white', hex: '#37474f', fill: '#ffffff', border: '#263238' },
    { name: 'blue', hex: '#0d47a1', fill: '#2196f3' }
];

const SYMBOL_TYPES = ['arrow', 'corner', 'diamond', 'triangle', 'circle', 'cross'];

class FigureSequenceEngine {
    constructor(gridSize = 4) {
        this.gridSize = gridSize; // 4x4
    }

    /**
     * Generate perimeter path for 4x4 grid (12 perimeter cells in clockwise order)
     */
    getPerimeterCells() {
        const cells = [];
        const n = this.gridSize;
        // Top row (0,0) -> (0, n-1)
        for (let c = 0; c < n; c++) cells.push({ r: 0, c });
        // Right col (1, n-1) -> (n-1, n-1)
        for (let r = 1; r < n; r++) cells.push({ r, c: n - 1 });
        // Bottom row (n-1, n-2) -> (n-1, 0)
        for (let c = n - 2; c >= 0; c--) cells.push({ r: n - 1, c });
        // Left col (n-2, 0) -> (1, 0)
        for (let r = n - 2; r >= 1; r--) cells.push({ r, c: 0 });
        return cells;
    }

    /**
     * Generate a complete 6-step Figure Sequence with 2-4 symbols
     */
    generateSequence(difficulty = 'medium') {
        const numSymbols = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
        const perimeter = this.getPerimeterCells();

        const symbolsConfig = [];
        const chosenTypes = this.shuffle([...SYMBOL_TYPES]).slice(0, numSymbols);

        // Movement rules library
        const movementRules = [
            {
                type: 'perimeter_cw',
                name: 'Clockwise around perimeter',
                step: 1,
                getPos: (startIdx, step, stepIdx) => perimeter[(startIdx + step * stepIdx) % perimeter.length],
                explain: (step) => `Moves 1 cell clockwise along the perimeter each step.`
            },
            {
                type: 'perimeter_ccw',
                name: 'Counter-clockwise around perimeter',
                step: 1,
                getPos: (startIdx, step, stepIdx) => {
                    const idx = (startIdx - step * stepIdx) % perimeter.length;
                    return perimeter[idx < 0 ? idx + perimeter.length : idx];
                },
                explain: (step) => `Moves 1 cell counter-clockwise along the perimeter each step.`
            },
            {
                type: 'perimeter_cw_2',
                name: 'Clockwise by 2 steps',
                step: 2,
                getPos: (startIdx, step, stepIdx) => perimeter[(startIdx + step * stepIdx) % perimeter.length],
                explain: () => `Moves 2 cells clockwise around the perimeter every step.`
            },
            {
                type: 'col_down_wrap',
                name: 'Downwards along column with wrap',
                getPos: (startIdx, step, stepIdx, config) => ({
                    r: (config.startRow + stepIdx) % 4,
                    c: config.fixedCol
                }),
                explain: (step, config) => `Shifts 1 cell downwards in column ${config.fixedCol + 1}, wrapping from bottom to top.`
            },
            {
                type: 'col_up_wrap',
                name: 'Upwards along column with wrap',
                getPos: (startIdx, step, stepIdx, config) => {
                    let r = (config.startRow - stepIdx) % 4;
                    if (r < 0) r += 4;
                    return { r, c: config.fixedCol };
                },
                explain: (step, config) => `Shifts 1 cell upwards in column ${config.fixedCol + 1}, wrapping from top to bottom.`
            },
            {
                type: 'row_right_wrap',
                name: 'Rightwards along row with wrap',
                getPos: (startIdx, step, stepIdx, config) => ({
                    r: config.fixedRow,
                    c: (config.startCol + stepIdx) % 4
                }),
                explain: (step, config) => `Shifts 1 cell rightwards in row ${config.fixedRow + 1}, wrapping from right to left.`
            },
            {
                type: 'diag_bounce',
                name: 'Diagonal bounce',
                getPos: (startIdx, step, stepIdx, config) => {
                    const path = [0, 1, 2, 3, 2, 1];
                    const pos = path[stepIdx % path.length];
                    return config.diagType === 'main' ? { r: pos, c: pos } : { r: pos, c: 3 - pos };
                },
                explain: (step, config) => `Moves along the diagonal (${config.diagType === 'main' ? 'top-left to bottom-right' : 'top-right to bottom-left'}), bouncing back at edges.`
            },
            {
                type: 'quadrant_jump',
                name: 'Jumping between quadrants',
                getPos: (startIdx, step, stepIdx) => {
                    const quads = [{ r: 0, c: 0 }, { r: 0, c: 3 }, { r: 3, c: 3 }, { r: 3, c: 0 }];
                    return quads[(startIdx + stepIdx) % 4];
                },
                explain: () => `Jumps clockwise between the 4 corner positions.`
            }
        ];

        // Assign distinct non-overlapping rules to each symbol
        const usedMovementTypes = new Set();
        const usedColors = this.shuffle([...PATTERN_COLORS]);

        for (let i = 0; i < numSymbols; i++) {
            const symType = chosenTypes[i];
            
            // Pick movement rule
            const availableRules = movementRules.filter(r => !usedMovementTypes.has(r.type));
            const moveRule = availableRules[Math.floor(Math.random() * availableRules.length)] || movementRules[0];
            usedMovementTypes.add(moveRule.type);

            // Starting positions & parameters
            const startIdx = (i * 3 + Math.floor(Math.random() * 3)) % 12;
            const startRow = (i + 1) % 4;
            const startCol = (i * 2 + 1) % 4;
            const fixedCol = (i * 2 + 1) % 4;
            const fixedRow = (i * 2) % 4;
            const diagType = i % 2 === 0 ? 'main' : 'anti';

            // Rotation rule
            let rotRule = 'static';
            let rotStep = 0;
            let rotExplain = '';
            if (symType === 'arrow' || symType === 'corner' || symType === 'triangle') {
                const rotOptions = [
                    { type: 'rot_cw_90', step: 90, desc: 'rotates 90° clockwise each step' },
                    { type: 'rot_ccw_90', step: 270, desc: 'rotates 90° counter-clockwise each step' },
                    { type: 'rot_180', step: 180, desc: 'flips 180° each step' },
                    { type: 'rot_static', step: 0, desc: 'maintains constant orientation' }
                ];
                const chosenRot = rotOptions[Math.floor(Math.random() * rotOptions.length)];
                rotRule = chosenRot.type;
                rotStep = chosenRot.step;
                rotExplain = chosenRot.desc;
            }

            // Color rule
            const baseColor1 = usedColors[i % usedColors.length];
            const baseColor2 = usedColors[(i + 1) % usedColors.length];
            let colorRule = 'static';
            let colorExplain = `Color remains ${baseColor1.name}.`;
            
            if (difficulty !== 'easy' && Math.random() > 0.45) {
                colorRule = 'alternate';
                colorExplain = `Alternates color between ${baseColor1.name} and ${baseColor2.name}.`;
            }

            symbolsConfig.push({
                type: symType,
                startIdx,
                startRow,
                startCol,
                fixedCol,
                fixedRow,
                diagType,
                moveRule,
                startRot: Math.floor(Math.random() * 4) * 90,
                rotStep,
                rotExplain,
                colorRule,
                baseColor1,
                baseColor2,
                colorExplain
            });
        }

        // Build sequence of 6 grid states (0..5)
        const sequence = [];
        for (let stepIdx = 0; stepIdx < 6; stepIdx++) {
            const gridItems = [];
            for (let i = 0; i < symbolsConfig.length; i++) {
                const cfg = symbolsConfig[i];
                const pos = cfg.moveRule.getPos(cfg.startIdx, cfg.moveRule.step || 1, stepIdx, cfg);
                const rot = (cfg.startRot + cfg.rotStep * stepIdx) % 360;
                const color = cfg.colorRule === 'alternate' ? (stepIdx % 2 === 0 ? cfg.baseColor1 : cfg.baseColor2) : cfg.baseColor1;

                gridItems.push({
                    symbol: cfg.type,
                    row: pos.r,
                    col: pos.c,
                    rotation: rot,
                    color: color
                });
            }
            sequence.push(gridItems);
        }

        // Generate Options for Question Mark 1 (step 4) and Question Mark 2 (step 5)
        const q1Correct = sequence[4];
        const q2Correct = sequence[5];

        const q1Options = this.generateOptionsForState(q1Correct, symbolsConfig, 4);
        const q2Options = this.generateOptionsForState(q2Correct, symbolsConfig, 5);

        // Formulate step-by-step logic explanation
        const explanations = symbolsConfig.map((cfg) => {
            const symTitle = cfg.type.toUpperCase() + ` (${cfg.baseColor1.name})`;
            const moveTxt = cfg.moveRule.explain(cfg.moveRule.step, cfg);
            const rotTxt = cfg.rotExplain ? `Orientation: ${cfg.rotExplain}.` : '';
            const colTxt = cfg.colorRule === 'alternate' ? `Color: ${cfg.colorExplain}` : '';
            return {
                symbol: cfg.type,
                color: cfg.baseColor1.hex,
                title: symTitle,
                rule: [moveTxt, rotTxt, colTxt].filter(Boolean).join(' ')
            };
        });

        return {
            givenPictures: [sequence[0], sequence[1], sequence[2], sequence[3]],
            solution1: q1Correct,
            solution2: q2Correct,
            q1Options: q1Options.options,
            q1CorrectIndex: q1Options.correctIndex,
            q2Options: q2Options.options,
            q2CorrectIndex: q2Options.correctIndex,
            explanations: explanations,
            difficulty: difficulty
        };
    }

    /**
     * Generate 3 option grids (1 correct, 2 plausible distractors)
     */
    generateOptionsForState(correctState, configs, stepIndex) {
        const correctClone = JSON.parse(JSON.stringify(correctState));
        
        // Distractor 1: Mutate position of one symbol (1 step offset)
        const distractor1 = JSON.parse(JSON.stringify(correctState));
        const mutIdx1 = Math.floor(Math.random() * distractor1.length);
        distractor1[mutIdx1].row = (distractor1[mutIdx1].row + (Math.random() > 0.5 ? 1 : 3)) % 4;

        // Distractor 2: Mutate rotation or color
        const distractor2 = JSON.parse(JSON.stringify(correctState));
        const mutIdx2 = (mutIdx1 + 1) % distractor2.length;
        if (distractor2[mutIdx2].rotation !== undefined && (distractor2[mutIdx2].symbol === 'arrow' || distractor2[mutIdx2].symbol === 'corner' || distractor2[mutIdx2].symbol === 'triangle')) {
            distractor2[mutIdx2].rotation = (distractor2[mutIdx2].rotation + 90) % 360;
        } else {
            const otherColor = PATTERN_COLORS.find(c => c.name !== distractor2[mutIdx2].color.name) || PATTERN_COLORS[0];
            distractor2[mutIdx2].color = otherColor;
        }

        const list = [
            { state: correctClone, isCorrect: true },
            { state: distractor1, isCorrect: false },
            { state: distractor2, isCorrect: false }
        ];

        const shuffled = this.shuffle(list);
        const correctIndex = shuffled.findIndex(item => item.isCorrect);

        return {
            options: shuffled.map(item => item.state),
            correctIndex: correctIndex
        };
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Render SVG element string for a symbol inside a grid cell
     */
    static renderSymbolSVG(symbol, rotation = 0, colorObj = PATTERN_COLORS[0], size = 26) {
        const hex = colorObj.hex || '#e65100';
        const fill = colorObj.fill || hex;
        const transform = `rotate(${rotation} 16 16)`;

        let path = '';
        if (symbol === 'arrow') {
            path = `<g transform="${transform}">
                <line x1="5" y1="16" x2="25" y2="16" stroke="${hex}" stroke-width="3.5" stroke-linecap="round"/>
                <polyline points="18,8 26,16 18,24" fill="none" stroke="${hex}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>`;
        } else if (symbol === 'corner') {
            path = `<g transform="${transform}">
                <polyline points="8,8 8,24 24,24" fill="none" stroke="${hex}" stroke-width="3.5" stroke-linecap="square"/>
                <circle cx="8" cy="8" r="2.5" fill="${hex}"/>
                <circle cx="24" cy="24" r="2.5" fill="${hex}"/>
            </g>`;
        } else if (symbol === 'diamond') {
            path = `<g transform="${transform}">
                <polygon points="16,5 27,16 16,27 5,16" fill="${fill}" stroke="${hex}" stroke-width="2.5"/>
            </g>`;
        } else if (symbol === 'triangle') {
            path = `<g transform="${transform}">
                <polygon points="16,5 27,26 5,26" fill="${fill}" stroke="${hex}" stroke-width="2.5"/>
            </g>`;
        } else if (symbol === 'circle') {
            path = `<g transform="${transform}">
                <circle cx="16" cy="16" r="10" fill="${fill}" stroke="${hex}" stroke-width="2.5"/>
            </g>`;
        } else if (symbol === 'cross') {
            path = `<g transform="${transform}">
                <line x1="7" y1="7" x2="25" y2="25" stroke="${hex}" stroke-width="3.5" stroke-linecap="round"/>
                <line x1="25" y1="7" x2="7" y2="25" stroke="${hex}" stroke-width="3.5" stroke-linecap="round"/>
            </g>`;
        }

        return `<svg class="figure-svg-symbol" viewBox="0 0 32 32" width="${size}" height="${size}">${path}</svg>`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FigureSequenceEngine, PATTERN_COLORS, SYMBOL_TYPES };
}
if (typeof window !== 'undefined') {
    window.FigureSequenceEngine = FigureSequenceEngine;
    window.PATTERN_COLORS = PATTERN_COLORS;
    window.SYMBOL_TYPES = SYMBOL_TYPES;
}

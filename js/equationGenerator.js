/**
 * Mathematical Equations / Linear Equations Generator
 * Authentic dMAT Style: 4 unknowns (A, B, C, D) with integer values 1 to 20
 */

class EquationEngine {
    constructor() {
        this.variables = ['A', 'B', 'C', 'D'];
    }

    /**
     * Generate a solvable system of equations with positive integers in [1, 20]
     */
    generateSystem(difficulty = 'medium') {
        let attempts = 0;
        while (attempts < 200) {
            attempts++;
            const puzzle = this._tryGenerate(difficulty);
            if (puzzle && this.verifyUnique(puzzle)) {
                return puzzle;
            }
        }
        // Fallback guaranteed system
        return this.getFallbackPuzzle();
    }

    _tryGenerate(difficulty) {
        // Pick 4 distinct integers between 1 and 20
        const b = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 for clean multipliers
        const multC = Math.floor(Math.random() * 5) + 3; // 3 to 8
        const c = b * multC;
        if (c > 20 || c === b) return null;

        const multA = Math.floor(Math.random() * 4) + 2; // 2 to 5
        const a = b * multA;
        if (a > 20 || a === b || a === c) return null;

        const offsetD = Math.floor(Math.random() * 12) + 3;
        const d = b + offsetD;
        if (d > 20 || d === b || d === a || d === c) return null;

        const values = { A: a, B: b, C: c, D: d };

        // Generate 4 equation templates
        const templates = [
            {
                text: `${multC} \u00D7 B = C`,
                eval: (v) => multC * v.B === v.C,
                explain: `From equation "${multC} \u00D7 B = C", we know C is a multiple of B (${multC}\u00D7).`
            },
            {
                text: `${multA} \u00D7 B = A`,
                eval: (v) => multA * v.B === v.A,
                explain: `From equation "${multA} \u00D7 B = A", A is ${multA} times B.`
            },
            {
                text: `${offsetD} + B = D`,
                eval: (v) => offsetD + v.B === v.D,
                explain: `From equation "${offsetD} + B = D", D is ${offsetD} greater than B.`
            }
        ];

        // Composite 4th equation linking them all
        const compositeVal = a - b + c - d;
        templates.unshift({
            text: `A - B + C - D = ${compositeVal}`,
            eval: (v) => v.A - v.B + v.C - v.D === compositeVal,
            explain: `Substitute A = ${multA}B, C = ${multC}B, D = B + ${offsetD} into "A - B + C - D = ${compositeVal}":`
        });

        // Step-by-step derivation
        // (multA*B) - B + (multC*B) - (B + offsetD) = compositeVal
        // (multA - 1 + multC - 1)*B - offsetD = compositeVal
        const coeffB = multA - 1 + multC - 1;
        const targetB = (compositeVal + offsetD) / coeffB;

        if (targetB !== b) return null;

        // Formulate steps
        const steps = [
            `Express unknowns in terms of B:`,
            `\u2022 A = ${multA} \u00D7 B`,
            `\u2022 C = ${multC} \u00D7 B`,
            `\u2022 D = B + ${offsetD}`,
            `Substitute into the master equation: (${multA}B) - B + (${multC}B) - (B + ${offsetD}) = ${compositeVal}`,
            `Simplify: ${coeffB} \u00D7 B - ${offsetD} = ${compositeVal} \u27F9 ${coeffB} \u00D7 B = ${compositeVal + offsetD}`,
            `Solve for B: B = ${compositeVal + offsetD} \u00F7 ${coeffB} = <b>${b}</b>`,
            `Calculate remaining values:`,
            `\u2022 A = ${multA} \u00D7 ${b} = <b>${a}</b>`,
            `\u2022 C = ${multC} \u00D7 ${b} = <b>${c}</b>`,
            `\u2022 D = ${b} + ${offsetD} = <b>${d}</b>`
        ];

        // Shuffle equation display order
        const shuffledEqs = this.shuffle([...templates]);

        return {
            equations: shuffledEqs.map(e => e.text),
            solutions: values,
            steps: steps,
            difficulty: difficulty
        };
    }

    /**
     * Ensure there is strictly one integer solution in [1..20]
     */
    verifyUnique(puzzle) {
        let solutionsCount = 0;
        for (let b = 1; b <= 20; b++) {
            for (let a = 1; a <= 20; a++) {
                for (let c = 1; c <= 20; c++) {
                    for (let d = 1; d <= 20; d++) {
                        const v = { A: a, B: b, C: c, D: d };
                        // Check if all equations satisfied
                        const allMatch = puzzle.equations.every(eq => this.evalEquation(eq, v));
                        if (allMatch) {
                            solutionsCount++;
                            if (solutionsCount > 1) return false;
                        }
                    }
                }
            }
        }
        return solutionsCount === 1;
    }

    evalEquation(eqStr, v) {
        try {
            const parts = eqStr.split('=');
            if (parts.length !== 2) return false;
            let lhs = parts[0].trim();
            let rhs = parts[1].trim();

            const replaceVars = (expr) => {
                return expr
                    .replace(/\bA\b/g, v.A)
                    .replace(/\bB\b/g, v.B)
                    .replace(/\bC\b/g, v.C)
                    .replace(/\bD\b/g, v.D)
                    .replace(/\u00D7/g, '*')
                    .replace(/\u00F7/g, '/')
                    .replace(/x/g, '*');
            };

            const evalLhs = Function('"use strict";return (' + replaceVars(lhs) + ')')();
            const evalRhs = Function('"use strict";return (' + replaceVars(rhs) + ')')();
            return Math.abs(evalLhs - evalRhs) < 1e-6;
        } catch (e) {
            return false;
        }
    }

    getFallbackPuzzle() {
        return {
            equations: [
                'A - B + C - D = 2',
                '10 \u00D7 B = C',
                '5 \u00D7 B = A',
                '11 + B = D'
            ],
            solutions: { A: 5, B: 1, C: 10, D: 12 },
            steps: [
                'Substitute A = 5B, C = 10B, and D = B + 11 into the first equation:',
                '5B - B + 10B - (B + 11) = 2',
                '13B - 11 = 2 \u27F9 13B = 13 \u27F9 <b>B = 1</b>',
                'Now calculate the remaining unknowns:',
                '\u2022 A = 5 \u00D7 1 = <b>5</b>',
                '\u2022 C = 10 \u00D7 1 = <b>10</b>',
                '\u2022 D = 11 + 1 = <b>12</b>'
            ],
            difficulty: 'medium'
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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EquationEngine };
}
if (typeof window !== 'undefined') {
    window.EquationEngine = EquationEngine;
}

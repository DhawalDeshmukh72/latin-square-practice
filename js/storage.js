/**
 * Storage Manager for dMAT Aptitude Practice Platform
 * Supports Latin Square, Figure Sequences, and Mathematical Equations
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEY_STATS = 'dmat_practice_stats_v2';
        this.STORAGE_KEY_SETTINGS = 'dmat_practice_settings_v2';
    }

    getSettings() {
        const defaults = {
            theme: 'authentic', // 'authentic', 'dark', 'light'
            activeGame: 'latin_square', // 'latin_square', 'figure_sequences', 'math_equations'
            gridSize: 5,        // 4, 5, 6 for Latin Square
            difficulty: 'medium', // 'easy', 'medium', 'hard', 'expert'
            fontSizeLevel: 2,   // 1 (small), 2 (medium), 3 (large)
            scratchpadEnabled: true,
            soundEnabled: true,
            examDuration: 300,  // seconds (5 mins)
            examQuestions: 20
        };
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    }

    getDefaultStatsForGame() {
        return {
            totalSolved: 0,
            totalCorrect: 0,
            totalWrong: 0,
            currentStreak: 0,
            bestStreak: 0,
            totalTimeMs: 0,
            difficultyStats: {
                easy: { correct: 0, total: 0, totalTimeMs: 0 },
                medium: { correct: 0, total: 0, totalTimeMs: 0 },
                hard: { correct: 0, total: 0, totalTimeMs: 0 },
                expert: { correct: 0, total: 0, totalTimeMs: 0 }
            },
            examSessions: []
        };
    }

    getStats(gameType = 'latin_square') {
        const defaults = {
            latin_square: this.getDefaultStatsForGame(),
            figure_sequences: this.getDefaultStatsForGame(),
            math_equations: this.getDefaultStatsForGame()
        };
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY_STATS);
            if (!saved) return defaults[gameType] || this.getDefaultStatsForGame();
            const parsed = JSON.parse(saved);
            return parsed[gameType] || this.getDefaultStatsForGame();
        } catch (e) {
            return defaults[gameType] || this.getDefaultStatsForGame();
        }
    }

    getAllStats() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY_STATS);
            if (!saved) {
                return {
                    latin_square: this.getDefaultStatsForGame(),
                    figure_sequences: this.getDefaultStatsForGame(),
                    math_equations: this.getDefaultStatsForGame()
                };
            }
            return JSON.parse(saved);
        } catch (e) {
            return {
                latin_square: this.getDefaultStatsForGame(),
                figure_sequences: this.getDefaultStatsForGame(),
                math_equations: this.getDefaultStatsForGame()
            };
        }
    }

    recordAnswer(gameType, isCorrect, timeTakenMs, difficulty) {
        const allStats = this.getAllStats();
        if (!allStats[gameType]) {
            allStats[gameType] = this.getDefaultStatsForGame();
        }
        const stats = allStats[gameType];

        stats.totalSolved++;
        if (isCorrect) {
            stats.totalCorrect++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
        } else {
            stats.totalWrong++;
            stats.currentStreak = 0;
        }
        stats.totalTimeMs += timeTakenMs;

        if (!stats.difficultyStats[difficulty]) {
            stats.difficultyStats[difficulty] = { correct: 0, total: 0, totalTimeMs: 0 };
        }
        stats.difficultyStats[difficulty].total++;
        stats.difficultyStats[difficulty].totalTimeMs += timeTakenMs;
        if (isCorrect) {
            stats.difficultyStats[difficulty].correct++;
        }

        try {
            localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(allStats));
        } catch (e) {
            console.error('Failed to save stats', e);
        }
        return stats;
    }

    recordExamSession(gameType, examResult) {
        const allStats = this.getAllStats();
        if (!allStats[gameType]) {
            allStats[gameType] = this.getDefaultStatsForGame();
        }
        const stats = allStats[gameType];

        stats.examSessions.unshift({
            date: new Date().toISOString(),
            ...examResult
        });
        if (stats.examSessions.length > 30) {
            stats.examSessions = stats.examSessions.slice(0, 30);
        }
        try {
            localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(allStats));
        } catch (e) {
            console.error('Failed to save exam session', e);
        }
    }

    resetStats(gameType = null) {
        try {
            if (!gameType) {
                localStorage.removeItem(this.STORAGE_KEY_STATS);
            } else {
                const allStats = this.getAllStats();
                allStats[gameType] = this.getDefaultStatsForGame();
                localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(allStats));
            }
        } catch (e) {
            console.error('Failed to reset stats', e);
        }
    }
}

window.StorageManager = StorageManager;

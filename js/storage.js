/**
 * Storage Manager for Latin Square Practice
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEY_STATS = 'latin_square_stats';
        this.STORAGE_KEY_SETTINGS = 'latin_square_settings';
        this.STORAGE_KEY_HISTORY = 'latin_square_history';
    }

    getSettings() {
        const defaults = {
            theme: 'authentic', // 'authentic', 'dark', 'light'
            gridSize: 5,        // 4, 5, 6
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

    getStats() {
        const defaults = {
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
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY_STATS);
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    recordAnswer(isCorrect, timeTakenMs, difficulty) {
        const stats = this.getStats();
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
            localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save stats', e);
        }
        return stats;
    }

    recordExamSession(examResult) {
        const stats = this.getStats();
        stats.examSessions.unshift({
            date: new Date().toISOString(),
            ...examResult
        });
        if (stats.examSessions.length > 30) {
            stats.examSessions = stats.examSessions.slice(0, 30);
        }
        try {
            localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save exam session', e);
        }
    }

    resetStats() {
        try {
            localStorage.removeItem(this.STORAGE_KEY_STATS);
        } catch (e) {
            console.error('Failed to reset stats', e);
        }
    }
}

window.StorageManager = StorageManager;

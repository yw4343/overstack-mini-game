// Solvability Checker using Beam Search
// Solves tile matching games to verify winnability

(function (global) {
    'use strict';

    // Solver parameters
    const SOLVER_BEAM_WIDTH = 100;
    const SOLVER_MAX_EXPANSIONS = 5000;
    const SOLVER_MAX_DEPTH = 200;

    /**
     * Resolve tray triples (pure function, works with icon indices).
     * @param {number[]} trayIconIndices
     * @returns {{ tray: number[], clearedCount: number, clearedIcons: number[] }}
     */
    function resolveTrayTriples(trayIconIndices) {
        const tray = [...trayIconIndices]; // Copy
        let clearedCount = 0;
        const clearedIcons = [];

        let changed = true;
        while (changed) {
            changed = false;

            // Count occurrences of each icon
            const iconCounts = {};
            tray.forEach((iconIdx, idx) => {
                if (!iconCounts[iconIdx]) {
                    iconCounts[iconIdx] = [];
                }
                iconCounts[iconIdx].push(idx);
            });

            // Find first icon with count >= 3
            for (const iconIdx in iconCounts) {
                if (Object.prototype.hasOwnProperty.call(iconCounts, iconIdx)) {
                    if (iconCounts[iconIdx].length >= 3) {
                        // Remove earliest 3 occurrences
                        const indices = iconCounts[iconIdx]
                            .slice(0, 3)
                            .sort((a, b) => b - a);
                        indices.forEach(idx => tray.splice(idx, 1));
                        clearedCount += 3;
                        clearedIcons.push(parseInt(iconIdx, 10));
                        changed = true;
                        break;
                    }
                }
            }
        }

        return { tray, clearedCount, clearedIcons };
    }

    /**
     * Hash function for state caching.
     * Simple hash: board slots + tray contents.
     */
    function hashState(board, tray) {
        return board.join(',') + '|' + tray.join(',');
    }

    /**
     * Heuristic scoring function for beam search.
     */
    function scoreState(board, tray, prevTray, prevRemaining, newRemaining) {
        let score = 0;

        // Big reward for triple clears
        const cleared = prevTray.length - tray.length;
        if (cleared >= 3) {
            score += 100 * Math.floor(cleared / 3);
        }

        // Reward for building pairs in tray
        const iconCounts = {};
        tray.forEach(iconIdx => {
            iconCounts[iconIdx] = (iconCounts[iconIdx] || 0) + 1;
        });
        Object.values(iconCounts).forEach(count => {
            if (count === 2) {
                score += 12;
            }
        });

        // Penalize new distinct icons in tray
        const prevIconSet = new Set(prevTray);
        const newIcons = tray.filter(iconIdx => !prevIconSet.has(iconIdx));
        score -= 8 * new Set(newIcons).size;

        // Penalize tray length
        score -= 3 * tray.length;

        // Reward reducing remaining tiles
        const tilesRemoved = prevRemaining - newRemaining;
        score += tilesRemoved * 5;

        return score;
    }

    /**
     * Beam search solver.
     */
    function beamSearchSolve(initialBoard, getClickableSlots, params = {}) {
        const beamWidth = params.beamWidth || SOLVER_BEAM_WIDTH;
        const maxExpansions = params.maxExpansions || SOLVER_MAX_EXPANSIONS;
        const maxDepth = params.maxDepth || SOLVER_MAX_DEPTH;

        const visited = new Map();
        let expansions = 0;
        const perf = typeof performance !== 'undefined' ? performance : Date;
        const startTime = perf.now();

        // Initial state
        const initialRemaining = initialBoard.filter(iconIdx => iconIdx !== -1).length;
        const initialNode = {
            board: [...initialBoard],
            tray: [],
            score: 0,
            moves: [],
            depth: 0,
            hash: hashState(initialBoard, [])
        };

        visited.set(initialNode.hash, { score: 0, trayLen: 0 });

        let beam = [initialNode];

        for (let depth = 0; depth < maxDepth && beam.length > 0; depth++) {
            const candidates = [];

            for (const node of beam) {
                if (expansions >= maxExpansions) break;

                // Check win condition
                const remaining = node.board.filter(iconIdx => iconIdx !== -1).length;
                if (remaining === 0 && node.tray.length === 0) {
                    return {
                        solvable: true,
                        winningMoves: node.moves,
                        stats: {
                            expansionsUsed: expansions,
                            bestScore: node.score,
                            timeMs: perf.now() - startTime,
                            beamWidth,
                            depth
                        }
                    };
                }

                // Get clickable slots
                const clickableSlots = getClickableSlots(node.board);

                for (const slotIdx of clickableSlots) {
                    if (expansions >= maxExpansions) break;
                    expansions++;

                    const iconIdx = node.board[slotIdx];
                    if (iconIdx === -1) continue; // Already empty

                    // Create new state
                    const newBoard = [...node.board];
                    newBoard[slotIdx] = -1;

                    const newTray = [...node.tray, iconIdx];
                    const result = resolveTrayTriples(newTray);

                    // Check lose condition
                    if (result.tray.length > 7) {
                        continue; // Prune invalid state
                    }

                    const newRemaining = newBoard.filter(x => x !== -1).length;
                    const newScore = node.score + scoreState(
                        newBoard,
                        result.tray,
                        node.tray,
                        remaining,
                        newRemaining
                    );

                    const newMoves = [...node.moves, slotIdx];
                    const newHash = hashState(newBoard, result.tray);

                    // Check transposition table
                    const visitedEntry = visited.get(newHash);
                    if (visitedEntry) {
                        // Prune if we've seen this state with better or equal score
                        if (visitedEntry.score >= newScore && visitedEntry.trayLen <= result.tray.length) {
                            continue;
                        }
                    }

                    visited.set(newHash, { score: newScore, trayLen: result.tray.length });

                    candidates.push({
                        board: newBoard,
                        tray: result.tray,
                        score: newScore,
                        moves: newMoves,
                        depth: depth + 1,
                        hash: newHash
                    });
                }
            }

            // Keep top beamWidth candidates by score
            candidates.sort((a, b) => b.score - a.score);
            beam = candidates.slice(0, beamWidth);
        }

        // No solution found
        return {
            solvable: false,
            stats: {
                expansionsUsed: expansions,
                bestScore: beam.length > 0 ? beam[0].score : -Infinity,
                timeMs: perf.now() - startTime,
                beamWidth
            }
        };
    }

    /**
     * Public API: Check if a board assignment is solvable.
     */
    function isSolvable(initialBoardAssignment, getClickableSlotIndices, params = {}) {
        return beamSearchSolve(initialBoardAssignment, getClickableSlotIndices, params);
    }

    // Export for use in game (Node or browser)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { isSolvable, resolveTrayTriples, beamSearchSolve };
    } else {
        global.isSolvable = isSolvable;
        global.SolverResolveTrayTriples = resolveTrayTriples;
        global.SolverBeamSearchSolve = beamSearchSolve;
    }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));



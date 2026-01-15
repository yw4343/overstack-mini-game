// Constants
const TILE_SIZE = 48; // Tile width and height (same for all levels)
const TILE_ICON_SIZE = 33; // Icon font size for tiles (proportional to tile size)
const TRAY_TILE_SIZE = 64; // Tray tile size
const TRAY_ICON_SIZE = 32; // Icon font size for tray tiles
const GAP_X = 18;
const GAP_Y = 18;
const TRAY_SIZE = 7;
const REMOVED_SLOT_GAP = 12;
const REMOVED_SLOT_SIZE = TILE_SIZE; // Removed slots match tile size

// Aliases for backward compatibility and clarity
const TILE_W = TILE_SIZE;
const TILE_H = TILE_SIZE;
const TILE_W_L2 = TILE_SIZE;
const TILE_H_L2 = TILE_SIZE;
const STEP_X_L2 = TILE_SIZE;
const STEP_Y_L2 = TILE_SIZE;

// Icons
const ALL_ICONS = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🍉', '🍋', '🥕', '🌽', '🥑', '🍄', '🌻', '🌸', '🌵'];

// Removed slot IDs
const REMOVED_SLOT_IDS = ['removed0', 'removed1', 'removed2'];

// Game state
let tiles = []; // Array of tile objects: {id, icon, x, y, z, location: 'BOARD'|'TRAY'|'CLEARED', slotId, element}
let tray = []; // Array of tile objects in tray (not just icons)
let gameOver = false;
let currentLevel = 1;
let undoHistory = []; // Array of move history entries
let toolsUsed = { undo: false, remove: false, shuffle: false }; // Track tool usage (one-time use)

// DOM elements
const gameBoard = document.getElementById('gameBoard');
const trayElement = document.getElementById('tray');
const newGameBtn = document.getElementById('newGameBtn');
let toolPanel = null;
let undoBtn = null;
let removeBtn = null;
let shuffleBtn = null;
let debugWindow = null;

// Initialize game
function initGame(resetLevel = true) {
    // Close any open modals
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    tiles = [];
    tray = [];
    undoHistory = [];
    toolsUsed = { undo: false, remove: false, shuffle: false };
    gameOver = false;
    // Only reset to Level 1 when starting a new game (not when advancing levels)
    if (resetLevel) {
        currentLevel = 1;
    }
    gameBoard.innerHTML = '';
    trayElement.innerHTML = '';
    
    // Add level caption
    const levelCaption = document.createElement('div');
    levelCaption.className = 'level-caption';
    levelCaption.textContent = `Level ${currentLevel}`;
    gameBoard.appendChild(levelCaption);
    
    // Create tool panel
    createToolPanel();
    
    // Create removed slots
    createRemovedSlots();
    
    // Create debug window for Level 2 and Level 3
    // if (currentLevel === 2 || currentLevel === 3) {
    //     createDebugWindow();
    // } else {
    //     removeDebugWindow();
    // }
    removeDebugWindow(); // Always remove debug window
    
    // Create skip button for testing
    createSkipButton();
    
    // Build level
    if (currentLevel === 1) {
        buildLevel1();
    } else if (currentLevel === 2) {
        buildLevel2();
    } else if (currentLevel === 3) {
        buildLevel3();
    } else {
        throw "Level not implemented";
    }
    
    renderTray();
    updateBlocking();
    updateToolButtonStates();
    updateDebugWindow();
}

// Create tool panel
function createToolPanel() {
    toolPanel = document.createElement('div');
    toolPanel.id = 'toolPanel';
    toolPanel.className = 'tool-panel';
    
    // Create tools subtitle with help icon
    const toolsHeader = document.createElement('div');
    toolsHeader.className = 'tools-header';
    
    const toolsLabel = document.createElement('span');
    toolsLabel.className = 'tools-label';
    toolsLabel.textContent = 'Tools';
    
    const toolsHelpIcon = document.createElement('span');
    toolsHelpIcon.className = 'help-icon';
    toolsHelpIcon.title = 'Tools Instructions';
    
    const toolsTooltip = document.createElement('span');
    toolsTooltip.className = 'help-tooltip';
    toolsTooltip.innerHTML = '<strong>Undo:</strong>\nUndo your last move.\n\n<strong>Remove:</strong>\nMove the first three tiles in the tray back to the board to free up space.\n\n<strong>Shuffle:</strong>\nShuffle the remaining tiles on the board.\n\nEach tool can only be used <strong>once</strong>. Use them wisely to get out of tight situations and keep making matches.';
    
    toolsHelpIcon.appendChild(document.createTextNode('?'));
    toolsHelpIcon.appendChild(toolsTooltip);
    toolsHeader.appendChild(toolsLabel);
    toolsHeader.appendChild(toolsHelpIcon);
    
    undoBtn = document.createElement('button');
    undoBtn.className = 'tool-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', handleUndo);
    
    removeBtn = document.createElement('button');
    removeBtn.className = 'tool-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', handleRemove);
    
    shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'tool-btn';
    shuffleBtn.textContent = 'Shuffle';
    shuffleBtn.addEventListener('click', handleShuffle);
    
    toolPanel.appendChild(toolsHeader);
    toolPanel.appendChild(undoBtn);
    toolPanel.appendChild(removeBtn);
    toolPanel.appendChild(shuffleBtn);
    
    gameBoard.appendChild(toolPanel);
}

// Create debug window for Level 2 and Level 3
function createDebugWindow() {
    if (debugWindow) {
        debugWindow.remove();
    }
    
    debugWindow = document.createElement('div');
    debugWindow.id = 'debugWindow';
    debugWindow.className = 'debug-window';
    gameBoard.appendChild(debugWindow);
}

// Remove debug window
function removeDebugWindow() {
    if (debugWindow) {
        debugWindow.remove();
        debugWindow = null;
    }
}

// Create skip button for testing
function createSkipButton() {
    // Remove existing skip button if any
    const existingSkipBtn = document.getElementById('skipBtn');
    if (existingSkipBtn) {
        existingSkipBtn.remove();
    }
    
    // Only show skip button if not on the last level
    if (currentLevel < 3) {
        const skipBtn = document.createElement('button');
        skipBtn.id = 'skipBtn';
        skipBtn.className = 'skip-btn';
        skipBtn.textContent = `Skip to Level ${currentLevel + 1}`;
        skipBtn.addEventListener('click', () => {
            currentLevel++;
            initGame(false); // Don't reset level, we're advancing
        });
        gameBoard.appendChild(skipBtn);
    }
}

// Count icons in a tile array (helper function)
function countIcons(tileArray) {
    const counts = {};
    ALL_ICONS.forEach(icon => {
        counts[icon] = 0;
    });
    tileArray.forEach(tile => {
        if (counts.hasOwnProperty(tile.icon)) {
            counts[tile.icon]++;
        }
    });
    return counts;
}

// Update debug window with current icon counts
function updateDebugWindow() {
    if ((currentLevel !== 2 && currentLevel !== 3) || !debugWindow) return;
    
    // Count icons on board (excluding removed slots)
    const boardTiles = tiles.filter(t => 
        t.location === 'BOARD' && !REMOVED_SLOT_IDS.includes(t.slotId)
    );
    const boardCounts = countIcons(boardTiles);
    
    // Count icons in tray
    const trayCounts = countIcons(tray);
    
    // Build HTML
    let html = `<div class="debug-header">Icon Counts (Level ${currentLevel})</div>`;
    html += '<div class="debug-section">';
    html += '<div class="debug-subheader">Board</div>';
    html += '<div class="debug-grid">';
    
    ALL_ICONS.forEach(icon => {
        const count = boardCounts[icon] || 0;
        html += `<div class="debug-item">
            <span class="debug-icon">${icon}</span>
            <span class="debug-count">${count}</span>
        </div>`;
    });
    
    html += '</div></div>';
    html += '<div class="debug-section">';
    html += '<div class="debug-subheader">Tray</div>';
    html += '<div class="debug-grid">';
    
    ALL_ICONS.forEach(icon => {
        const count = trayCounts[icon] || 0;
        html += `<div class="debug-item">
            <span class="debug-icon">${icon}</span>
            <span class="debug-count">${count}</span>
        </div>`;
    });
    
    html += '</div></div>';
    
    debugWindow.innerHTML = html;
}

// Get removed slot positions (helper function)
function getRemovedSlotPositions() {
    const BOARD_W = gameBoard.offsetWidth;
    const BOARD_H = gameBoard.offsetHeight;
    const removedRowY = BOARD_H - REMOVED_SLOT_SIZE - 20;
    const removedRowX = (BOARD_W - (3 * REMOVED_SLOT_SIZE + 2 * REMOVED_SLOT_GAP)) / 2;
    return { removedRowX, removedRowY };
}

// Create removed slots
function createRemovedSlots() {
    const { removedRowX, removedRowY } = getRemovedSlotPositions();
    
    REMOVED_SLOT_IDS.forEach((slotId, i) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'removed-slot';
        slotEl.dataset.slotId = slotId;
        slotEl.style.left = (removedRowX + i * (REMOVED_SLOT_SIZE + REMOVED_SLOT_GAP)) + 'px';
        slotEl.style.top = removedRowY + 'px';
        gameBoard.appendChild(slotEl);
    });
}

// Build Level 1
function buildLevel1() {
    // Grid dimensions
    const gridW = 3 * TILE_W + 2 * GAP_X;
    const gridH = 3 * TILE_H + 2 * GAP_Y;
    const layoutW = gridW;
    const layoutH = gridH + TILE_H / 4;
    
    // Board dimensions
    const BOARD_W = gameBoard.offsetWidth;
    const BOARD_H = gameBoard.offsetHeight;
    
    // Center the layout
    const originX = (BOARD_W - layoutW) / 2;
    const originY = (BOARD_H - layoutH) / 2;
    
    // Pick 3 random icons
    const selectedIcons = [];
    const iconPool = [...ALL_ICONS];
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * iconPool.length);
        selectedIcons.push(iconPool[randomIndex]);
        iconPool.splice(randomIndex, 1);
    }
    
    // Create array with 6 copies of each icon (18 total)
    const iconList = [];
    selectedIcons.forEach(icon => {
        for (let i = 0; i < 6; i++) {
            iconList.push(icon);
        }
    });
    
    // Shuffle
    shuffleArray(iconList);
    
    // Create bottom layer (z = 0)
    let iconIndex = 0;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const px = originX + col * (TILE_W + GAP_X);
            const py = originY + row * (TILE_H + GAP_Y);
            const slotId = `level1_bottom_${row}_${col}`;
            
            const tile = {
                id: tiles.length,
                icon: iconList[iconIndex++],
                x: px,
                y: py,
                z: 0,
                location: 'BOARD',
                slotId: slotId,
                element: null
            };
            tiles.push(tile);
        }
    }
    
    // Create top layer (z = 1)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const px = originX + col * (TILE_W + GAP_X);
            const py = originY + row * (TILE_H + GAP_Y) + TILE_H / 4;
            const slotId = `level1_top_${row}_${col}`;
            
            const tile = {
                id: tiles.length,
                icon: iconList[iconIndex++],
                x: px,
                y: py,
                z: 1,
                location: 'BOARD',
                slotId: slotId,
                element: null
            };
            tiles.push(tile);
        }
    }
    
    // Render tiles
    renderAllTiles();
}

// Store Level 2 slots globally for solver access
let level2Slots = null;

// Store Level 3 slots globally for solver access
let level3Slots = null;

// Build Level 2
function buildLevel2() {
    // Build slots
    level2Slots = buildLevel2Slots();
    
    // Build tiles from slots
    buildLevel2Tiles(level2Slots);
    
    // Render tiles
    renderAllTiles();
}

// Build Level 2 slots
function buildLevel2Slots() {
    const slots = [];
    
    // Board dimensions for centering
    const BOARD_W = gameBoard.offsetWidth;
    const BOARD_H = gameBoard.offsetHeight;
    
    // Calculate origin to center MAIN stack based on top layer (z5) bounding box
    // Top layer (z5) has shift {sx: 0.0, sy: 0.5} - X=0 for stable centering
    // Find the actual pixel bounds of top layer tiles
    const topLayerMask = [
        "##.#.##",
        "#..#..#",
        "..###..",
        "#..#..#",
        "..###..",
        "#..#..#",
        "##.#.##"
    ];
    const topLayerShift = {sx: 0.0, sy: 0.5}; // Top layer uses shiftX=0 for stable centering
    
    // Find min and max x positions in top layer
    let minX = Infinity;
    let maxX = -Infinity;
    for (let yInt = 0; yInt < 7; yInt++) {
        const row = topLayerMask[yInt];
        for (let xInt = 0; xInt < 7; xInt++) {
            if (row[xInt] === '#') {
                const x = xInt + topLayerShift.sx;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            }
        }
    }
    
    // Calculate pixel width of top layer (from left edge of leftmost tile to right edge of rightmost tile)
    // Left edge: originX + minX * STEP_X_L2
    // Right edge: originX + maxX * STEP_X_L2 + TILE_W_L2
    // Width: (maxX - minX) * STEP_X_L2 + TILE_W_L2
    const topLayerPixelWidth = (maxX - minX) * STEP_X_L2 + TILE_W_L2;
    
    // Center the top layer in the board
    // We want: (BOARD_W - topLayerPixelWidth) / 2 = originX + minX * STEP_X_L2
    // So: originX = (BOARD_W - topLayerPixelWidth) / 2 - minX * STEP_X_L2
    const originX = (BOARD_W - topLayerPixelWidth) / 2 - minX * STEP_X_L2;
    const originY = 80; // Top margin (increased to avoid caption overlap and move board down)
    
    // Calculate top layer center in grid coordinates for positioning substacks
    const topLayerCenterX = (minX + maxX) / 2;
    
    // MAIN STACK - Fixed 6-layer woven blueprint (132 slots total)
    // Layer shifts: per-layer fractional offsets (only 0 or ±0.5, no 0.25)
    // Top layer (z=5) has shiftX=0 to match bottom layer for stable centering
    // Mostly Y shifts, only two layers have X shifts (z=3 and z=4)
    const layerShift = [
        {sx: 0.0, sy: 0.0},   // z0 - bottom layer, no offset
        {sx: 0.0, sy: 0.5},   // z1 - Y shift only
        {sx: 0.0, sy: -0.5},  // z2 - Y shift only (negative)
        {sx: 0.5, sy: 0.0},   // z3 - X shift only
        {sx: -0.5, sy: 0.0},  // z4 - X shift only (negative)
        {sx: 0.0, sy: 0.5},   // z5 - top layer, Y shift only, X=0 for stable centering
    ];
    
    // Layer masks: '#' = tile, '.' = empty (7×7 grid, y=0..6 top to bottom)
    const layerMasks = [
        // z0
        [
            "..###..",
            ".#####.",
            "#######",
            "#######",
            "#######",
            ".#####.",
            "..###.."
        ],
        // z1
        [
            "...#...",
            "..###..",
            ".#####.",
            "#######",
            ".#####.",
            "..###..",
            "...#..."
        ],
        // z2 (was 13 → now 21, +8)
        [
            "..###..",
            "..###..",
            ".#.#.#.",
            ".##.#..",
            ".#.#.#.",
            "..###..",
            "..###.."
        ],
        // z3 (was 8 → now 12, +4)
        [
            ".......",
            "..###..",
            "..#.#..",
            ".#...#.",
            "..#.#..",
            "..###..",
            "......."
        ],
        // z4 (was 8 → now 12, +4)
        [
            ".......",
            "..#.#..",
            "..###..",
            ".#...#.",
            "..###..",
            "..#.#..",
            "......."
        ],
        // z5
        [
            "##.#.##",
            "#..#..#",
            "..###..",
            "#..#..#",
            "..###..",
            "#..#..#",
            "##.#.##"
        ]
    ];
    
    // Generate MAIN slots from masks
    // Use integer grid coordinates (xInt, yInt) with layer shifts applied
    const mainSlotCounts = [0, 0, 0, 0, 0, 0];
    for (let z = 0; z < 6; z++) {
        const mask = layerMasks[z];
        const shift = layerShift[z];
        for (let yInt = 0; yInt < 7; yInt++) {
            const row = mask[yInt];
            for (let xInt = 0; xInt < 7; xInt++) {
                if (row[xInt] === '#') {
                    // Apply layer shift to integer grid coordinates
                    const x = xInt + shift.sx;
                    const y = yInt + shift.sy;
            slots.push({
                slotId: `main_${z}_${xInt}_${yInt}`,
                x: x,  // Float: xInt + fractional shift
                y: y,  // Float: yInt + fractional shift
                z: z,
                region: 'MAIN'
            });
                    mainSlotCounts[z]++;
                }
            }
        }
    }
    
    // Print layer counts and verify
    const totalMain = mainSlotCounts.reduce((sum, count) => sum + count, 0);
    console.log('Level 2 MAIN stack layer counts:');
    for (let z = 0; z < 6; z++) {
        console.log(`  z${z}: ${mainSlotCounts[z]} tiles`);
    }
    console.log(`  TOTAL MAIN: ${totalMain} tiles`);
    
    if (totalMain !== 132) {
        console.error(`MAIN stack count mismatch: expected 132, got ${totalMain}`);
    }
    
    if (mainSlotCounts[5] < 20) {
        console.error(`Top layer (z5) has ${mainSlotCounts[5]} tiles, but >=20 required`);
    } else {
        console.log(`Top layer (z5) has ${mainSlotCounts[5]} tiles (>=20 required) ✓`);
    }
    
    // Position substacks relative to top layer center, maintaining current distances
    // Current positions relative to center: SUB_LEFT at -1, SUB_RIGHT at 7, SUB_LEFT_SIDE at -1.0
    // SUB_RIGHT_SIDE positioned at x=7.0 (right next to grid)
    // Calculate distances from center to maintain them
    const subLeftDistance = -1 - topLayerCenterX;      // Distance from center to SUB_LEFT
    const subRightDistance = 7 - topLayerCenterX;      // Distance from center to SUB_RIGHT
    const subLeftSideDistance = -1.0 - topLayerCenterX; // Distance from center to SUB_LEFT_SIDE (right next to grid)
    // SUB_RIGHT_SIDE will be positioned at x=7.0 (right next to grid)
    
    // SUB_LEFT (bottom): positioned relative to top layer center, moved a bit lower
    // Main grid goes from y=0 to y=6, place at y=7.5 (slightly lower)
    for (let z = 0; z <= 11; z++) {
        slots.push({
            slotId: `sub_left_${z}`,
            x: topLayerCenterX + subLeftDistance,
            y: 7.5,
            z: z,
            region: 'SUB_LEFT'
        });
    }
    
    // SUB_RIGHT (bottom): positioned relative to top layer center, moved a bit lower
    for (let z = 0; z <= 11; z++) {
        slots.push({
            slotId: `sub_right_${z}`,
            x: topLayerCenterX + subRightDistance,
            y: 7.5,
            z: z,
            region: 'SUB_RIGHT'
        });
    }
    
    // SUB_LEFT_SIDE (left of MAIN): positioned relative to top layer center
    // Position vertically centered relative to MAIN, slightly left to avoid blocking
    const mainCenterY = 3; // Approximate center of MAIN stack
    for (let z = 0; z <= 11; z++) {
        slots.push({
            slotId: `sub_left_side_${z}`,
            x: topLayerCenterX + subLeftSideDistance,
            y: mainCenterY,
            z: z,
            region: 'SUB_LEFT_SIDE'
        });
    }
    
    // SUB_RIGHT_SIDE (right of MAIN): positioned at x=7.0 (right next to grid)
    // Main grid ends at x=6, so x=7.0 places it right next to the grid
    for (let z = 0; z <= 11; z++) {
        slots.push({
            slotId: `sub_right_side_${z}`,
            x: 7.0,
            y: mainCenterY,
            z: z,
            region: 'SUB_RIGHT_SIDE'
        });
    }
    
    // Assert total slots = 180
    if (slots.length !== 180) {
        console.error(`Level 2 slot count mismatch: expected 180, got ${slots.length}`);
    }
    
    // Calculate pixel positions for all slots using exact tile-size steps
    slots.forEach(slot => {
        let px = originX + slot.x * STEP_X_L2;
        let py = originY + slot.y * STEP_Y_L2;
        
        // Add spread-out card effect for bottom sub stacks (horizontal spread)
        if (slot.region === 'SUB_LEFT' || slot.region === 'SUB_RIGHT') {
            // Offset x slightly based on z-index to create fan effect
            // Higher z (top tiles) have more offset
            const spreadOffset = slot.z * 2; // 2px per layer
            if (slot.region === 'SUB_LEFT') {
                px += spreadOffset; // Spread to the right
            } else {
                px -= spreadOffset; // Spread to the left
            }
        }
        
        // Add spread-out card effect for side sub stacks (vertical spread)
        if (slot.region === 'SUB_LEFT_SIDE' || slot.region === 'SUB_RIGHT_SIDE') {
            // Offset y slightly based on z-index to create vertical fan effect
            // Higher z (top tiles) have more offset
            const spreadOffset = slot.z * 2; // 2px per layer
            py += spreadOffset; // Spread downward
        }
        
        slot.px = px;
        slot.py = py;
    });
    
    // Assert no same-layer overlaps in MAIN stack
    const mainSlots = slots.filter(s => s.region === 'MAIN');
    for (let z = 0; z < 6; z++) {
        const layerSlots = mainSlots.filter(s => s.z === z);
        const tileRects = layerSlots.map(slot => ({
            x: slot.px,
            y: slot.py,
            w: TILE_W_L2,
            h: TILE_H_L2,
            slotId: slot.slotId
        }));
        
        // Check all pairs in this layer for overlap
        for (let i = 0; i < tileRects.length; i++) {
            for (let j = i + 1; j < tileRects.length; j++) {
                const A = tileRects[i];
                const B = tileRects[j];
                
                const overlapX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
                const overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
                
                if (overlapX > 0 && overlapY > 0) {
                    console.error(`Same-layer overlap detected in z${z}: ${A.slotId} and ${B.slotId}`);
                    console.error(`  A: (${A.x}, ${A.y}) size ${A.w}×${A.h}`);
                    console.error(`  B: (${B.x}, ${B.y}) size ${B.w}×${B.h}`);
                    console.error(`  Overlap: ${overlapX}×${overlapY}`);
                    throw new Error(`Same-layer overlap in MAIN stack layer z${z}`);
                }
            }
        }
    }
    console.log('✓ No same-layer overlaps detected in MAIN stack');
    
    // Centering sanity check: verify top and bottom layers have same X shift
    const bottomLayerShift = layerShift[0];
    const topLayerShiftCheck = layerShift[5];
    if (bottomLayerShift.sx !== topLayerShiftCheck.sx) {
        console.warn(`Centering warning: Bottom layer shiftX (${bottomLayerShift.sx}) != Top layer shiftX (${topLayerShiftCheck.sx})`);
    } else {
        console.log(`✓ Centering stable: Top and bottom layers both have shiftX = ${topLayerShiftCheck.sx}`);
    }
    
    // Verify no 0.25 offsets exist in layer shifts
    for (let z = 0; z < 6; z++) {
        const shift = layerShift[z];
        if (Math.abs(shift.sx) === 0.25 || Math.abs(shift.sy) === 0.25) {
            console.error(`Layer z${z} has 0.25 offset: sx=${shift.sx}, sy=${shift.sy}`);
            throw new Error(`Level 2 layer shift must use only 0 or ±0.5, no 0.25 offsets`);
        }
    }
    console.log('✓ All layer shifts use only 0 or ±0.5 offsets');
    
    // Compute bounding box of MAIN tiles in pixels for visual centering check
    const mainSlotsWithPixels = slots.filter(s => s.region === 'MAIN');
    if (mainSlotsWithPixels.length > 0) {
        let minPX = Infinity, maxPX = -Infinity;
        let minPY = Infinity, maxPY = -Infinity;
        mainSlotsWithPixels.forEach(slot => {
            minPX = Math.min(minPX, slot.px);
            maxPX = Math.max(maxPX, slot.px + TILE_W_L2);
            minPY = Math.min(minPY, slot.py);
            maxPY = Math.max(maxPY, slot.py + TILE_H_L2);
        });
        const mainBoundingWidth = maxPX - minPX;
        const mainBoundingHeight = maxPY - minPY;
        const mainCenterPX = minPX + mainBoundingWidth / 2;
        const boardCenterX = BOARD_W / 2;
        const centerOffset = Math.abs(mainCenterPX - boardCenterX);
        
        console.log(`Main stack bounding box: ${mainBoundingWidth.toFixed(1)}×${mainBoundingHeight.toFixed(1)}px`);
        console.log(`Main center: ${mainCenterPX.toFixed(1)}px, Board center: ${boardCenterX.toFixed(1)}px`);
        if (centerOffset > 5) {
            console.warn(`Centering offset: ${centerOffset.toFixed(1)}px (should be < 5px for proper centering)`);
        } else {
            console.log(`✓ Main stack centered within ${centerOffset.toFixed(1)}px`);
        }
    }
    
    return slots;
}

// Build Level 2 tiles from slots with solvability checking
function buildLevel2Tiles(slots) {
    const MAX_TRIES = 50;
    let bestAssignment = null;
    let solvable = false;
    
    // Create icon bag: 15 icons × 12 each = 180
    const iconBag = [];
    ALL_ICONS.forEach(icon => {
        for (let i = 0; i < 12; i++) {
            iconBag.push(icon);
        }
    });
    
    // Try to find a solvable assignment
    for (let tryNum = 0; tryNum < MAX_TRIES; tryNum++) {
        // Shuffle icon bag
        shuffleArray(iconBag);
        
        // Create board assignment array (slot index -> icon index)
        const boardAssignment = new Array(slots.length).fill(-1);
        slots.forEach((slot, index) => {
            const iconIndex = ALL_ICONS.indexOf(iconBag[index]);
            boardAssignment[index] = iconIndex;
        });
        
        // Check solvability
        const result = isSolvable(
            boardAssignment,
            (board) => getClickableSlotIndices(board, slots),
            { beamWidth: 100, maxExpansions: 3000, maxDepth: 150 }
        );
        
        if (result.solvable) {
            bestAssignment = [...iconBag];
            solvable = true;
            console.log(`Level 2: Found solvable assignment on try ${tryNum + 1}`, result.stats);
            break;
        }
        
        bestAssignment = [...iconBag]; // Keep last assignment as fallback
    }
    
    if (!solvable) {
        console.warn('Level 2: Could not find solvable assignment after', MAX_TRIES, 'tries. Using last assignment.');
    }
    
    // Assign icons to slots
    slots.forEach((slot, index) => {
        const tile = {
            id: tiles.length,
            icon: bestAssignment[index],
            x: slot.px,
            y: slot.py,
            z: slot.z,
            location: 'BOARD',
            slotId: slot.slotId,
            region: slot.region, // Store region for styling
            element: null
        };
        tiles.push(tile);
    });
}

// Build Level 3
function buildLevel3() {
    // Build slots
    level3Slots = buildLevel3Slots();
    
    // Build tiles from slots
    buildLevel3Tiles(level3Slots);
    
    // Render tiles
    renderAllTiles();
}

// Build Level 3 slots
function buildLevel3Slots() {
    const slots = [];
    
    // Board dimensions for centering
    const BOARD_W = gameBoard.offsetWidth;
    const BOARD_H = gameBoard.offsetHeight;
    
    // Calculate origin to center MAIN stack based on top layer (z11) bounding box
    // Top layer (z11) has shift {sx: 0.0, sy: 0.0} - X=0 for stable centering
    const topLayerMask = [
        ".......",
        "#######",
        "#######",
        ".......",
        "..###..",
        "..###..",
        "......."
    ];
    const topLayerShift = {sx: 0.0, sy: 0.0}; // Top layer uses shiftX=0 for stable centering
    
    // Find min and max x positions in top layer
    let minX = Infinity;
    let maxX = -Infinity;
    for (let yInt = 0; yInt < 7; yInt++) {
        const row = topLayerMask[yInt];
        for (let xInt = 0; xInt < 7; xInt++) {
            if (row[xInt] === '#') {
                const x = xInt + topLayerShift.sx;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            }
        }
    }
    
    // Calculate pixel width of top layer
    const topLayerPixelWidth = (maxX - minX) * STEP_X_L2 + TILE_W_L2;
    
    // Center the top layer in the board
    const originX = (BOARD_W - topLayerPixelWidth) / 2 - minX * STEP_X_L2;
    const originY = 80; // Top margin
    
    // Calculate top layer center in grid coordinates for positioning substacks
    const topLayerCenterX = (minX + maxX) / 2;
    
    // MAIN STACK - 12-layer blueprint (206 slots total)
    // Layer shifts: NO X offsets in layerShift; per-tile X offsets for z1, z3, z5, z7, z9 via tileShiftX_L3
    const layerShift = [
        {sx: 0.0, sy: 0.0},   // z0 - bottom layer, no offset
        {sx: 0.0, sy: -1.0},  // z1 - Y shift only (negative), per-tile X offset applied
        {sx: 0.0, sy: -0.5},  // z2 - Y shift only (negative)
        {sx: 0.0, sy: 0.0},   // z3 - no layer shift, per-tile X offset applied
        {sx: 0.0, sy: 0.5},   // z4 - Y shift only
        {sx: 0.0, sy: 1.0},   // z5 - Y shift only, per-tile X offset applied
        {sx: 0.0, sy: 0.0},   // z6 - no offset
        {sx: 0.0, sy: -1.0},  // z7 - Y shift only (negative), per-tile X offset applied
        {sx: 0.0, sy: -0.5},  // z8 - Y shift only (negative)
        {sx: 0.0, sy: 0.0},   // z9 - no layer shift, per-tile X offset applied
        {sx: 0.0, sy: 0.5},   // z10 - Y shift only
        {sx: 0.0, sy: 0.0},   // z11 - top layer, no offset, X=0 for stable centering
    ];
    
    // Per-tile X offset function for mirrored split (z1, z3, z5, z7, z9)
    function tileShiftX_L3(z, xInt) {
        if (![1, 3, 5, 7, 9].includes(z)) return 0;
        if (xInt === 3) {
            console.error(`Split-shift layer z${z} must have empty center column, but xInt=3 found`);
            throw new Error(`Split-shift layer z${z} must have empty center column`);
        }
        return xInt < 3 ? +0.5 : -0.5;
    }
    
    // Layer masks: '#' = tile, '.' = empty (7×7 grid, y=0..6 top to bottom)
    // z1, z3, z5, z7, z9 use mirrored split X offset (center column empty, not palindromes)
    // Other layers must be palindromes (left-right symmetry)
    const layerMasks = [
        // z0 (18 tiles)
        [
            ".......",
            "...#...",
            ".#...#.",
            "..###..",
            ".#####.",
            "#######",
            "......."
        ],
        // z1 (16 tiles) - center column empty (mirrored split X offset)
        [
            ".......",
            "..#.#..",
            "##...##",
            "###.###",
            "##...##",
            ".......",
            "......."
        ],
        // z2 (18 tiles)
        [
            ".......",
            "..#.#..",
            "##...##",
            ".#####.",
            "#######",
            ".......",
            "......."
        ],
        // z3 (16 tiles) - center column empty (mirrored split X offset)
        [
            ".......",
            ".......",
            "..#.#..",
            "##...##",
            "###.###",
            "##...##",
            "......."
        ],
        // z4 (18 tiles)
        [
            ".......",
            "...#...",
            "..###..",
            ".#####.",
            "##...##",
            ".#####.",
            "......."
        ],
        // z5 (16 tiles) - center column empty (mirrored split X offset)
        [
            ".......",
            ".......",
            "..#.#..",
            "##...##",
            "###.###",
            "##...##",
            "......."
        ],
        // z6 (18 tiles)
        [
            ".......",
            "..###..",
            ".#####.",
            "#######",
            "..###..",
            ".......",
            "......."
        ],
        // z7 (16 tiles) - center column empty (mirrored split X offset)
        [
            ".......",
            "..#.#..",
            "###.###",
            ".......",
            "###.###",
            "..#.#..",
            "......."
        ],
        // z8 (18 tiles)
        [
            ".......",
            "##...##",
            ".#####.",
            "..###..",
            ".#####.",
            "...#...",
            "......."
        ],
        // z9 (16 tiles) - center column empty (mirrored split X offset)
        [
            ".......",
            "..#.#..",
            "##...##",
            "##...##",
            "###.###",
            ".......",
            "......."
        ],
        // z10 (16 tiles)
        [
            ".......",
            "...#...",
            "..###..",
            ".#####.",
            "#######",
            ".......",
            "......."
        ],
        // z11 TOP (20 tiles) - UNCHANGED
        [
            ".......",
            "#######",
            "#######",
            ".......",
            "..###..",
            "..###..",
            "......."
        ]
    ];
    
    // Generate MAIN slots from masks
    const mainSlotCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let z = 0; z < 12; z++) {
        const mask = layerMasks[z];
        const shift = layerShift[z];
        
        // Verify palindrome symmetry (z1, z3, z5, z7, z9 have mirrored split, so not palindromes)
        if (![1, 3, 5, 7, 9].includes(z)) {
            for (let yInt = 0; yInt < 7; yInt++) {
                const row = mask[yInt];
                for (let xInt = 0; xInt < 7; xInt++) {
                    if (row[xInt] !== row[6 - xInt]) {
                        console.error(`Layer z${z}, row ${yInt} is not a palindrome: ${row}`);
                        throw new Error(`Level 3 layer z${z} row ${yInt} must be a palindrome`);
                    }
                }
            }
        }
        
        // Assert center column (xInt == 3) is empty for z1, z3, z5, z7, z9
        if ([1, 3, 5, 7, 9].includes(z)) {
            for (let yInt = 0; yInt < 7; yInt++) {
                if (mask[yInt][3] === '#') {
                    console.error(`Layer z${z}, row ${yInt} has tile in center column (xInt=3)`);
                    throw new Error(`Level 3 layer z${z} must have empty center column (xInt=3)`);
                }
            }
        }
        
        for (let yInt = 0; yInt < 7; yInt++) {
            const row = mask[yInt];
            for (let xInt = 0; xInt < 7; xInt++) {
                if (row[xInt] === '#') {
                    // Apply per-tile X offset for mirrored split layers (z1, z3, z5, z7, z9)
                    const tileXOffset = tileShiftX_L3(z, xInt);
                    // Apply layer shift Y offset
                    const x = xInt + tileXOffset;  // xInt + per-tile X offset
                    const y = yInt + shift.sy;      // yInt + layer Y shift
                    slots.push({
                        slotId: `main_${z}_${xInt}_${yInt}`,
                        x: x,  // Float: xInt + per-tile X offset
                        y: y,  // Float: yInt + layer Y shift
                        z: z,
                        region: 'MAIN'
                    });
                    mainSlotCounts[z]++;
                }
            }
        }
    }
    
    // Print layer counts and verify
    const totalMain = mainSlotCounts.reduce((sum, count) => sum + count, 0);
    console.log('Level 3 MAIN stack layer counts:');
    for (let z = 0; z < 12; z++) {
        console.log(`  z${z}: ${mainSlotCounts[z]} tiles`);
    }
    console.log(`  TOTAL MAIN: ${totalMain} tiles`);
    
    // Assert layer counts
    const expectedCounts = [18, 16, 18, 16, 18, 16, 18, 16, 18, 16, 16, 20];
    for (let z = 0; z < 12; z++) {
        if (mainSlotCounts[z] !== expectedCounts[z]) {
            console.error(`Layer z${z} count mismatch: expected ${expectedCounts[z]}, got ${mainSlotCounts[z]}`);
            throw new Error(`Level 3 layer z${z} count mismatch`);
        }
    }
    
    if (totalMain !== 206) {
        console.error(`MAIN stack count mismatch: expected 206, got ${totalMain}`);
        throw new Error(`Level 3 MAIN stack count mismatch`);
    }
    
    if (mainSlotCounts[11] < 20) {
        console.error(`Top layer (z11) has ${mainSlotCounts[11]} tiles, but >=20 required`);
        throw new Error(`Level 3 top layer must have >=20 tiles`);
    } else {
        console.log(`Top layer (z11) has ${mainSlotCounts[11]} tiles (>=20 required) ✓`);
    }
    
    // Verify each layer has <= 20 tiles
    for (let z = 0; z < 12; z++) {
        if (mainSlotCounts[z] > 20) {
            console.error(`Layer z${z} has ${mainSlotCounts[z]} tiles, but <=20 required`);
            throw new Error(`Level 3 layer z${z} must have <=20 tiles`);
        }
    }
    console.log('✓ All layers have <=20 tiles');
    
    // Position substacks relative to top layer center, maintaining same positions as Level 2
    const subLeftDistance = -1 - topLayerCenterX;
    const subRightDistance = 7 - topLayerCenterX;
    const subLeftSideDistance = -1.0 - topLayerCenterX; // right next to grid
    const mainCenterY = 3;
    
    // SUB_LEFT (bottom): 16 tiles (z=0..15)
    for (let z = 0; z <= 15; z++) {
        slots.push({
            slotId: `sub_left_${z}`,
            x: topLayerCenterX + subLeftDistance,
            y: 7.5,
            z: z,
            region: 'SUB_LEFT'
        });
    }
    
    // SUB_RIGHT (bottom): 16 tiles (z=0..15)
    for (let z = 0; z <= 15; z++) {
        slots.push({
            slotId: `sub_right_${z}`,
            x: topLayerCenterX + subRightDistance,
            y: 7.5,
            z: z,
            region: 'SUB_RIGHT'
        });
    }
    
    // SUB_LEFT_SIDE (left of MAIN): 16 tiles (z=0..15)
    for (let z = 0; z <= 15; z++) {
        slots.push({
            slotId: `sub_left_side_${z}`,
            x: topLayerCenterX + subLeftSideDistance,
            y: mainCenterY,
            z: z,
            region: 'SUB_LEFT_SIDE'
        });
    }
    
    // SUB_RIGHT_SIDE (right of MAIN): 16 tiles (z=0..15)
    // Positioned at x=7.0 (right next to grid)
    for (let z = 0; z <= 15; z++) {
        slots.push({
            slotId: `sub_right_side_${z}`,
            x: 7.0,
            y: mainCenterY,
            z: z,
            region: 'SUB_RIGHT_SIDE'
        });
    }
    
    // Assert total slots = 270 (206 MAIN + 64 substacks)
    const totalSubstacks = 4 * 16; // 64
    if (slots.length !== 270) {
        console.error(`Level 3 slot count mismatch: expected 270, got ${slots.length}`);
        throw new Error(`Level 3 slot count mismatch`);
    }
    console.log(`✓ Level 3 total slots: ${totalMain} MAIN + ${totalSubstacks} substacks = ${slots.length}`);
    
    // Calculate pixel positions for all slots using exact tile-size steps
    slots.forEach(slot => {
        let px = originX + slot.x * STEP_X_L2;
        let py = originY + slot.y * STEP_Y_L2;
        
        // Add spread-out card effect for bottom sub stacks (horizontal spread)
        if (slot.region === 'SUB_LEFT' || slot.region === 'SUB_RIGHT') {
            const spreadOffset = slot.z * 2; // 2px per layer
            if (slot.region === 'SUB_LEFT') {
                px += spreadOffset; // Spread to the right
            } else {
                px -= spreadOffset; // Spread to the left
            }
        }
        
        // Add spread-out card effect for side sub stacks (vertical spread)
        if (slot.region === 'SUB_LEFT_SIDE' || slot.region === 'SUB_RIGHT_SIDE') {
            const spreadOffset = slot.z * 2; // 2px per layer
            py += spreadOffset; // Spread downward
        }
        
        slot.px = px;
        slot.py = py;
    });
    
    // Assert no same-layer overlaps in MAIN stack
    const mainSlots = slots.filter(s => s.region === 'MAIN');
    for (let z = 0; z < 12; z++) {
        const layerSlots = mainSlots.filter(s => s.z === z);
        const tileRects = layerSlots.map(slot => ({
            x: slot.px,
            y: slot.py,
            w: TILE_W_L2,
            h: TILE_H_L2,
            slotId: slot.slotId
        }));
        
        // Check all pairs in this layer for overlap
        for (let i = 0; i < tileRects.length; i++) {
            for (let j = i + 1; j < tileRects.length; j++) {
                const A = tileRects[i];
                const B = tileRects[j];
                
                const overlapX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
                const overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
                
                if (overlapX > 0 && overlapY > 0) {
                    console.error(`Same-layer overlap detected in z${z}: ${A.slotId} and ${B.slotId}`);
                    console.error(`  A: (${A.x}, ${A.y}) size ${A.w}×${A.h}`);
                    console.error(`  B: (${B.x}, ${B.y}) size ${B.w}×${B.h}`);
                    console.error(`  Overlap: ${overlapX}×${overlapY}`);
                    throw new Error(`Same-layer overlap in MAIN stack layer z${z}`);
                }
            }
        }
    }
    console.log('✓ No same-layer overlaps detected in MAIN stack');
    
    // Centering sanity check: verify top and bottom layers have same X shift (both should be 0)
    const bottomLayerShift = layerShift[0];
    const topLayerShiftCheck = layerShift[11];
    if (bottomLayerShift.sx !== topLayerShiftCheck.sx) {
        console.warn(`Centering warning: Bottom layer shiftX (${bottomLayerShift.sx}) != Top layer shiftX (${topLayerShiftCheck.sx})`);
    } else {
        console.log(`✓ Centering stable: Top and bottom layers both have shiftX = ${topLayerShiftCheck.sx}`);
    }
    
    // Verify layer-level X offsets: all must be 0 (per-tile X offsets applied separately for z1, z3, z5, z7, z9)
    let hasLayerXOffset = false;
    for (let z = 0; z < 12; z++) {
        if (layerShift[z].sx !== 0) {
            console.error(`Layer z${z} has layer-level X offset: sx=${layerShift[z].sx} (should be 0)`);
            hasLayerXOffset = true;
        }
    }
    if (hasLayerXOffset) {
        throw new Error(`Level 3 layer-level X offsets must all be 0 (per-tile offsets used for z1, z3, z5, z7, z9)`);
    }
    console.log('✓ All layer-level X offsets are 0 (per-tile offsets used for z1, z3, z5, z7, z9)');
    
    // Verify center column is empty for mirrored split layers
    for (let z of [1, 3, 5, 7, 9]) {
        const mask = layerMasks[z];
        for (let yInt = 0; yInt < 7; yInt++) {
            if (mask[yInt][3] === '#') {
                console.error(`Layer z${z}, row ${yInt} has tile in center column (xInt=3)`);
                throw new Error(`Level 3 layer z${z} must have empty center column for mirrored split`);
            }
        }
    }
    console.log('✓ Center column empty for z1, z3, z5, z7, z9 (mirrored split layers)');
    
    // Verify Y offsets are within [-1, +1]
    for (let z = 0; z < 12; z++) {
        const sy = layerShift[z].sy;
        if (Math.abs(sy) > 1.0) {
            console.error(`Layer z${z} has Y offset outside [-1, +1]: sy=${sy}`);
            throw new Error(`Level 3 Y offsets must be within [-1, +1]`);
        }
    }
    console.log('✓ All Y offsets are within [-1, +1]');
    
    return slots;
}

// Build Level 3 tiles from slots with solvability checking
function buildLevel3Tiles(slots) {
    const MAX_TRIES = 50;
    let bestAssignment = null;
    let solvable = false;
    
    // Create icon bag: 15 icons × 18 each = 270
    const iconBag = [];
    ALL_ICONS.forEach(icon => {
        for (let i = 0; i < 18; i++) {
            iconBag.push(icon);
        }
    });
    
    // Try to find a solvable assignment
    for (let tryNum = 0; tryNum < MAX_TRIES; tryNum++) {
        // Shuffle icon bag
        shuffleArray(iconBag);
        
        // Create board assignment array (slot index -> icon index)
        const boardAssignment = new Array(slots.length).fill(-1);
        slots.forEach((slot, index) => {
            const iconIndex = ALL_ICONS.indexOf(iconBag[index]);
            boardAssignment[index] = iconIndex;
        });
        
        // Check solvability
        const result = isSolvable(
            boardAssignment,
            (board) => getClickableSlotIndices(board, slots),
            { beamWidth: 100, maxExpansions: 3000, maxDepth: 150 }
        );
        
        if (result.solvable) {
            bestAssignment = [...iconBag];
            solvable = true;
            console.log(`Level 3: Found solvable assignment on try ${tryNum + 1}`, result.stats);
            break;
        }
        
        bestAssignment = [...iconBag]; // Keep last assignment as fallback
    }
    
    if (!solvable) {
        console.warn('Level 3: Could not find solvable assignment after', MAX_TRIES, 'tries. Using last assignment.');
    }
    
    // Assign icons to slots
    slots.forEach((slot, index) => {
        const tile = {
            id: tiles.length,
            icon: bestAssignment[index],
            x: slot.px,
            y: slot.py,
            z: slot.z,
            location: 'BOARD',
            slotId: slot.slotId,
            region: slot.region, // Store region for styling
            element: null
        };
        tiles.push(tile);
    });
    
    // Log initial reachable tile count
    const boardTiles = tiles.filter(t => t.location === 'BOARD');
    const tileW = TILE_W_L2;
    const tileH = TILE_H_L2;
    
    let reachableCount = 0;
    let z6ReachableCount = 0;
    
    boardTiles.forEach(tile => {
        const tileRect = {
            x: tile.x,
            y: tile.y,
            w: tileW,
            h: tileH
        };
        
        let isBlocked = false;
        for (let otherTile of boardTiles) {
            if (otherTile.id === tile.id) continue;
            if (otherTile.z <= tile.z) continue;
            
            const otherRect = {
                x: otherTile.x,
                y: otherTile.y,
                w: tileW,
                h: tileH
            };
            
            if (rectanglesOverlap(tileRect, otherRect)) {
                isBlocked = true;
                break;
            }
        }
        
        if (!isBlocked) {
            reachableCount++;
            if (tile.z === 6) {
                z6ReachableCount++;
            }
        }
    });
    
    console.log(`Level 3 initial reachable tiles: ${reachableCount} total`);
    console.log(`Level 3 z6 (top layer) reachable tiles: ${z6ReachableCount} (should be >= 20)`);
    if (z6ReachableCount < 20) {
        console.warn(`Warning: z6 has only ${z6ReachableCount} reachable tiles, but >=20 required`);
    }
}

// Get clickable slot indices for solver (uses existing blocking logic)
function getClickableSlotIndices(boardAssignment, slots) {
    // Use level-specific slots
    if (!slots) {
        if (currentLevel === 2) {
            slots = level2Slots;
        } else if (currentLevel === 3) {
            slots = level3Slots;
        } else {
            slots = level2Slots; // Default fallback
        }
    }
    if (!slots) return [];
    
    // Create temporary tiles from board assignment for blocking check
    const tempTiles = [];
    boardAssignment.forEach((iconIndex, slotIdx) => {
        if (iconIndex === -1) return; // Empty slot
        
        const slot = slots[slotIdx];
        if (!slot) return;
        
        tempTiles.push({
            id: slotIdx,
            icon: ALL_ICONS[iconIndex],
            x: slot.px,
            y: slot.py,
            z: slot.z,
            location: 'BOARD',
            slotId: slot.slotId,
            element: null
        });
    });
    
    // Use existing blocking logic
    const boardTiles = tempTiles.filter(t => t.location === 'BOARD');
    const clickableSlots = [];
    
        boardTiles.forEach(tile => {
        // Check if blocked using existing logic
        // Use Level 2/3 tile sizes (both use TILE_W_L2/TILE_H_L2)
        const tileRect = {
            x: tile.x,
            y: tile.y,
            w: TILE_W_L2,
            h: TILE_H_L2
        };
        
        let isBlocked = false;
        for (let otherTile of boardTiles) {
            if (otherTile.id === tile.id) continue;
            if (otherTile.z <= tile.z) continue;
            
            const otherRect = {
                x: otherTile.x,
                y: otherTile.y,
                w: TILE_W_L2,
                h: TILE_H_L2
            };
            
            if (rectanglesOverlap(tileRect, otherRect)) {
                isBlocked = true;
                break;
            }
        }
        
        if (!isBlocked) {
            clickableSlots.push(tile.id);
        }
    });
    
    return clickableSlots;
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Check if two rectangles overlap (any overlap, even just a corner or edge)
function rectanglesOverlap(rectA, rectB) {
    // Two rectangles overlap if they intersect in both x and y dimensions
    // Using <= and >= to include edge touches as overlaps
    const overlapX = rectA.x < rectB.x + rectB.w && rectA.x + rectA.w > rectB.x;
    const overlapY = rectA.y < rectB.y + rectB.h && rectA.y + rectA.h > rectB.y;
    return overlapX && overlapY;
}

// Update blocking status for all tiles
function updateBlocking() {
    const boardTiles = tiles.filter(t => t.location === 'BOARD');
    
    // Get tile dimensions based on level
    const tileW = (currentLevel === 2 || currentLevel === 3) ? TILE_W_L2 : TILE_W;
    const tileH = (currentLevel === 2 || currentLevel === 3) ? TILE_H_L2 : TILE_H;
    
    boardTiles.forEach(tile => {
        if (!tile.element) return;
        
        // Tiles in removed slots are always free (not blocked)
        if (REMOVED_SLOT_IDS.includes(tile.slotId)) {
            tile.element.classList.remove('blocked');
            return;
        }
        
        // Tile positions are already in pixel coordinates (from slot.px/py)
        const tileRect = {
            x: tile.x,
            y: tile.y,
            w: tileW,
            h: tileH
        };
        
        // Check if any tile with higher z overlaps this tile (even just a corner)
        let isBlocked = false;
        for (let otherTile of boardTiles) {
            if (otherTile.id === tile.id) continue;
            if (otherTile.z <= tile.z) continue;
            
        const otherRect = {
            x: otherTile.x,
            y: otherTile.y,
            w: tileW,
            h: tileH
        };
            
            // Check if other tile overlaps this tile (any overlap counts)
            if (rectanglesOverlap(tileRect, otherRect)) {
                isBlocked = true;
                break;
            }
        }
        
        if (isBlocked) {
            tile.element.classList.add('blocked');
        } else {
            tile.element.classList.remove('blocked');
        }
    });
}

// Handle tile click
function handleTileClick(tileId) {
    if (gameOver) return;
    
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.location !== 'BOARD') return;
    
    // Check if blocked
    const tileEl = tile.element;
    if (tileEl.classList.contains('blocked')) return;
    
    // Save state for undo
    const traySnapshotBefore = tray.map(t => ({ id: t.id, icon: t.icon }));
    
    // Move tile to tray
    tile.location = 'TRAY';
    addToTray(tile);
    
    // Save state after triple resolution
    const traySnapshotAfter = tray.map(t => ({ id: t.id, icon: t.icon }));
    
    // Find tiles that were cleared during this move
    // These are tiles that were in tray before but not after
    const clearedTiles = tiles.filter(t => 
        t.location === 'CLEARED' && 
        traySnapshotBefore.some(tt => tt.id === t.id) &&
        !traySnapshotAfter.some(tt => tt.id === t.id)
    );
    
    // Record undo history
    undoHistory.push({
        tileId: tile.id,
        fromSlotId: tile.slotId,
        fromX: tile.x,
        fromY: tile.y,
        fromZ: tile.z,
        traySnapshotBefore: JSON.parse(JSON.stringify(traySnapshotBefore)), // Deep copy
        traySnapshotAfter: JSON.parse(JSON.stringify(traySnapshotAfter)), // Deep copy
        clearedTilesDuringMove: clearedTiles.map(t => t.id)
    });
    
    // Hide tile element (it's now in tray)
    tileEl.style.transition = 'opacity 0.05s ease';
    tileEl.style.opacity = '0';
    setTimeout(() => {
        tileEl.style.display = 'none';
        updateBlocking();
        checkWinCondition();
        updateToolButtonStates();
        updateDebugWindow();
    }, 50);
}

// Add tile to tray
function addToTray(tile) {
    // Find the last position where this icon exists
    let insertIndex = -1;
    for (let i = tray.length - 1; i >= 0; i--) {
        if (tray[i].icon === tile.icon) {
            insertIndex = i;
            break;
        }
    }
    
    // If icon exists, insert right after the last occurrence
    // Otherwise, add to the rightmost position
    if (insertIndex !== -1) {
        tray.splice(insertIndex + 1, 0, tile);
    } else {
        tray.push(tile);
    }
    
    // Resolve triple matches
    const result = resolveTrayTriples(tray);
    tray = result.tray;
    
    // Render tray first to show the 7th tile
    renderTray();
    updateDebugWindow();
    
    // Check if tray is full (after triple removal)
    if (tray.length >= TRAY_SIZE) {
        gameOver = true;
        // Show modal after a delay so user can see the 7th tile
        setTimeout(() => {
            showGameOverModal();
        }, 500);
        return;
    }
}

// Resolve triple matches in tray (pure function)
function resolveTrayTriples(trayArray) {
    const newTray = [...trayArray];
    const clearedTileIds = [];
    
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i <= newTray.length - 3; i++) {
            if (newTray[i].icon === newTray[i + 1].icon && 
                newTray[i + 1].icon === newTray[i + 2].icon) {
                // Remove the triple
                const removed = newTray.splice(i, 3);
                removed.forEach(tile => {
                    tile.location = 'CLEARED';
                    clearedTileIds.push(tile.id);
                });
                changed = true;
                break;
            }
        }
    }
    
    return { tray: newTray, cleared: clearedTileIds };
}

// Render tray
function renderTray() {
    trayElement.innerHTML = '';
    
    for (let i = 0; i < TRAY_SIZE; i++) {
        const slot = document.createElement('div');
        slot.className = 'tray-slot';
        
        if (i < tray.length) {
            slot.textContent = tray[i].icon;
        } else {
            slot.classList.add('empty');
        }
        
        trayElement.appendChild(slot);
    }
}

// Tool: Undo
function handleUndo() {
    if (undoHistory.length === 0 || gameOver || toolsUsed.undo) return;
    
    toolsUsed.undo = true;
    
    const lastMove = undoHistory.pop();
    const tile = tiles.find(t => t.id === lastMove.tileId);
    if (!tile) return;
    
    // Restore all tiles that were cleared during this move back to TRAY
    lastMove.clearedTilesDuringMove.forEach(tileId => {
        const t = tiles.find(t => t.id === tileId);
        if (t) {
            t.location = 'TRAY';
        }
    });
    
    // Restore tray to before state (reconstruct with proper order)
    tray = lastMove.traySnapshotBefore.map(snapshot => {
        const t = tiles.find(t => t.id === snapshot.id);
        if (t) {
            t.location = 'TRAY';
            return t;
        }
        return null;
    }).filter(t => t !== null);
    
    // Restore picked tile to board
    tile.location = 'BOARD';
    tile.slotId = lastMove.fromSlotId;
    tile.x = lastMove.fromX;
    tile.y = lastMove.fromY;
    tile.z = lastMove.fromZ;
    
    // Re-render everything
    renderAllTiles();
    renderTray();
    updateBlocking();
    updateToolButtonStates();
    updateDebugWindow();
}

// Tool: Remove
function handleRemove() {
    if (tray.length < 3 || gameOver || toolsUsed.remove) return;
    
    // Check if removed slots are empty
    const removedSlotsOccupied = REMOVED_SLOT_IDS.some(slotId => {
        return tiles.some(t => t.location === 'BOARD' && t.slotId === slotId);
    });
    
    if (removedSlotsOccupied) return;
    
    toolsUsed.remove = true;
    
    // Get first 3 tiles from tray
    const removedTiles = tray.splice(0, 3);
    
    // Move tiles to removed slots
    const { removedRowX, removedRowY } = getRemovedSlotPositions();
    removedTiles.forEach((tile, i) => {
        tile.location = 'BOARD';
        tile.slotId = REMOVED_SLOT_IDS[i];
        tile.x = removedRowX + i * (REMOVED_SLOT_SIZE + REMOVED_SLOT_GAP);
        tile.y = removedRowY;
        tile.z = 10; // Removed slots at very high z so they're always on top and not blocked
    });
    
    // Resolve any new triples in remaining tray
    const result = resolveTrayTriples(tray);
    tray = result.tray;
    
    // Re-render
    renderAllTiles();
    renderTray();
    updateBlocking();
    updateToolButtonStates();
    updateDebugWindow();
}

// Tool: Shuffle
function handleShuffle() {
    if (gameOver || toolsUsed.shuffle) return;
    
    // Get all board tiles excluding removed slots (only remaining tiles)
    const boardTiles = tiles.filter(t => 
        t.location === 'BOARD' && !REMOVED_SLOT_IDS.includes(t.slotId)
    );
    
    if (boardTiles.length <= 1) return;
    
    toolsUsed.shuffle = true;
    
    // Shuffle positions in place - collect positions from remaining tiles
    const positions = boardTiles.map(t => ({
        slotId: t.slotId,
        x: t.x,
        y: t.y,
        z: t.z
    }));
    
    // Shuffle the positions array in place
    shuffleArray(positions);
    
    // Reassign positions to tiles (tiles themselves are not modified, only their positions)
    boardTiles.forEach((tile, i) => {
        tile.slotId = positions[i].slotId;
        tile.x = positions[i].x;
        tile.y = positions[i].y;
        tile.z = positions[i].z;
    });
    
    // Re-render
    renderAllTiles();
    updateBlocking();
    updateToolButtonStates();
    updateDebugWindow();
}

// Render all tiles (board and tray)
function renderAllTiles() {
    // Remove all tile elements
    tiles.forEach(tile => {
        if (tile.element) {
            tile.element.remove();
            tile.element = null;
        }
    });
    
    // Render board tiles
    const boardTiles = tiles.filter(t => t.location === 'BOARD');
    boardTiles.sort((a, b) => a.z - b.z).forEach(tile => {
        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        tileEl.textContent = tile.icon;
        
        const isRemovedSlot = REMOVED_SLOT_IDS.includes(tile.slotId);
        // All tiles use the same size (TILE_SIZE = REMOVED_SLOT_SIZE)
        tileEl.style.width = TILE_SIZE + 'px';
        tileEl.style.height = TILE_SIZE + 'px';
        tileEl.style.fontSize = TILE_ICON_SIZE + 'px';
        tileEl.style.left = tile.x + 'px';
        tileEl.style.top = tile.y + 'px';
        
        // Add darker outline to tiles hidden behind others in sub stacks (Level 2 and 3)
        if ((currentLevel === 2 || currentLevel === 3) && !isRemovedSlot && 
            (tile.region === 'SUB_LEFT' || tile.region === 'SUB_RIGHT' || 
             tile.region === 'SUB_LEFT_SIDE' || tile.region === 'SUB_RIGHT_SIDE')) {
            const tilesInSameStack = tiles.filter(t => 
                t.location === 'BOARD' && 
                t.region === tile.region &&
                t.slotId !== tile.slotId
            );
            const hasTilesAbove = tilesInSameStack.some(t => t.z > tile.z);
            
            if (hasTilesAbove) {
                tileEl.style.border = '0.5px solid #8a9a7a';
            }
        }
        
        tileEl.style.zIndex = tile.z;
        tileEl.dataset.tileId = tile.id;
        
        // Use touchstart for immediate mobile response, click as fallback
        let tileClicked = false;
        
        // Add visual feedback on touch
        const handleTouchStart = (e) => {
            if (tileClicked || tileEl.classList.contains('blocked')) return;
            tileEl.classList.add('touch-active');
            
            // Haptic feedback (if available)
            if (navigator.vibrate) {
                navigator.vibrate(20); // Short vibration for tactile feedback
            }
        };
        
        const handleTouchEnd = (e) => {
            tileEl.classList.remove('touch-active');
        };
        
        const handleTileInteraction = (e) => {
            if (tileClicked) return; // Prevent double-firing
            tileClicked = true;
            
            // For touch events, prevent default to avoid double-tap zoom
            if (e.type === 'touchstart') {
                e.preventDefault();
                
                // Keep visual feedback briefly, then remove and trigger click
                setTimeout(() => {
                    tileEl.classList.remove('touch-active');
                    handleTileClick(tile.id);
                }, 50); // Small delay to show visual feedback
            } else {
                // For mouse clicks, no delay needed
                tileEl.classList.remove('touch-active');
                handleTileClick(tile.id);
            }
            
            // Reset flag after a short delay
            setTimeout(() => {
                tileClicked = false;
            }, 300);
        };
        
        tileEl.addEventListener('touchstart', handleTouchStart, { passive: true });
        tileEl.addEventListener('touchend', handleTouchEnd, { passive: true });
        tileEl.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        tileEl.addEventListener('touchstart', handleTileInteraction, { passive: false });
        tileEl.addEventListener('click', handleTileInteraction);
        
        tile.element = tileEl;
        gameBoard.appendChild(tileEl);
    });
}

// Update tool button states
function updateToolButtonStates() {
    if (!undoBtn || !removeBtn || !shuffleBtn) return;
    
    // Undo: disabled if history empty, already used, or game over
    undoBtn.disabled = undoHistory.length === 0 || gameOver || toolsUsed.undo;
    
    // Remove: disabled if tray < 3, removed slots occupied, already used, or game over
    const removedSlotsOccupied = REMOVED_SLOT_IDS.some(slotId => {
        return tiles.some(t => t.location === 'BOARD' && t.slotId === slotId);
    });
    removeBtn.disabled = tray.length < 3 || removedSlotsOccupied || gameOver || toolsUsed.remove;
    
    // Shuffle: disabled if <= 1 eligible board tile, already used, or game over
    const boardTiles = tiles.filter(t => 
        t.location === 'BOARD' && !REMOVED_SLOT_IDS.includes(t.slotId)
    );
    shuffleBtn.disabled = boardTiles.length <= 1 || gameOver || toolsUsed.shuffle;
}

// Show modal (helper function)
function showModal(title, message, buttonText) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-content">
            <h2>${title}</h2>
            <p>${message}</p>
            <button onclick="this.closest('.modal-overlay').remove(); initGame();">${buttonText}</button>
        </div>
    `;
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            initGame();
        }
    });
    
    document.body.appendChild(overlay);
}

// Show win modal
function showWinModal() {
    showModal('🎉 Congratulations!', 'You passed!', 'Play Again');
}

// Show game over modal
function showGameOverModal() {
    showModal('😔 Game Over', 'Your tray is full!', 'Try Again');
}

// Check win condition
function checkWinCondition() {
    const boardTiles = tiles.filter(t => t.location === 'BOARD');
    if (boardTiles.length === 0 && tray.length === 0) {
        if (currentLevel === 1) {
            // Advance to Level 2
            currentLevel = 2;
            setTimeout(() => {
                initGame(false); // Don't reset level, we're advancing
            }, 500);
        } else if (currentLevel === 2) {
            // Advance to Level 3
            currentLevel = 3;
            setTimeout(() => {
                initGame(false); // Don't reset level, we're advancing
            }, 500);
        } else {
            // Level 3 complete - show win modal
            gameOver = true;
            setTimeout(() => {
                showWinModal();
            }, 500);
        }
    }
}

// Event listeners
newGameBtn.addEventListener('click', () => {
    initGame();
});

// Initialize on load
window.addEventListener('load', () => {
    initGame();
});

// Handle window resize and orientation changes for mobile
let resizeTimeout;
window.addEventListener('resize', () => {
    // Only handle resize on mobile devices (viewport <= 768px)
    if (window.innerWidth > 768) return;
    
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Re-render tiles to ensure proper positioning after resize
        if (tiles.length > 0) {
            renderAllTiles();
            updateBlocking();
        }
    }, 250);
});

// Prevent double-tap zoom on mobile
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    // Don't prevent default on tiles - let them handle their own events
    if (event.target.closest('.tile')) {
        return;
    }
    
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);



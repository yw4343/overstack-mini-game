# Overstack: Mini Tile Matching Game

A browser-based tile-matching puzzle game where you strategically clear tiles by matching three of a kind in your tray. Navigate through multiple levels with increasing difficulty, using limited tools to overcome challenging board layouts.

This game is built entirely through agentic AI development with human-in-the-loop iteration.

**Live demo**: https://overstack.netlify.app

![Overstack Game](https://img.shields.io/badge/Status-Playable-brightgreen)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)

## Overview

**Overstack** is a tile-matching puzzle game inspired by modern match-3 mechanics. The goal is simple: clear all tiles from the board by strategically moving them into your tray. When three matching tiles are in the tray simultaneously, they automatically disappear. The challenge lies in managing your limited tray space (7 tiles) while dealing with layered tiles that can block each other.

## Features

- **Multiple Levels**: Progress through increasingly challenging levels with unique board layouts
- **Layered Tiles**: Tiles can stack on top of each other, creating strategic depth
- **Smart Blocking System**: Only unblocked tiles can be clicked, adding puzzle-solving elements
- **Limited Tools**: Three one-time-use power-ups to help you out of tight situations
- **Solvability Checker**: Built-in beam search solver to verify level winnability
- **Clean UI**: Modern, responsive design with intuitive controls
- **No Dependencies**: Pure vanilla JavaScript, HTML, and CSS

## How to Play

### Basic Rules

1. **Click tiles** on the board to move them into your tray (bottom of screen)
2. When **three matching icons** appear in the tray, they automatically disappear
3. Your tray can hold a maximum of **7 tiles**
4. **Goal**: Clear all tiles from the board while keeping your tray empty
5. **Lose condition**: If your tray fills up (exceeds 7 tiles) with no matches possible, the game ends

### Tile Mechanics

- Tiles are displayed as emoji icons (🍎, 🍌, 🍇, 🍓, 🍒, 🍍, 🍉, 🍋, 🥕, 🌽, 🥑, 🍄, 🌻, 🌸, 🌵)
- Tiles can be **layered** - some tiles block others underneath
- Only **unblocked tiles** (topmost in their position) can be clicked
- Tiles are removed from the board when clicked and added to the tray

### Tools (One-Time Use)

Each tool can only be used **once per game**:

- **🔄 Undo**: Reverses your last move, returning the most recently moved tile back to the board
- **↩️ Remove**: Takes the first three tiles from your tray and returns them to the board (placed in special "removed slots")
- **🔀 Shuffle**: Randomly rearranges all remaining tiles on the board, potentially changing which tiles are clickable

**Tip**: Use tools strategically when you're stuck or close to filling your tray!

## Setup & Installation

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools or dependencies required

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd stacked
   ```

2. **Open the game**:
   
   **Option A**: Simply open `index.html` in your browser
   
   **Option B**: Use a local web server (recommended):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```
   
   Then navigate to `http://localhost:8000` in your browser

3. **Start playing**: Click the "New Game" button to begin!

## Project Structure

```
stacked/
├── index.html          # Main HTML structure
├── style.css          # All visual styling and layout
├── game.js            # Core game logic and mechanics
├── solver.js          # Beam search solver for level validation
└── README.md          # This file
```

### File Descriptions

- **`index.html`**: Contains the game container, board, tray, and UI elements
- **`style.css`**: Handles all visual styling including tile appearance, board layout, tool panel, and responsive design
- **`game.js`**: Implements game state management, level building, tile interactions, tool mechanics, and win/lose conditions
- **`solver.js`**: Independent solvability checker using beam search algorithm to verify that levels are winnable

## Technical Architecture

### Game State

The game maintains state through several key data structures:

- **`tiles`**: Array of tile objects with properties:
  ```javascript
  {
    id: string,           // Unique identifier
    icon: string,         // Emoji icon from ALL_ICONS
    x: number,            // Board X position
    y: number,            // Board Y position
    z: number,            // Layer index (for stacking)
    location: 'BOARD' | 'TRAY' | 'CLEARED',
    slotId: string,       // Board slot or removed slot ID
    element: HTMLElement  // DOM reference
  }
  ```

- **`tray`**: Array of tile objects currently in the tray (max 7)
- **`currentLevel`**: Current level number (1, 2, 3, etc.)
- **`undoHistory`**: Stack of moves for undo functionality
- **`toolsUsed`**: Object tracking which tools have been used

### Core Game Loop

1. **Initialization**: `initGame()` resets state, creates UI elements, and builds the current level
2. **Tile Click**: Validates clickability, moves tile to tray, resolves triples
3. **State Update**: Recalculates blocking, updates UI, checks win/lose conditions
4. **Level Progression**: On win, advances to next level or shows completion

### Blocking System

Tiles can block each other based on their `z` (layer) value and position. The game calculates which tiles are clickable by checking if any other tile overlaps and has a higher `z` value.

### Tray Resolution

When a tile is added to the tray, the game automatically:
1. Checks for any icon that appears 3+ times
2. Removes the earliest 3 occurrences of that icon
3. Repeats until no more triples exist
4. Updates the visual tray display

## Solver Architecture

The `solver.js` file implements a **beam search algorithm** to verify level solvability:

### Key Components

- **`resolveTrayTriples(trayIconIndices)`**: Pure function that simulates tray triple-clearing logic
- **`beamSearchSolve()`**: Main search algorithm with configurable parameters:
  - `beamWidth`: Number of states to keep at each depth (default: 100)
  - `maxExpansions`: Maximum search nodes to explore (default: 5000)
  - `maxDepth`: Maximum move depth to search (default: 200)
- **`scoreState()`**: Heuristic function that rewards:
  - Clearing triples (+100 per triple)
  - Building pairs in tray (+12 per pair)
  - Reducing remaining tiles (+5 per tile)
  - Penalizes tray size and new distinct icons

### Usage

The solver can be used during level design to ensure levels are winnable:

```javascript
// Example: Check if a board configuration is solvable
const result = isSolvable(
  boardArray,              // Array of icon indices (-1 for empty)
  getClickableSlots,       // Function returning clickable slot indices
  { beamWidth: 100 }       // Optional parameters
);

if (result.solvable) {
  console.log('Level is winnable!');
  console.log('Winning moves:', result.winningMoves);
} else {
  console.log('Level may be unsolvable');
}
```

## Level Design

Levels are built using functions like `buildLevel1()`, `buildLevel2()`, `buildLevel3()` that define:

- **Tile positions**: X, Y coordinates on the board
- **Layer assignments**: Z-index for stacking
- **Icon distribution**: Which icons appear and how many
- **Difficulty curve**: Increasing complexity across levels

Each level uses a unique layout pattern, with higher levels featuring:
- More tiles
- Deeper layering
- More complex blocking relationships
- Larger variety of icons

## Development

### Making Changes

Since this is a pure JavaScript project with no build step:

1. Edit files directly (`game.js`, `style.css`, etc.)
2. Refresh your browser to see changes
3. Use browser developer tools for debugging

### Adding New Levels

1. Create a new `buildLevelN()` function in `game.js`
2. Add the level case to `initGame()`:
   ```javascript
   else if (currentLevel === N) {
       buildLevelN();
   }
   ```
3. Use the solver to verify the level is winnable
4. Test thoroughly with different strategies

### Customization

- **Icons**: Modify the `ALL_ICONS` array in `game.js`
- **Tray Size**: Change `TRAY_SIZE` constant (currently 7)
- **Tile Size**: Adjust `TILE_SIZE` and related constants
- **Styling**: Edit `style.css` for visual customization

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Add new levels
- Improve the solver algorithm

## Future Enhancements

Potential improvements and features:

- [ ] More levels and difficulty variations
- [ ] Additional tool types (swap, peek, etc.)
- [ ] Animations and sound effects
- [ ] Hint system using solver
- [ ] Scoreboard

---

**Enjoy playing Overstack!** 


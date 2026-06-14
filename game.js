// game.js
import {
    PIECE_SYMBOLS,
    isValidMove,
    getValidMovesForPiece,
    generateSolvableChallengePair
} from './chess-utils.js';

console.log("game.js cargado como módulo ES6.");

// --- Estado Global ---
let currentBoardState; // Estado actual del tablero de juego principal
let initialMainBoardState; // Estado inicial del desafío actual para el tablero principal
let currentChallengeTargetState; // Estado del tablero objetivo del desafío actual
let draggedPiece = null;
let draggedPieceStartPos = -1;
let moveCount = 0; // Contador de movimientos del jugador
let selectedPieceIndex = -1; // Para la pieza seleccionada por clic
let optimalMoveCount = 0; // Número óptimo de movimientos según BFS
let moveHistory = []; // Pila de estados anteriores para Undo

// --- Funciones de Renderizado y Drag and Drop ---

/**
 * Renderiza un tablero de ajedrez en un elemento HTML.
 * @param {Array<string|null>} boardState El estado del tablero (array de 9 elementos).
 * @param {string} targetElementId El ID del div donde se renderizará el tablero.
 * @param {boolean} isDraggable Indica si las piezas deben ser arrastrables y las celdas dropeables.
 */
function renderBoard(boardState, targetElementId, isDraggable) {
    const boardElement = document.getElementById(targetElementId);
    if (!boardElement) {
        console.error(`Elemento con ID '${targetElementId}' no encontrado.`);
        return;
    }
    boardElement.innerHTML = ''; // Limpiar contenido existente

    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const isDarkCell = (row + col) % 2 !== 0;
        const cellClass = isDarkCell ? 'dark-cell' : 'light-cell';
        const cellDiv = document.createElement('div');
        cellDiv.className = `cell ${cellClass}`;
        cellDiv.dataset.index = i; // Almacenar el índice en el dataset de la celda

        const pieceChar = boardState[i];
        if (pieceChar !== null) {
            let pieceColorStyle = 'color: var(--text-color);';
            if (!isDarkCell) {
                pieceColorStyle += ' text-shadow: 1px 1px 2px var(--card-bg), -1px -1px 2px var(--card-bg), 1px -1px 2px var(--card-bg), -1px 1px 2px var(--card-bg);';
            }
            const pieceSpan = document.createElement('span');
            pieceSpan.className = 'piece-symbol';
            pieceSpan.style = pieceColorStyle;
            pieceSpan.textContent = PIECE_SYMBOLS[pieceChar];
            pieceSpan.dataset.piece = pieceChar; // Almacenar el tipo de pieza
            pieceSpan.dataset.index = i; // Almacenar el índice de la pieza para manejo de clics

            if (isDraggable) {
                pieceSpan.draggable = true;
                pieceSpan.addEventListener('dragstart', handleDragStart);
            }
            cellDiv.appendChild(pieceSpan);
        }

        // Event listeners para Drag and Drop
        if (isDraggable) {
            cellDiv.addEventListener('dragover', handleDragOver);
            cellDiv.addEventListener('dragleave', handleDragLeave);
            cellDiv.addEventListener('drop', handleDrop);
        }

        boardElement.appendChild(cellDiv);
        // Event listener para clic en la celda o pieza
        cellDiv.addEventListener('click', handleCellClick);
    }
}

/**
 * Manejador para el inicio del arrastre de una pieza.
 * @param {DragEvent} e
 */
function handleDragStart(e) {
    draggedPiece = e.target.dataset.piece;
    clearHighlights(); // Limpiar cualquier resaltado al iniciar un arrastre
    selectedPieceIndex = -1; // Deseleccionar cualquier pieza
    draggedPieceStartPos = parseInt(e.target.closest('.cell').dataset.index);
    e.dataTransfer.setData('text/plain', draggedPiece); // Necesario para Firefox
    e.target.classList.add('dragging'); // Estilo visual para la pieza arrastrada
}

/**
 * Manejador para cuando una pieza se arrastra sobre una celda.
 * @param {DragEvent} e
 */
function handleDragOver(e) {
    e.preventDefault(); // Permite que se pueda soltar en esta celda
    const targetCell = e.currentTarget;
    const targetIndex = parseInt(targetCell.dataset.index);

    // Resaltar la celda si el movimiento es potencialmente válido
    if (draggedPiece && isValidMove(draggedPiece, draggedPieceStartPos, targetIndex, currentBoardState)) {
        targetCell.classList.add('drag-over-valid');
    } else {
        targetCell.classList.add('drag-over-invalid');
    }
}

/**
 * Manejador para cuando una pieza sale de una celda.
 * @param {DragEvent} e
 */
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over-valid', 'drag-over-invalid');
}

/**
 * Manejador para cuando una pieza se suelta en una celda.
 * @param {DragEvent} e
 */
function handleDrop(e) {
    e.preventDefault();
    const targetCell = e.currentTarget;
    targetCell.classList.remove('drag-over-valid', 'drag-over-invalid');

    const endPos = parseInt(targetCell.dataset.index);

    if (draggedPiece && draggedPieceStartPos !== -1) {
        // Validar el movimiento
        if (isValidMove(draggedPiece, draggedPieceStartPos, endPos, currentBoardState)) {
            // Guardar historial para Undo antes de modificar el estado
            moveHistory.push([...currentBoardState]);
            updateUndoButtonState();

            // Mover la pieza en el estado del tablero
            const newBoardState = [...currentBoardState];
            newBoardState[endPos] = draggedPiece;
            newBoardState[draggedPieceStartPos] = null;
            currentBoardState = newBoardState; // Actualizar el estado global

            renderBoard(currentBoardState, 'main-game-board', true); // Re-renderizar tablero principal
            clearHighlights(); // Limpiar resaltados después de un movimiento
            selectedPieceIndex = -1; // Deseleccionar la pieza
            moveCount++; // Incrementar contador de movimientos
            console.log(`Movimiento válido: ${draggedPiece} de ${draggedPieceStartPos} a ${endPos}`);
            
            checkChallengeCompletion();
        } else {
            console.log(`Movimiento inválido: ${draggedPiece} de ${draggedPieceStartPos} a ${endPos}`);
            renderBoard(currentBoardState, 'main-game-board', true);
        }
    }

    // Limpiar el estado de arrastre
    draggedPiece = null;
    draggedPieceStartPos = -1;
    document.querySelector('.dragging')?.classList.remove('dragging');
    updateMoveCounterDisplay(); // Actualizar el display del contador
}

/**
 * Actualiza el elemento HTML que muestra el contador de movimientos y el óptimo.
 */
function updateMoveCounterDisplay() {
    const counterElement = document.getElementById('move-counter');
    if (counterElement) {
        counterElement.textContent = `Movimientos: ${moveCount} / Óptimo: ${optimalMoveCount}`;
    }
}

/**
 * Limpia todos los resaltados de celdas.
 */
function clearHighlights() {
    document.querySelectorAll('.cell.highlight-move').forEach(cell => {
        cell.classList.remove('highlight-move');
    });
    document.querySelectorAll('.cell.selected-piece-cell').forEach(cell => {
        cell.classList.remove('selected-piece-cell');
    });
}

/**
 * Resalta todos los movimientos posibles para una pieza dada.
 * @param {string} pieceType El tipo de pieza.
 * @param {number} startIdx El índice de la celda de inicio.
 * @param {Array<string|null>} boardState El estado actual del tablero.
 */
function highlightPossibleMoves(pieceType, startIdx, boardState) {
    clearHighlights(); // Limpiar resaltados existentes

    // Resaltar la celda de la pieza seleccionada
    const startCell = document.querySelector(`.cell[data-index="${startIdx}"]`);
    if (startCell) {
        startCell.classList.add('selected-piece-cell');
    }

    // Usar la función getValidMovesForPiece para obtener los destinos de forma eficiente sin bucles manuales redundantes
    const validMoves = getValidMovesForPiece(pieceType, startIdx, boardState);
    for (let endIdx of validMoves) {
        const targetCell = document.querySelector(`.cell[data-index="${endIdx}"]`);
        if (targetCell) {
            targetCell.classList.add('highlight-move');
        }
    }
}

/**
 * Manejador para el clic en una celda (mecanismo Click-to-Move).
 * @param {MouseEvent} e
 */
function handleCellClick(e) {
    const clickedCellIndex = parseInt(e.currentTarget.dataset.index);
    const clickedPieceElement = e.target.closest('.piece-symbol');

    if (clickedPieceElement && clickedPieceElement.dataset.piece) {
        // Se hizo clic en una pieza
        const clickedPieceType = clickedPieceElement.dataset.piece;
        const clickedPieceIndex = parseInt(clickedPieceElement.dataset.index);

        if (selectedPieceIndex === clickedPieceIndex) {
            // Deseleccionar si es la misma pieza
            clearHighlights();
            selectedPieceIndex = -1;
        } else {
            // Seleccionar y resaltar movimientos
            selectedPieceIndex = clickedPieceIndex;
            highlightPossibleMoves(clickedPieceType, clickedPieceIndex, currentBoardState);
        }
    } else if (selectedPieceIndex !== -1) {
        // Mover a una celda vacía/otra celda si el movimiento es válido
        const pieceType = currentBoardState[selectedPieceIndex];
        if (isValidMove(pieceType, selectedPieceIndex, clickedCellIndex, currentBoardState)) {
            // Guardar historial para Undo
            moveHistory.push([...currentBoardState]);
            updateUndoButtonState();

            // Realizar movimiento
            const newBoardState = [...currentBoardState];
            newBoardState[clickedCellIndex] = pieceType;
            newBoardState[selectedPieceIndex] = null;
            currentBoardState = newBoardState;

            renderBoard(currentBoardState, 'main-game-board', true);
            console.log(`Movimiento por clic válido: ${pieceType} de ${selectedPieceIndex} a ${clickedCellIndex}`);
            selectedPieceIndex = -1;
            moveCount++;
            clearHighlights();
            checkChallengeCompletion();
        } else {
            console.log(`Movimiento por clic inválido: ${pieceType} de ${selectedPieceIndex} a ${clickedCellIndex}`);
            clearHighlights();
            selectedPieceIndex = -1;
        }
    } else {
        clearHighlights();
        selectedPieceIndex = -1;
    }
    updateMoveCounterDisplay(); // Actualizar el display del contador
}

/**
 * Compara el estado actual del tablero principal con el estado del desafío objetivo.
 * @returns {boolean} True si coinciden, false en caso contrario.
 */
function checkChallengeCompletion() {
    const currentBoardStr = JSON.stringify(currentBoardState);
    const challengeBoardStr = JSON.stringify(currentChallengeTargetState);

    if (currentBoardStr === challengeBoardStr) {
        showCompletionPopup();
        return true;
    }
    return false;
}

/**
 * Carga un nuevo desafío resoluble y reinicia contadores e historial.
 */
function loadNextChallenge() {
    console.log("Cargando siguiente desafío...");

    const challengePair = generateSolvableChallengePair();

    initialMainBoardState = challengePair.initial;
    currentBoardState = [...initialMainBoardState];
    renderBoard(currentBoardState, 'main-game-board', true);

    currentChallengeTargetState = challengePair.target;
    renderBoard(currentChallengeTargetState, 'challenge-board', false);

    optimalMoveCount = challengePair.optimal; // B-02: Guardar movimientos óptimos
    moveHistory = []; // Limpiar historial
    updateUndoButtonState();

    // Resetear contador de movimientos y displays
    moveCount = 0;
    updateMoveCounterDisplay();
    clearHighlights();
    selectedPieceIndex = -1;
    hideCompletionPopup();
}

/**
 * Reinicia el desafío actual devolviendo el tablero a su estado inicial.
 */
function resetChallenge() {
    currentBoardState = [...initialMainBoardState];
    moveCount = 0;
    selectedPieceIndex = -1;
    moveHistory = [];
    clearHighlights();
    renderBoard(currentBoardState, 'main-game-board', true);
    updateMoveCounterDisplay();
    updateUndoButtonState();
}

/**
 * Deshace el último movimiento restaurando el tablero al estado anterior.
 */
function undoLastMove() {
    if (moveHistory.length > 0) {
        currentBoardState = moveHistory.pop();
        moveCount--;
        selectedPieceIndex = -1;
        clearHighlights();
        renderBoard(currentBoardState, 'main-game-board', true);
        updateMoveCounterDisplay();
        updateUndoButtonState();
    }
}

/**
 * Habilita o deshabilita visualmente el botón de Undo.
 */
function updateUndoButtonState() {
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.disabled = moveHistory.length === 0;
    }
}

/**
 * Configura la sección de instrucciones del juego y su ocultamiento con localStorage.
 */
function setupInstructions() {
    const hasVisited = localStorage.getItem('minichess_visited');
    const instructionBox = document.getElementById('instruction-box');
    const toggleBtn = document.getElementById('toggle-instructions-btn');

    if (instructionBox) {
        if (hasVisited === 'true') {
            instructionBox.classList.add('collapsed');
        } else {
            localStorage.setItem('minichess_visited', 'true');
        }
    }

    if (toggleBtn && instructionBox) {
        toggleBtn.addEventListener('click', () => {
            instructionBox.classList.toggle('collapsed');
        });
    }
}

/**
 * Muestra el popup de desafío completado con calificación en estrellas.
 */
function showCompletionPopup() {
    const popup = document.getElementById('completion-popup');
    const message = document.getElementById('completion-message');
    const starsContainer = document.getElementById('completion-stars');
    const optimalInfo = document.getElementById('optimal-info');

    const delta = moveCount - optimalMoveCount;
    let stars = '';
    let feedbackText = '';

    if (delta === 0) {
        stars = '⭐⭐⭐';
        feedbackText = '¡Perfecto! Solución óptima.';
    } else if (delta <= 2) {
        stars = '⭐⭐';
        feedbackText = '¡Muy bien!';
    } else {
        stars = '⭐';
        feedbackText = '¡Completado!';
    }

    if (starsContainer) {
        starsContainer.textContent = stars;
    }
    if (message) {
        message.textContent = feedbackText;
    }
    if (optimalInfo) {
        optimalInfo.textContent = `Completado en ${moveCount} movimientos (óptimo de BFS: ${optimalMoveCount}).`;
    }

    if (popup) {
        popup.classList.add('visible'); // Activar transición CSS
    }
}

/**
 * Oculta el popup de desafío completado.
 */
function hideCompletionPopup() {
    const popup = document.getElementById('completion-popup');
    if (popup) {
        popup.classList.remove('visible'); // Desactivar transición CSS
    }
}

// --- Inicialización del Juego ---

document.addEventListener('DOMContentLoaded', () => {
    const challengePair = generateSolvableChallengePair();

    initialMainBoardState = challengePair.initial;
    currentBoardState = [...initialMainBoardState];
    renderBoard(currentBoardState, 'main-game-board', true);

    optimalMoveCount = challengePair.optimal;
    moveHistory = [];
    updateUndoButtonState();
    updateMoveCounterDisplay();

    // Renderizar la tarjeta de desafío (piezas no arrastrables)
    currentChallengeTargetState = challengePair.target;
    const challengeDisplay = document.getElementById('challenge-display');
    if (challengeDisplay) {
        challengeDisplay.innerHTML = `
            <div class="challenge-card">
                <h2>Desafío Objetivo</h2>
                <div id="challenge-board" class="grid-3x3"></div>
            </div>
        `;
    }
    renderBoard(currentChallengeTargetState, 'challenge-board', false);

    // Configurar el botón "Siguiente" del popup
    const nextChallengeButton = document.getElementById('next-challenge-btn');
    if (nextChallengeButton) {
        nextChallengeButton.addEventListener('click', loadNextChallenge);
    }

    // Configurar el botón "Reiniciar"
    const resetBtn = document.getElementById('reset-challenge-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetChallenge);
    }

    // Configurar el botón "Deshacer"
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', undoLastMove);
    }

    // Cargar lógica de instrucciones
    setupInstructions();
});
// game.js

console.log("game.js cargado.");

// --- Constantes y Estado Global ---

const PIECE_SYMBOLS = {
    'K': '♔', // Rey
    'Q': '♕', // Dama
    'R': '♖', // Torre
    'B': '♗', // Alfil
    'N': '♘'  // Caballo
};

const PIECES_TO_USE = ['K', 'Q', 'R', 'B', 'N'];
 
let currentBoardState; // Estado actual del tablero de juego principal
let initialMainBoardState; // Estado inicial del desafío actual para el tablero principal
let currentChallengeTargetState; // Estado del tablero objetivo del desafío actual
let draggedPiece = null;
let draggedPieceStartPos = -1;
let moveCount = 0; // Nuevo: Contador de movimientos
let selectedPieceIndex = -1; // Nuevo: para la pieza seleccionada por clic

// --- Funciones de Utilidad para el Tablero ---

/**
 * Convierte un índice 1D (0-8) a coordenadas 2D {row, col}.
 * @param {number} index
 * @returns {{row: number, col: number}}
 */
function indexToCoords(index) {
    return { row: Math.floor(index / 3), col: index % 3 };
}

/**
 * Convierte coordenadas 2D {row, col} a un índice 1D (0-8).
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
function coordsToIndex(row, col) {
    return row * 3 + col;
}

/**
 * Verifica si las coordenadas están dentro de los límites del tablero 3x3.
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isWithinBounds(row, col) {
    return row >= 0 && row < 3 && col >= 0 && col < 3;
}

/**
 * Verifica si una celda es oscura basándose en su índice 1D.
 * @param {number} index
 * @returns {boolean}
 */
function isDarkCellByIndex(index) {
    const { row, col } = indexToCoords(index);
    return (row + col) % 2 !== 0;
}
// --- Lógica de Validación de Movimientos de Ajedrez ---

/**
 * Verifica si el camino entre dos celdas está libre de piezas.
 * Solo para movimientos rectos o diagonales.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isPathClear(startIdx, endIdx, board) {
    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const dR = Math.sign(endR - startR);
    const dC = Math.sign(endC - startC);

    let currentR = startR + dR;
    let currentC = startC + dC;

    while (currentR !== endR || currentC !== endC) {
        if (board[coordsToIndex(currentR, currentC)] !== null) {
            return false; // Obstáculo encontrado
        }
        currentR += dR;
        currentC += dC;
    }
    return true; // Camino libre
}

/**
 * Valida el movimiento del Rey.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isValidKingMove(startIdx, endIdx, board) {
    if (board[endIdx] !== null) return false; // No se puede mover a una casilla ocupada

    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const dR = Math.abs(endR - startR);
    const dC = Math.abs(endC - startC);

    return dR <= 1 && dC <= 1 && (dR + dC > 0); // Se mueve una casilla en cualquier dirección
}

/**
 * Valida el movimiento de la Dama.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isValidQueenMove(startIdx, endIdx, board) {
    if (board[endIdx] !== null) return false;

    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const dR = Math.abs(endR - startR);
    const dC = Math.abs(endC - startC);

    const isStraight = (dR === 0 && dC > 0) || (dC === 0 && dR > 0);
    const isDiagonal = dR === dC && dR > 0;

    if (isStraight || isDiagonal) {
        return isPathClear(startIdx, endIdx, board);
    }
    return false;
}

/**
 * Valida el movimiento de la Torre.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isValidRookMove(startIdx, endIdx, board) {
    if (board[endIdx] !== null) return false;

    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const isStraight = (startR === endR && startC !== endC) || (startC === endC && startR !== endR);

    if (isStraight) {
        return isPathClear(startIdx, endIdx, board);
    }
    return false;
}

/**
 * Valida el movimiento del Alfil.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isValidBishopMove(startIdx, endIdx, board) {
    if (board[endIdx] !== null) return false;

    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const dR = Math.abs(endR - startR);
    const dC = Math.abs(endC - startC);

    const isDiagonal = dR === dC && dR > 0;

    // Restricción del Alfil: debe empezar y terminar en una casilla clara (no oscura).
    if (isDarkCellByIndex(startIdx) || isDarkCellByIndex(endIdx)) {
        return false; // Si la casilla de inicio o la de fin es oscura, el movimiento es inválido para el Alfil.
    }

    if (isDiagonal) {
        return isPathClear(startIdx, endIdx, board);
    }
    return false;
}

/**
 * Valida el movimiento del Caballo.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isValidKnightMove(startIdx, endIdx, board) {
    if (board[endIdx] !== null) return false;

    // Restricción especial: el Caballo no puede aterrizar en la casilla central (índice 4)
    if (endIdx === 4) return false;

    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const dR = Math.abs(endR - startR);
    const dC = Math.abs(endC - startC);

    // Movimiento en "L": (1,2) o (2,1) en cualquier dirección
    const isLMove = (dR === 1 && dC === 2) || (dR === 2 && dC === 1);

    return isLMove;
}

/**
 * Función principal para validar cualquier movimiento de pieza.
 * @param {string} pieceType
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
function isValidMove(pieceType, startIdx, endIdx, board) {
    if (startIdx === endIdx) return false; // No se puede mover a la misma casilla

    switch (pieceType) {
        case 'K': return isValidKingMove(startIdx, endIdx, board);
        case 'Q': return isValidQueenMove(startIdx, endIdx, board);
        case 'R': return isValidRookMove(startIdx, endIdx, board);
        case 'B': return isValidBishopMove(startIdx, endIdx, board);
        case 'N': return isValidKnightMove(startIdx, endIdx, board);
        default: return false;
    }
}

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
        const { row, col } = indexToCoords(i);
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
        // Event listener para clic en la pieza (si existe) o en la celda
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
    e.target.classList.add('dragging'); // Opcional: estilo visual para la pieza arrastrada
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
            // Mover la pieza en el estado del tablero
            const newBoardState = [...currentBoardState]; // Crear una copia para inmutabilidad
            newBoardState[endPos] = draggedPiece;
            newBoardState[draggedPieceStartPos] = null;
            currentBoardState = newBoardState; // Actualizar el estado global

            renderBoard(currentBoardState, 'main-game-board', true); // Volver a renderizar el tablero principal
            clearHighlights(); // Limpiar resaltados después de un movimiento
            selectedPieceIndex = -1; // Deseleccionar la pieza
            moveCount++; // Incrementar contador de movimientos
            console.log(`Movimiento válido: ${draggedPiece} de ${draggedPieceStartPos} a ${endPos}`);
            // Aquí podrías añadir lógica para comprobar si se ha resuelto el desafío
            checkChallengeCompletion();
        } else {
            console.log(`Movimiento inválido: ${draggedPiece} de ${draggedPieceStartPos} a ${endPos}`);
            // Si el movimiento es inválido, la pieza "vuelve" a su lugar original al re-renderizar
            renderBoard(currentBoardState, 'main-game-board', true);
        }
    }

    // Limpiar el estado de arrastre
    draggedPiece = null;
    draggedPieceStartPos = -1;
    // Asegurarse de que la clase 'dragging' se elimine si la pieza no se soltó correctamente
    document.querySelector('.dragging')?.classList.remove('dragging');
    updateMoveCounterDisplay(); // Actualizar el display del contador
}

/**
 * Actualiza el elemento HTML que muestra el contador de movimientos.
 */
function updateMoveCounterDisplay() {
    const counterElement = document.getElementById('move-counter');
    if (counterElement) {
        counterElement.textContent = `Movimientos: ${moveCount}`;
    }
}

/**
 * Limpia todos los resaltados de celdas (movimientos posibles y pieza seleccionada).
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
 * @param {string} pieceType El tipo de pieza ('K', 'Q', etc.).
 * @param {number} startIdx El índice de la celda de inicio de la pieza.
 * @param {Array<string|null>} boardState El estado actual del tablero.
 */
function highlightPossibleMoves(pieceType, startIdx, boardState) {
    clearHighlights(); // Limpiar resaltados existentes

    // Resaltar la celda de la pieza seleccionada
    const startCell = document.querySelector(`.cell[data-index="${startIdx}"]`);
    if (startCell) {
        startCell.classList.add('selected-piece-cell');
    }

    // Resaltar celdas de movimientos válidos
    for (let endIdx = 0; endIdx < 9; endIdx++) {
        if (isValidMove(pieceType, startIdx, endIdx, boardState)) {
            const targetCell = document.querySelector(`.cell[data-index="${endIdx}"]`);
            if (targetCell) {
                targetCell.classList.add('highlight-move');
            }
        }
    }
}

/**
 * Manejador para el clic en una celda.
 * Si hay una pieza seleccionada, intenta moverla a esta celda.
 * Si no, o si el movimiento es inválido, limpia los resaltados.
 * @param {MouseEvent} e
 */
function handleCellClick(e) {
    const clickedCellIndex = parseInt(e.currentTarget.dataset.index);
    const clickedPieceElement = e.target.closest('.piece-symbol'); // Verifica si se hizo clic directamente en una pieza

    if (clickedPieceElement && clickedPieceElement.dataset.piece) {
        // Se hizo clic en una pieza
        const clickedPieceType = clickedPieceElement.dataset.piece;
        const clickedPieceIndex = parseInt(clickedPieceElement.dataset.index);

        if (selectedPieceIndex === clickedPieceIndex) {
            // Si se hace clic en la misma pieza seleccionada, deseleccionarla
            clearHighlights();
            selectedPieceIndex = -1;
        } else {
            // Seleccionar una nueva pieza y resaltar sus movimientos
            selectedPieceIndex = clickedPieceIndex;
            highlightPossibleMoves(clickedPieceType, clickedPieceIndex, currentBoardState);
        }
    } else if (selectedPieceIndex !== -1) {
        // Hay una pieza seleccionada y se hizo clic en una celda vacía o con otra pieza (para mover)
        const pieceType = currentBoardState[selectedPieceIndex];
        if (isValidMove(pieceType, selectedPieceIndex, clickedCellIndex, currentBoardState)) {
            // Realizar el movimiento
            const newBoardState = [...currentBoardState];
            newBoardState[clickedCellIndex] = pieceType;
            newBoardState[selectedPieceIndex] = null;
            currentBoardState = newBoardState;

            renderBoard(currentBoardState, 'main-game-board', true);
            console.log(`Movimiento por clic válido: ${pieceType} de ${selectedPieceIndex} a ${clickedCellIndex}`);
            selectedPieceIndex = -1; // Deseleccionar después del movimiento
            moveCount++; // Incrementar contador de movimientos
            clearHighlights();
            checkChallengeCompletion();
        } else {
            // Movimiento inválido, deseleccionar y limpiar
            console.log(`Movimiento por clic inválido: ${pieceType} de ${selectedPieceIndex} a ${clickedCellIndex}`);
            clearHighlights();
            selectedPieceIndex = -1;
        }
    } else {
        // No hay pieza seleccionada y se hizo clic en una celda vacía, solo limpiar
        clearHighlights();
        selectedPieceIndex = -1; // Asegurarse de que no haya pieza seleccionada
    }
    updateMoveCounterDisplay(); // Actualizar el display del contador
}

/**
 * Genera un estado de tablero aleatorio para un desafío.
 * @returns {Array<string|null>} Un array de 9 elementos que representa el estado del tablero.
 */
function generateRandomChallengeBoardState() {
    // Esta función ya no se usará directamente para generar un desafío completo.
    // Se reemplaza por generateBoardStateFromPieces y generateSolvableChallengePair.
    // Mantengo el nombre por si hay alguna referencia externa, pero su lógica se mueve.
    // Si se llama, generará un estado aleatorio con 5 piezas.
    return generateBoardStateFromPieces([...PIECES_TO_USE]);
}

/**
 * Genera un estado de tablero aleatorio con un conjunto específico de piezas,
 * asegurando que el Alfil se coloque en una celda clara.
 * @param {Array<string>} piecesToPlace Los tipos de piezas a colocar (ej. ['K', 'Q', 'R', 'B', 'N']).
 * @returns {Array<string|null>} Un array de 9 elementos que representa el estado del tablero.
 */
function generateBoardStateFromPieces(piecesToPlace) {
    const boardState = Array(9).fill(null);
    let currentPiecesToPlace = [...piecesToPlace]; // Hacer una copia para modificar

    const lightCellIndices = [0, 2, 4, 6, 8]; // Índices de celdas claras
    const darkCellIndices = [1, 3, 5, 7];    // Índices de celdas oscuras
    let availableCellIndices = [...lightCellIndices, ...darkCellIndices];

    // Manejar la colocación del Alfil primero para asegurar que esté en una celda clara si está presente
    const bishopIndexInPieces = currentPiecesToPlace.indexOf('B');
    if (bishopIndexInPieces !== -1) {
        currentPiecesToPlace.splice(bishopIndexInPieces, 1); // Quitar el Alfil de las piezas a colocar

        // Elegir una celda clara aleatoria para el Alfil
        const randomLightCellIdx = Math.floor(Math.random() * lightCellIndices.length);
        const bishopPosition = lightCellIndices[randomLightCellIdx];
        boardState[bishopPosition] = 'B';

        // Eliminar la celda elegida de las celdas disponibles para las otras piezas
        availableCellIndices = availableCellIndices.filter(idx => idx !== bishopPosition);
    }

    // Colocar las piezas restantes en las celdas disponibles
    const shuffledAvailableCells = availableCellIndices.sort(() => Math.random() - 0.5);
    const piecePositions = shuffledAvailableCells.slice(0, currentPiecesToPlace.length);

    const shuffledRemainingPieces = currentPiecesToPlace.sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledRemainingPieces.length; i++) {
        boardState[piecePositions[i]] = shuffledRemainingPieces[i];
    }
    return boardState;
}

/**
 * Genera un par de estados de tablero (inicial y objetivo) para un desafío,
 * asegurando que ambos contengan el mismo conjunto de piezas y sean diferentes.
 * @returns {{initial: Array<string|null>, target: Array<string|null>}} Un objeto con el estado inicial y el estado objetivo.
 */
function generateSolvableChallengePair() {
    const piecesForChallenge = [...PIECES_TO_USE].sort(() => Math.random() - 0.5); // Asegura el mismo conjunto de 5 piezas

    let initialBoard;
    let targetBoard;

    // Generar el tablero inicial
    initialBoard = generateBoardStateFromPieces(piecesForChallenge);

    // Generar el tablero objetivo, asegurando que sea diferente del inicial
    do {
        targetBoard = generateBoardStateFromPieces(piecesForChallenge);
    } while (JSON.stringify(initialBoard) === JSON.stringify(targetBoard)); // Asegurar que el objetivo no sea idéntico al inicial

    return { initial: initialBoard, target: targetBoard };
}

/**
 * Compara el estado actual del tablero principal con el estado del desafío objetivo.
 * @returns {boolean} True si los tableros son idénticos, false en caso contrario.
 */
function checkChallengeCompletion() {
    // Convertir arrays a strings para una comparación sencilla
    const currentBoardStr = JSON.stringify(currentBoardState);
    const challengeBoardStr = JSON.stringify(currentChallengeTargetState); // Comparar con el estado objetivo actual

    if (currentBoardStr === challengeBoardStr) {
        showCompletionPopup(); // Mostrar el popup personalizado
        return true;
    }
    return false;
}

/**
 * Carga un nuevo desafío, reseteando el tablero principal y el contador de movimientos.
 */
function loadNextChallenge() {
    console.log("Cargando siguiente desafío...");

    const challengePair = generateSolvableChallengePair(); // Generar un par de estados inicial y objetivo

    initialMainBoardState = challengePair.initial; // El estado inicial del desafío
    currentBoardState = [...initialMainBoardState];
    renderBoard(currentBoardState, 'main-game-board', true);

    currentChallengeTargetState = challengePair.target; // El estado objetivo del desafío
    renderBoard(currentChallengeTargetState, 'challenge-board', false);

    // Resetear contador de movimientos y display
    moveCount = 0;
    updateMoveCounterDisplay();
    clearHighlights();
    selectedPieceIndex = -1;
    hideCompletionPopup(); // Asegurarse de que el popup esté oculto al cargar un nuevo desafío
}

// --- Inicialización del Juego ---

document.addEventListener('DOMContentLoaded', () => {
    const challengePair = generateSolvableChallengePair(); // Generar el primer par de estados

    initialMainBoardState = challengePair.initial; // El estado inicial del desafío
    currentBoardState = [...initialMainBoardState]; // Copiar para el tablero principal
    renderBoard(currentBoardState, 'main-game-board', true);

    updateMoveCounterDisplay(); // Inicializar el display del contador de movimientos

    // Renderizar la tarjeta de desafío (piezas no arrastrables)
    currentChallengeTargetState = challengePair.target; // El estado objetivo del desafío
    const challengeDisplay = document.getElementById('challenge-display');
    challengeDisplay.innerHTML = `
        <div class="challenge-card">
            <h2>Desafío Objetivo</h2>
            <div id="challenge-board" class="grid-3x3"></div>
        </div>
    `;
    renderBoard(currentChallengeTargetState, 'challenge-board', false);

    // Configurar el botón "Siguiente" del popup
    const nextChallengeButton = document.getElementById('next-challenge-btn');
    if (nextChallengeButton) {
        nextChallengeButton.addEventListener('click', loadNextChallenge);
    }
});

/**
 * Muestra el popup de desafío completado con el mensaje de movimientos.
 */
function showCompletionPopup() {
    const popup = document.getElementById('completion-popup');
    const message = document.getElementById('completion-message');
    message.textContent = `Desafío completado en ${moveCount} movimientos.`;
    popup.classList.remove('hidden');
}

/**
 * Oculta el popup de desafío completado.
 */
function hideCompletionPopup() {
    document.getElementById('completion-popup').classList.add('hidden');
}

/**
 * Inteligencia Artificial: Solver BFS (Búsqueda en Anchura)
 * Encuentra la cantidad mínima de movimientos para resolver el desafío.
 * @param {Array<string|null>} startState
 * @param {Array<string|null>} targetState
 * @returns {number} El número de movimientos óptimos, o -1 si no hay solución.
 */
function solveBFS(startState, targetState) {
    const targetStr = JSON.stringify(targetState);
    let queue = [{ state: startState, moves: 0 }];
    let visited = new Set();
    visited.add(JSON.stringify(startState));

    while (queue.length > 0) {
        let { state, moves } = queue.shift();

        if (JSON.stringify(state) === targetStr) {
            return moves; // Se encontró la solución óptima
        }

        // Generar todos los movimientos legales desde el estado actual
        for (let startIdx = 0; startIdx < 9; startIdx++) {
            const piece = state[startIdx];
            if (piece !== null) {
                for (let endIdx = 0; endIdx < 9; endIdx++) {
                    if (isValidMove(piece, startIdx, endIdx, state)) {
                        let newState = [...state];
                        newState[endIdx] = piece;
                        newState[startIdx] = null;
                        let newStateStr = JSON.stringify(newState);

                        if (!visited.has(newStateStr)) {
                            visited.add(newStateStr);
                            queue.push({ state: newState, moves: moves + 1 });
                        }
                    }
                }
            }
        }
    }
    return -1; // No se encontró solución
}
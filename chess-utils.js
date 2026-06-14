// chess-utils.js

export const PIECE_SYMBOLS = {
    'K': '♚', // Rey
    'Q': '♛', // Dama
    'R': '♜', // Torre
    'B': '♝', // Alfil
    'N': '♞'  // Caballo
};

export const PIECES_TO_USE = ['K', 'Q', 'R', 'B', 'N'];

/**
 * Convierte un índice 1D (0-8) a coordenadas 2D {row, col}.
 * @param {number} index
 * @returns {{row: number, col: number}}
 */
export function indexToCoords(index) {
    return { row: Math.floor(index / 3), col: index % 3 };
}

/**
 * Convierte coordenadas 2D {row, col} a un índice 1D (0-8).
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
export function coordsToIndex(row, col) {
    return row * 3 + col;
}

/**
 * Verifica si las coordenadas están dentro de los límites del tablero 3x3.
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
export function isWithinBounds(row, col) {
    return row >= 0 && row < 3 && col >= 0 && col < 3;
}

/**
 * Verifica si una celda es oscura basándose en su índice 1D.
 * @param {number} index
 * @returns {boolean}
 */
export function isDarkCellByIndex(index) {
    const { row, col } = indexToCoords(index);
    return (row + col) % 2 !== 0;
}

/**
 * Verifica si el camino entre dos celdas está libre de piezas.
 * Solo para movimientos rectos o diagonales.
 * @param {number} startIdx
 * @param {number} endIdx
 * @param {Array<string|null>} board
 * @returns {boolean}
 */
export function isPathClear(startIdx, endIdx, board) {
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
export function isValidKingMove(startIdx, endIdx, board) {
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
export function isValidQueenMove(startIdx, endIdx, board) {
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
export function isValidRookMove(startIdx, endIdx, board) {
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
export function isValidBishopMove(startIdx, endIdx, board) {
    if (board[endIdx] !== null) return false;

    const { row: startR, col: startC } = indexToCoords(startIdx);
    const { row: endR, col: endC } = indexToCoords(endIdx);

    const dR = Math.abs(endR - startR);
    const dC = Math.abs(endC - startC);

    const isDiagonal = dR === dC && dR > 0;

    // B-01: El Alfil solo puede moverse entre casillas de índice par (claras).
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
export function isValidKnightMove(startIdx, endIdx, board) {
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
export function isValidMove(pieceType, startIdx, endIdx, board) {
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

/**
 * Devuelve todos los índices de casillas de destino válidos para una pieza en una posición dada.
 * @param {string} piece El tipo de pieza ('K', 'Q', 'R', 'B', 'N').
 * @param {number} idx El índice de la casilla actual de la pieza.
 * @param {Array<string|null>} board Estado actual del tablero.
 * @returns {Array<number>} Índices válidos de destino.
 */
export function getValidMovesForPiece(piece, idx, board) {
    const validMoves = [];
    for (let endIdx = 0; endIdx < 9; endIdx++) {
        if (isValidMove(piece, idx, endIdx, board)) {
            validMoves.push(endIdx);
        }
    }
    return validMoves;
}

/**
 * Genera un estado de tablero aleatorio con un conjunto específico de piezas,
 * asegurando que el Alfil se coloque en una celda clara, y que el Caballo
 * tenga al menos un movimiento legal de inicio.
 * @param {Array<string>} piecesToPlace Los tipos de piezas a colocar.
 * @returns {Array<string|null>} Un array de 9 elementos que representa el estado del tablero.
 */
export function generateBoardStateFromPieces(piecesToPlace) {
    let boardState;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        boardState = Array(9).fill(null);
        let currentPiecesToPlace = [...piecesToPlace];

        const lightCellIndices = [0, 2, 4, 6, 8]; // Índices de celdas claras
        const darkCellIndices = [1, 3, 5, 7];    // Índices de celdas oscuras
        let availableCellIndices = [...lightCellIndices, ...darkCellIndices];

        // Manejar la colocación del Alfil primero para asegurar que esté en una celda clara si está presente
        const bishopIndexInPieces = currentPiecesToPlace.indexOf('B');
        if (bishopIndexInPieces !== -1) {
            currentPiecesToPlace.splice(bishopIndexInPieces, 1);

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

        attempts++;
        // A-02: Verificar que el Caballo (N) tiene al menos 1 movimiento legal
        const knightPos = boardState.indexOf('N');
        if (knightPos === -1 || getValidMovesForPiece('N', knightPos, boardState).length > 0) {
            break;
        }
    } while (attempts < maxAttempts);

    return boardState;
}

/**
 * Genera un par de estados de tablero (inicial y objetivo) para un desafío,
 * asegurando que ambos contengan el mismo conjunto de piezas, sean diferentes
 * y tengan solución viable.
 * @returns {{initial: Array<string|null>, target: Array<string|null>, optimal: number}} El par de tableros y pasos óptimos.
 */
export function generateSolvableChallengePair() {
    const piecesForChallenge = [...PIECES_TO_USE].sort(() => Math.random() - 0.5);

    let initialBoard;
    let targetBoard;
    let steps = -1;

    // B-03: Generar tableros válidos y evaluar resolubilidad con el BFS solver
    do {
        initialBoard = generateBoardStateFromPieces(piecesForChallenge);
        targetBoard = generateBoardStateFromPieces(piecesForChallenge);

        if (JSON.stringify(initialBoard) !== JSON.stringify(targetBoard)) {
            steps = solveBFS(initialBoard, targetBoard);
        }
    } while (JSON.stringify(initialBoard) === JSON.stringify(targetBoard) || steps === -1);

    return { initial: initialBoard, target: targetBoard, optimal: steps };
}

/**
 * Inteligencia Artificial: Solver BFS (Búsqueda en Anchura)
 * Encuentra la cantidad mínima de movimientos para resolver el desafío.
 * @param {Array<string|null>} startState
 * @param {Array<string|null>} targetState
 * @returns {number} El número de movimientos óptimos, o -1 si no hay solución.
 */
export function solveBFS(startState, targetState) {
    const targetStr = JSON.stringify(targetState);
    let queue = [{ state: startState, moves: 0 }];
    let visited = new Set();
    visited.add(JSON.stringify(startState));

    while (queue.length > 0) {
        let { state, moves } = queue.shift();

        if (JSON.stringify(state) === targetStr) {
            return moves;
        }

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
    return -1;
}

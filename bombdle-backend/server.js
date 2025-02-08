const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const lobbies = {}; // Store lobbies with game state

app.use(cors({
    origin: 'http://127.0.0.1:5500', // Allow requests from the frontend
    methods: ['GET', 'POST'],
}));
app.use(express.json());

// API to create a lobby
app.post('/create-lobby', (req, res) => {
    const gameCode = generateGameCode(); // Generate a unique code
    lobbies[gameCode] = { players: [], gameState: {} }; // Store the lobby
    res.status(200).json({ gameCode }); // Respond with the game code
    console.log('New game code created:', gameCode);

});


// WebSocket connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a lobby
    socket.on('joinLobby', ({ gameCode, playerName }) => {
        if (!lobbies[gameCode]) {
            socket.emit('error', 'Lobby not found');
            return;
        }
        lobbies[gameCode].players.push({ id: socket.id, name: playerName, lives: 3 });
        socket.join(gameCode);
        io.to(gameCode).emit('playerJoined', lobbies[gameCode].players);
    });

    // Start game
    socket.on('startGame', (gameCode) => {
        if (!lobbies[gameCode]) return;
        const wordPairs = generateWordPairs();
        lobbies[gameCode].gameState = { currentPair: wordPairs.pop(), wordPairs, currentPlayer: 0 };
        io.to(gameCode).emit('gameStarted', lobbies[gameCode].gameState);
    });

    // Submit word
    socket.on('submitWord', ({ gameCode, word }) => {
        if (!lobbies[gameCode]) return;
        const gameState = lobbies[gameCode].gameState;
        if (word.includes(gameState.currentPair)) {
            io.to(gameCode).emit('validWord', { word });
        } else {
            io.to(gameCode).emit('invalidWord', { word });
        }
        gameState.currentPlayer = (gameState.currentPlayer + 1) % lobbies[gameCode].players.length;
        io.to(gameCode).emit('updateGameState', gameState);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Utility: Generate a random 6-character game code
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Utility: Generate word pairs
function generateWordPairs() {
    return [
        "sh", "oc", "so", "tr", "ex", "un", "al", "in", "th", "he", "an", "re", "er", "on", "at", "en",
        "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "ar", "st", "to", "nt", "ng", "se", "ha",
    ];
}

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

const lobbies = {};
let validWords = new Set();

fs.readFile('words.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Failed to load words:', err);
        return;
    }
    validWords = new Set(data.split('\n').map(word => word.trim().toLowerCase()));
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
}));

app.use(express.json());

// Serve words.txt file
app.get('/words.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'words.txt'));
});

app.post('/create-lobby', (req, res) => {
    const gameCode = generateGameCode();
    lobbies[gameCode] = { players: [], gameState: {} };
    res.status(200).json({ gameCode });
    console.log('New game code created:', gameCode);
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinLobby', ({ gameCode, playerName }) => {
        if (!lobbies[gameCode]) {
            socket.emit('error', 'Lobby not found');
            return;
        }

        const playerExists = lobbies[gameCode].players.some(player => player.id === socket.id);
        if (!playerExists) {
            lobbies[gameCode].players.push({ id: socket.id, name: playerName, lives: 3 });
        }

        socket.join(gameCode);
        io.to(gameCode).emit('playerJoined', lobbies[gameCode].players);
    });

    socket.on('startGame', (gameCode) => {
        if (!lobbies[gameCode]) {
            console.error('Game code not found:', gameCode);
            return;
        }

        if (!lobbies[gameCode].gameState.started) {
            initializeGameState(gameCode);
            io.to(gameCode).emit('gameStarted', lobbies[gameCode].gameState);
            console.log(`Game started for lobby ${gameCode}`);
            startTurnTimer(gameCode);
        }
    });

    socket.on('submitWord', ({ gameCode, word }) => {
        if (!lobbies[gameCode]) return;
        const gameState = lobbies[gameCode].gameState;
        const currentPlayer = gameState.players[gameState.currentPlayer];

        if (socket.id !== currentPlayer.id) {
            socket.emit('error', { message: "It's not your turn!" });
            return;
        }

        if (word.includes(gameState.currentPair) && validWords.has(word)) {
            io.to(gameCode).emit('validWord', { word });
            gameState.currentPair = gameState.wordPairs.pop();
            gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
            broadcastGameState(gameCode);
            startTurnTimer(gameCode);
        } else {
            currentPlayer.lives--;
            if (currentPlayer.lives <= 0) {
                gameState.players = gameState.players.filter(player => player.id !== currentPlayer.id);
            }
            io.to(gameCode).emit('invalidWord', { word });
            gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
            broadcastGameState(gameCode);
            startTurnTimer(gameCode);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        Object.keys(lobbies).forEach(gameCode => {
            lobbies[gameCode].players = lobbies[gameCode].players.filter(player => player.id !== socket.id);
            io.to(gameCode).emit('playerJoined', lobbies[gameCode].players);
        });
    });

    socket.on('leaveLobby', ({ gameCode, playerId }) => {
        if (!lobbies[gameCode]) return;
        lobbies[gameCode].players = lobbies[gameCode].players.filter(player => player.id !== playerId);
        io.to(gameCode).emit('playerJoined', lobbies[gameCode].players);
    });

    socket.on('checkHost', ({ gameCode }) => {
        if (!lobbies[gameCode]) return;
        const isHost = lobbies[gameCode].players[0]?.id === socket.id;
        socket.emit('isHost', isHost);
    });
});

function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcastGameState(gameCode) {
    if (lobbies[gameCode]) {
        const gameState = lobbies[gameCode].gameState;
        const sanitizedGameState = {
            players: gameState.players.map(player => ({
                id: player.id,
                name: player.name,
                lives: player.lives
            })),
            currentPair: gameState.currentPair,
            currentPlayer: gameState.currentPlayer,
            started: gameState.started
        };
        io.to(gameCode).emit('updateGameState', sanitizedGameState);
    }
}

function initializeGameState(gameCode) {
    const wordPairs = generateWordPairs();
    const players = lobbies[gameCode].players.map(player => ({
        ...player,
        lives: player.lives || 3 
    }));
    lobbies[gameCode].gameState = {
        players,
        currentPair: wordPairs.pop(),
        wordPairs,
        currentPlayer: 0,
        started: true,
        timer: null,
        timeLeft: 10 
    };
}

function generateWordPairs() {
    return [
        "sh", "oc", "so", "tr", "ex", "un", "al", "in", "th", "he", "an", "re", "er", "on", "at", "en",
        "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "ar", "st", "to", "nt", "ng", "se", "ha",
    ];
}

function startTurnTimer(gameCode) {
    const gameState = lobbies[gameCode].gameState;
    clearInterval(gameState.timer);
    gameState.timeLeft = 10; 

    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        io.to(gameCode).emit('updateTime', gameState.timeLeft);

        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            const currentPlayer = gameState.players[gameState.currentPlayer];
            if (currentPlayer) {
                currentPlayer.lives--;
                if (currentPlayer.lives <= 0) {
                    gameState.players = gameState.players.filter(player => player.id !== currentPlayer.id);
                }
                if (gameState.players.length === 1) {
                    io.to(gameCode).emit('gameOver', { winner: gameState.players[0].name });
                } else if (gameState.players.length > 0) {
                    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
                    broadcastGameState(gameCode);
                    startTurnTimer(gameCode);
                } else {
                    io.to(gameCode).emit('gameOver', { message: "Game Over!" });
                }
            }
        }
    }, 1000);
}

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://159.89.9.120:3000`));

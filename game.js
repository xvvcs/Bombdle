let players = [];
let currentTurn = 0;
let lives = {};
let usedWords = new Set();
let wordPairs = ["sh", "oc", "so", "tr", "ex", "un", "al", "in"];
let currentPair;
let timer;

function startGame() {
    let playerCount = document.getElementById("player-count").value;
    players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
    lives = Object.fromEntries(players.map(player => [player, 3]));
    document.getElementById("start-container").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    renderPlayers();
    nextTurn();
}

function renderPlayers() {
    const playersContainer = document.getElementById("players");
    playersContainer.innerHTML = '';
    players.forEach(player => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player";
        playerDiv.textContent = player;
        for (let i = 0; i < lives[player]; i++) {
            const heart = document.createElement("span");
            heart.className = "heart";
            heart.textContent = "❤️";
            playerDiv.appendChild(heart);
        }
        playersContainer.appendChild(playerDiv);
    });
}

function nextTurn() {
    if (players.length === 0) {
        alert("Game Over!");
        return;
    }
    
    currentPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    document.getElementById("word-prompt").textContent = `Find a word containing: ${currentPair}`;
    document.getElementById("status").textContent = `${players[currentTurn]}'s turn!`;
    highlightCurrentPlayer();
    resetTimer();
}

function highlightCurrentPlayer() {
    const playerDivs = document.querySelectorAll(".player");
    playerDivs.forEach((div, index) => {
        if (index === currentTurn) {
            div.classList.add("active");
        } else {
            div.classList.remove("active");
        }
    });
}

function resetTimer() {
    clearTimeout(timer);
    let timeLimit = Math.floor(Math.random() * 5) + 5;
    timer = setTimeout(() => loseLife(players[currentTurn]), timeLimit * 1000);
}

function submitWord() {
    let input = document.getElementById("word-input").value.toLowerCase();
    if (!input.includes(currentPair) || usedWords.has(input)) {
        showMessage("wrong", "Invalid word or word already used!");
        return;
    }
    usedWords.add(input);
    showMessage("correct", "Correct!");
    document.getElementById("word-input").value = ''; // Clear the input field
    nextPlayer();
}

function showMessage(type, text) {
    const messageDiv = document.querySelector(`.message.${type}`);
    messageDiv.textContent = text;
    messageDiv.style.display = "block";
    setTimeout(() => {
        messageDiv.style.display = "none";
    }, 2000);
}

function nextPlayer() {
    currentTurn = (currentTurn + 1) % players.length;
    renderPlayers(); // Update the players' lives display
    nextTurn();
}

function loseLife(player) {
    lives[player]--;
    if (lives[player] <= 0) {
        players = players.filter(p => p !== player);
    }
    nextPlayer();
}

function goBackToMenu() {
    clearTimeout(timer);
    document.getElementById("game-container").style.display = "none";
    document.getElementById("start-container").style.display = "block";
    players = [];
    currentTurn = 0;
    lives = {};
    usedWords = new Set();
}
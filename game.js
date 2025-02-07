let players = [];
let currentTurn = 0;
let lives = {};
let usedWords = new Set();
let wordPairs = [
    "sh", "oc", "so", "tr", "ex", "un", "al", "in", "th", "he", "an", "re", "er", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "ar", "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le", "ve", "co", "me", "de", "hi", "ri", "ro", "ic", "ne", "ea", "ra", "ce", "li", "ch", "ll", "be", "ma", "si", "om", "ur", "ca", "el", "ta", "la", 
    "no", "di", "pe", "mo", "lo", "us", "mi", "na", "pa", "pr", "po", "do", "fo", "wi", "ho", "we", "wh", "fr", "pl", "gr", "cl", "fl", "bl", "cr", "dr", "br", "gl", "sl", "sp", "sc", "sk", "sm", "sn", "sw", "tw", "qu", "ph", "gh", "kn", "wr", "ck", "ng", "nk", "th", "wh", "sh", "ch", "ph", "gh", "ck", "ng", "nk"
];
let currentPair;
let timer;
let validWords = new Set();

// Load words from words.txt
fetch('words.txt')
    .then(response => response.text())
    .then(text => {
        validWords = new Set(text.split('\n').map(word => word.trim().toLowerCase()));
    });

function startGame() {
    const playerCount = document.getElementById('player-count').value;
    const nicknameContainer = document.getElementById('nickname-container');
    const nicknameInputs = document.getElementById('nickname-inputs');

    nicknameInputs.innerHTML = '';
    for (let i = 1; i <= playerCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Player ${i} Nickname`;
        input.id = `player-${i}-nickname`;
        nicknameInputs.appendChild(input);
    }

    document.getElementById('start-container').style.display = 'none';
    nicknameContainer.style.display = 'block';
}

function startGameWithNicknames() {
    const playerCount = document.getElementById('player-count').value;
    players = [];
    let nicknameSet = new Set();
    const nicknameError = document.getElementById('nickname-error');
    nicknameError.textContent = '';

    for (let i = 1; i <= playerCount; i++) {
        const nickname = document.getElementById(`player-${i}-nickname`).value;
        if (nicknameSet.has(nickname)) {
            nicknameError.textContent = "Nicknames must be unique. Please enter different nicknames.";
            return;
        }
        nicknameSet.add(nickname);
        players.push(nickname);
        lives[nickname] = 3; // Initialize each player with 3 lives
    }

    // Randomly choose the starting player
    currentTurn = Math.floor(Math.random() * players.length);

    document.getElementById('nickname-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

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
            const heart = document.createElement("img");
            heart.className = "heart";
            heart.src = "img/heart.png"; // Path to the heart icon image
            heart.alt = "❤️";
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

    if (players.length === 1) {
        declareWinner(players[0]);
        return;
    }
    
    currentPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    document.getElementById("word-prompt").textContent = `Find a word containing: ${currentPair}`;
    document.getElementById("status").textContent = `${players[currentTurn]}'s turn!`;
    highlightCurrentPlayer();
    resetTimer();
}

function declareWinner(winner) {
    clearTimeout(timer);
    document.getElementById("game-container").style.display = "none";
    document.getElementById("winner-container").style.display = "block";
    document.getElementById("winner").textContent = `${winner} wins! 🎉`;
    document.getElementById("winner").classList.add("celebrate");
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
    if (!input.includes(currentPair) || usedWords.has(input) || !validWords.has(input)) {
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
    document.getElementById("winner-container").style.display = "none";
    document.getElementById("start-container").style.display = "block";
    document.getElementById("winner").classList.remove("celebrate");
    players = [];
    currentTurn = 0;
    lives = {};
    usedWords = new Set();
}
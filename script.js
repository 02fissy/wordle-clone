import { WORDS } from "./words.js";

const WORD_KEY = "wordle_word";
const STORAGE_KEY = 'recent_guesses';
const STATS_KEY = 'wordle_stats';
const NUMBER_OF_GUESSES = 6;

let guessesRemaining = NUMBER_OF_GUESSES;
let currentGuess = [];
let nextLetter = 0;

let rightGuessString = localStorage.getItem(WORD_KEY);

if (!rightGuessString) {
    rightGuessString = WORDS[Math.floor(Math.random() * WORDS.length)];
    localStorage.setItem(WORD_KEY, rightGuessString);
}


let stats = JSON.parse(localStorage.getItem(STATS_KEY)) || {
    currentStreak: 0,
    maxStreak: 0,
    gamesPlayed: 0
};

console.log(rightGuessString);

function updateStats(isWin) {
    stats.gamesPlayed++;
    if (isWin) {
        stats.currentStreak++;
        if (stats.currentStreak > stats.maxStreak) {
            stats.maxStreak = stats.currentStreak;
        }
    } else {
        stats.currentStreak = 0;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
   
    renderStats();
}

function renderStats() {
    const playedEl = document.getElementById("games-count");
    const streakEl = document.getElementById("streak-count");
    const maxEl = document.getElementById("max-count");
    
    if(playedEl) playedEl.textContent = stats.gamesPlayed;
    if(streakEl) streakEl.textContent = stats.currentStreak;
    if(maxEl) maxEl.textContent = stats.maxStreak;
}

function validateHardMode(currentGuessStr) {
    const hardModeCheckbox = document.getElementById("hard-mode-toggle");
    if (!hardModeCheckbox || !hardModeCheckbox.checked) return true;

    const savedGuesses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    if (savedGuesses.length === 0) return true;

    let requiredLetters = new Set();
    let fixedPositions = {};

    savedGuesses.forEach(guessObj => {
        for (let i = 0; i < 5; i++) {
            const letter = guessObj.word[i];
            const color = guessObj.colors[i];

            if (color === "green") {
                fixedPositions[i] = letter;
            }

            if (color === "yellow") {
                requiredLetters.add(letter);
            }
        }
    });

    for (let index in fixedPositions) {
        if (currentGuessStr[index] !== fixedPositions[index]) {
            toastr.error(
                `Must use ${fixedPositions[index].toUpperCase()} in position ${Number(index) + 1}`
            );
            return false;
        }
    }
    for (let letter of requiredLetters) {
        if (!currentGuessStr.includes(letter)) {
            toastr.error(`Must include ${letter.toUpperCase()}`);
            return false;
        }
    }

    return true;
}


function saveGuesses(guess, colors) {
    let savedGuesses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    savedGuesses.push({ word: guess, colors: colors });
    if (savedGuesses.length > 6) savedGuesses.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedGuesses));
}

function initBoard() {
    let board = document.getElementById("game-board");

    board.innerHTML = "";
    let savedGuesses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];


     guessesRemaining = NUMBER_OF_GUESSES;
    currentGuess = [];
    nextLetter = 0;
    renderStats();

    for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
        let row = document.createElement("div");
        row.className = "letter-row";
        let savedGuess = savedGuesses[i];

        for (let j = 0; j < 5; j++) {
            let box = document.createElement("div");
            box.className = "letter-box";
            if (savedGuess) {
                box.textContent = savedGuess.word[j];
                box.style.backgroundColor = savedGuess.colors[j];
                shadeKeyBoard(savedGuess.word[j], savedGuess.colors[j]);
            }
            row.appendChild(box);
        }
        board.appendChild(row);
    }
    
    if (savedGuesses.length > 0) {
        guessesRemaining = NUMBER_OF_GUESSES - savedGuesses.length;
        const hardModeCheckbox = document.getElementById("hard-mode-toggle");
        if (hardModeCheckbox) hardModeCheckbox.disabled = true;
    }
}

function shadeKeyBoard(letter, color) {
    for (const elem of document.getElementsByClassName("keyboard-button")) {
        if (elem.textContent === letter) {
            let oldColor = elem.style.backgroundColor;
            if (oldColor === "green") return;
            if (oldColor === "yellow" && color !== "green") return;
            elem.style.backgroundColor = color;
            break;
        }
    }
}

function deleteLetter() {
    let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
    let box = row.children[nextLetter - 1];
    box.textContent = "";
    box.classList.remove("filled-box");
    currentGuess.pop();
    nextLetter -= 1;
}

function checkGuess() {
    let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
    let guessString = currentGuess.join("");
    let rightGuess = Array.from(rightGuessString);

    if (guessString.length != 5) {
        animateCSS(row, "shakeX");
        toastr.error("Not enough letters!");
        return;
    }

    if (!WORDS.includes(guessString)) {
        animateCSS(row, "shakeX");
        toastr.error("Word not in list!");
        return;
    }

    if (!validateHardMode(guessString)) {
        animateCSS(row, "shakeX");
        return;
    }

    const hardModeCheckbox = document.getElementById("hard-mode-toggle");
    if (hardModeCheckbox) hardModeCheckbox.disabled = true;

    var letterColor = ["gray", "gray", "gray", "gray", "gray"];

    for (let i = 0; i < 5; i++) {
        if (rightGuess[i] == currentGuess[i]) {
            letterColor[i] = "green";
            rightGuess[i] = "#";
        }
    }

    for (let i = 0; i < 5; i++) {
        if (letterColor[i] == "green") continue;
        for (let j = 0; j < 5; j++) {
            if (rightGuess[j] == currentGuess[i]) {
                letterColor[i] = "yellow";
                rightGuess[j] = "#";
            }
        }
    }

    for (let i = 0; i < 5; i++) {
        let box = row.children[i];
        let delay = 250 * i;
        setTimeout(() => {
            animateCSS(box, "flipInX");
            box.style.backgroundColor = letterColor[i];
            shadeKeyBoard(guessString.charAt(i), letterColor[i]);
        }, delay);
    }

    saveGuesses(guessString, letterColor);

    if (guessString === rightGuessString) {
        toastr.success("You guessed right! Game over!");
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(WORD_KEY);
        updateStats(true);
        guessesRemaining = 0;

        setTimeout(() => {
        resetGame();
        }, 1600);

        return;
    } else {
        guessesRemaining -= 1;
        currentGuess = [];
        nextLetter = 0;

        if (guessesRemaining === 0) {
             localStorage.removeItem(STORAGE_KEY);
             localStorage.removeItem(WORD_KEY);
            updateStats(false);
            toastr.error("You've run out of guesses! Game over!");
            toastr.info(`The right word was: "${rightGuessString}"`);

            setTimeout(() => {
             resetGame();
            }, 2200);

        }
    }
}

function insertLetter(pressedKey) {
    if (nextLetter === 5) return;
    pressedKey = pressedKey.toLowerCase();
    let row = document.getElementsByClassName("letter-row")[NUMBER_OF_GUESSES - guessesRemaining];
    let box = row.children[nextLetter];
    animateCSS(box, "pulse");
    box.textContent = pressedKey;
    box.classList.add("filled-box");
    currentGuess.push(pressedKey);
    nextLetter += 1;
}

const animateCSS = (element, animation, prefix = "animate__") =>
    new Promise((resolve) => {
        const animationName = `${prefix}${animation}`;
        const node = element;
        node.style.setProperty("--animate-duration", "0.3s");
        node.classList.add(`${prefix}animated`, animationName);
        function handleAnimationEnd(event) {
            event.stopPropagation();
            node.classList.remove(`${prefix}animated`, animationName);
            resolve("Animation ended");
        }
        node.addEventListener("animationend", handleAnimationEnd, { once: true });
    });

document.addEventListener("keyup", (e) => {
    if (guessesRemaining === 0) return;
    let pressedKey = String(e.key);
    if (pressedKey === "Backspace" && nextLetter !== 0) {
        deleteLetter();
        return;
    }
    if (pressedKey === "Enter") {
        checkGuess();
        return;
    }
    let found = pressedKey.match(/[a-z]/gi);
    if (!found || found.length > 1) return;
    insertLetter(pressedKey);
});

document.getElementById("keyboard-cont").addEventListener("click", (e) => {
    const target = e.target;
    if (!target.classList.contains("keyboard-button")) return;
    let key = target.textContent;
    if (key === "Del") key = "Backspace";
    document.dispatchEvent(new KeyboardEvent("keyup", { key: key }));
});

function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WORD_KEY);

    guessesRemaining = NUMBER_OF_GUESSES;
    currentGuess = [];
    nextLetter = 0;
   
    rightGuessString = WORDS[Math.floor(Math.random() * WORDS.length)];
    localStorage.setItem(WORD_KEY, rightGuessString);
    console.log("New word:", rightGuessString);

    const board = document.getElementById("game-board");
    board.innerHTML = "";

    const keys = document.getElementsByClassName("keyboard-button");
    for (let key of keys) {
        key.style.backgroundColor = "";
    }

    const hardModeCheckbox = document.getElementById("hard-mode-toggle");
    if (hardModeCheckbox) {
        hardModeCheckbox.disabled = false;
        hardModeCheckbox.checked = false;
    }

    initBoard();
}


initBoard();
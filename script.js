// Guess the Person - Multiplayer Leaderboard
// this code was made by Injeti Roni Atchut of class IX B

// ADD YOUR SUPABASE DETAILS HERE
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const MAX_ROUNDS = 5;

let people = [];
let currentPerson = null;
let score = 0;
let questionNumber = 0;
let usedPeople = [];
let playerName = "";

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const leaderboardScreen = document.getElementById("leaderboard-screen");

const nameInput = document.getElementById("player-name");
const startButton = document.getElementById("start-button");
const playAgainButton = document.getElementById("play-again-button");

const imageElement = document.getElementById("person-image");
const optionsElement = document.getElementById("options");
const resultElement = document.getElementById("result");
const nextButton = document.getElementById("next-button");
const scoreElement = document.getElementById("score");
const questionNumberElement = document.getElementById("question-number");

const finalScoreElement = document.getElementById("final-score");
const leaderboardElement = document.getElementById("leaderboard");
const leaderboardLoading = document.getElementById("leaderboard-loading");

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

nameInput.addEventListener("input", () => {
    const valid = nameInput.value.trim().length > 0;
    startButton.disabled = !valid;
    startButton.classList.toggle("enabled", valid);
});

nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !startButton.disabled) startGame();
});

async function loadPeople() {
    try {
        const response = await fetch("people.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        people = await response.json();

        if (people.length < 4) {
            alert("You need at least 4 images in the images folder.");
            return;
        }
    } catch (error) {
        console.error(error);
        alert("Could not load people.json. Run generate.py first and upload people.json.");
    }
}

function startGame() {
    playerName = nameInput.value.trim();
    if (!playerName) return;

    score = 0;
    questionNumber = 0;
    usedPeople = [];
    scoreElement.textContent = "0";

    startScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    quizScreen.style.display = "block";

    nextQuestion();
}

function getRandomPerson() {
    if (usedPeople.length === people.length) usedPeople = [];

    const available = people.filter(
        person => !usedPeople.includes(person.name)
    );

    const person = available[Math.floor(Math.random() * available.length)];
    usedPeople.push(person.name);
    return person;
}

function nextQuestion() {
    if (questionNumber >= MAX_ROUNDS) {
        finishGame();
        return;
    }

    resultElement.textContent = "";
    nextButton.style.display = "none";
    optionsElement.innerHTML = "";

    questionNumber++;
    questionNumberElement.textContent =
        `${questionNumber} / ${MAX_ROUNDS}`;

    currentPerson = getRandomPerson();
    imageElement.src = currentPerson.image;

    let choices = [currentPerson];
    let incorrect = people.filter(
        person => person.name !== currentPerson.name
    );

    shuffle(incorrect);
    choices.push(...incorrect.slice(0, 3));
    shuffle(choices);

    choices.forEach(person => {
        const button = document.createElement("button");
        button.classList.add("option-button");
        button.textContent = person.name;
        button.addEventListener("click", () => checkAnswer(button, person));
        optionsElement.appendChild(button);
    });
}

function checkAnswer(selectedButton, selectedPerson) {
    const buttons = document.querySelectorAll(".option-button");
    buttons.forEach(button => button.disabled = true);

    if (selectedPerson.name === currentPerson.name) {
        selectedButton.classList.add("correct");
        resultElement.textContent = "Correct! 🎉";
        resultElement.style.color = "#35a853";
        score++;
        scoreElement.textContent = score;
    } else {
        selectedButton.classList.add("wrong");
        resultElement.textContent =
            "Wrong! The answer was " + currentPerson.name;
        resultElement.style.color = "#ea4335";

        buttons.forEach(button => {
            if (button.textContent === currentPerson.name) {
                button.classList.add("correct");
            }
        });
    }

    if (questionNumber < MAX_ROUNDS) {
        nextButton.style.display = "inline-block";
    } else {
        resultElement.textContent += ` Final score: ${score}/${MAX_ROUNDS}`;
        setTimeout(finishGame, 900);
    }
}

function supabaseConfigured() {
    return SUPABASE_URL &&
           SUPABASE_ANON_KEY &&
           !SUPABASE_URL.includes("YOUR_SUPABASE") &&
           !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
}

function supabaseHeaders() {
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
    };
}

async function finishGame() {
    quizScreen.style.display = "none";
    leaderboardScreen.style.display = "block";

    finalScoreElement.textContent =
        `${playerName}, you scored ${score}/${MAX_ROUNDS}!`;

    leaderboardLoading.style.display = "block";
    leaderboardElement.innerHTML = "";

    await saveScore();
    await loadLeaderboard();
}

async function saveScore() {
    if (!supabaseConfigured()) {
        leaderboardLoading.textContent =
            "Leaderboard is not connected yet. Add your Supabase details in script.js.";
        return;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/leaderboard`,
            {
                method: "POST",
                headers: supabaseHeaders(),
                body: JSON.stringify({
                    name: playerName,
                    score: score
                })
            }
        );

        if (!response.ok) throw new Error(await response.text());
    } catch (error) {
        console.error("Could not save score:", error);
        leaderboardLoading.textContent =
            "Could not save your score. Check your Supabase setup.";
    }
}

async function loadLeaderboard() {
    if (!supabaseConfigured()) return;

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/leaderboard?select=name,score&order=score.desc,name.asc&limit=100`,
            {
                method: "GET",
                headers: supabaseHeaders()
            }
        );

        if (!response.ok) throw new Error(await response.text());

        const rows = await response.json();
        leaderboardElement.innerHTML = "";

        rows.forEach((row) => {
            const item = document.createElement("li");

            const name = document.createElement("span");
            name.textContent = row.name;

            const points = document.createElement("strong");
            points.textContent = `${row.score}/${MAX_ROUNDS}`;

            item.appendChild(name);
            item.appendChild(points);
            leaderboardElement.appendChild(item);
        });

        leaderboardLoading.style.display = "none";
    } catch (error) {
        console.error("Could not load leaderboard:", error);
        leaderboardLoading.textContent =
            "Could not load the leaderboard. Check your Supabase setup.";
    }
}

nextButton.addEventListener("click", nextQuestion);

playAgainButton.addEventListener("click", () => {
    leaderboardScreen.style.display = "none";
    quizScreen.style.display = "none";
    startScreen.style.display = "block";

    startButton.disabled = nameInput.value.trim().length === 0;
    startButton.classList.toggle("enabled", !startButton.disabled);
});

loadPeople();

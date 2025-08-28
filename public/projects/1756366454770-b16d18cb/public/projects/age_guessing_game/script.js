```javascript
const randomNumber = Math.floor(Math.random() * 100) + 1;
let guessCount = 0;

const guessInput = document.getElementById("guessInput");
const guessButton = document.getElementById("guessButton");
const message = document.getElementById("message");

guessButton.addEventListener("click", () => {
  const guess = parseInt(guessInput.value);
  guessCount++;

  if (isNaN(guess) || guess < 1 || guess > 100) {
    message.textContent = "Please enter a valid number between 1 and 100.";
    return;
  }

  if (guess === randomNumber) {
    message.textContent = `Congratulations! You guessed the number in ${guessCount} tries.`;
    guessInput.disabled = true;
    guessButton.disabled = true;
  } else if (guess < randomNumber) {
    message.textContent = "Too low! Try again.";
  } else {
    message.textContent = "Too high! Try again.";
  }
});
```

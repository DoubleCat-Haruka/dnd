// === Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyA3FGHftCkHCQaZgIjr30Ts9Xg-oWe1XJ8",
  authDomain: "dndcompain-175ed.firebaseapp.com",
  projectId: "dndcompain-175ed",
  storageBucket: "dndcompain-175ed.firebasestorage.app",
  messagingSenderId: "1051977600043",
  appId: "1:1051977600043:web:e43829b20b2127848f6e6e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const RESULT_COLLECTION = "diceResults"; // коллекция для результатов
const RESULT_DOC = "currentResult";       // документ с текущим результатом

const FORMULA_COLLECTION = "formulaHistory"; // коллекция истории формул
const FORMULA_DOC = "lastFormulas";          // документ для последних 8 формул

function saveResultToFirebase(finalResult, color) {
  db.collection(RESULT_COLLECTION).doc(RESULT_DOC).set({
    result: finalResult,
    color: color,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function saveFormulaToFirebase(formula) {
  const docRef = db.collection(FORMULA_COLLECTION).doc(FORMULA_DOC);

  docRef.get().then(doc => {
    let formulas = [];
    if (doc.exists) {
      formulas = doc.data().formulas || [];
    }

    formulas.push(formula);

    if (formulas.length > 8) {
      formulas = formulas.slice(formulas.length - 8);
    }

    docRef.set({ formulas: formulas });
  });
}

function rollDice(sides) {
  const modifierInput = document.getElementById("modifier").value;
  let modifier = parseInt(modifierInput) || 0;

  const roll = Math.floor(Math.random() * sides) + 1;
  const finalResult = roll + modifier;

  const diceResultElement = document.getElementById("dice-result");

  if (roll === 1) diceResultElement.style.color = 'red';
  else if (roll === sides) diceResultElement.style.color = 'green';
  else diceResultElement.style.color = 'MediumVioletRed';

  diceResultElement.textContent = `${finalResult}`;

  // сохраняем результат
  saveResultToFirebase(finalResult, diceResultElement.style.color);
}

function rollFormula() {
  const formulaInput = document.getElementById("formula").value;
  const modifierInput = document.getElementById("modifier").value;

  let modifier = parseInt(modifierInput) || 0;

  let hitsMin = false;
  let hitsMax = false;

  const formula = formulaInput.toUpperCase().replace(/D(\d+)/g, (match, sides) => {
    sides = parseInt(sides);
    const roll = Math.floor(Math.random() * sides) + 1;
    if (roll === 1) hitsMin = true;
    if (roll === sides) hitsMax = true;
    return roll;
  });

  let result;
  try {
    result = Math.max(1, Math.floor(eval(formula) + modifier));
  } catch (e) {
    alert("Некорректная формула!");
    return;
  }

  const diceResultElement = document.getElementById("dice-result");

  if (hitsMin) diceResultElement.style.color = 'red';
  else if (hitsMax) diceResultElement.style.color = 'green';
  else diceResultElement.style.color = 'MediumVioletRed';

  diceResultElement.textContent = `${result}`;

  // сохраняем результат
  saveResultToFirebase(result, diceResultElement.style.color);

  // сохраняем формулу в историю
  saveFormulaToFirebase(formulaInput);
}

// real-time обновление истории формул
db.collection(FORMULA_COLLECTION).doc(FORMULA_DOC)
  .onSnapshot(doc => {
    const list = document.getElementById("formula-history-list");
    list.innerHTML = "";

    if (doc.exists) {
      const formulas = doc.data().formulas || [];
      formulas.forEach(f => {
        const li = document.createElement("li");
        li.textContent = f;
        list.appendChild(li);
      });
    }
  });
// Слушаем изменения в реальном времени
db.collection(RESULT_COLLECTION).doc(RESULT_DOC)
  .onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      const result = data.result;
      const color = data.color;

      const diceResultElement = document.getElementById("dice-result");
      diceResultElement.textContent = result;  // Устанавливаем результат из Firebase
      diceResultElement.style.color = color;   // Устанавливаем цвет из Firebase
    }
  });
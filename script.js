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

// Функция для сохранения результата в Firebase
function saveResultToFirebase(finalResult, color) {
  db.collection(RESULT_COLLECTION).doc(RESULT_DOC).set({
    result: finalResult,  // Результат броска
    color: color,         // Цвет результата
    timestamp: firebase.firestore.FieldValue.serverTimestamp()  // Время сохранения
  });
}

// Функция для сохранения формулы в Firebase
function saveFormulaToFirebase(formula) {
  const docRef = db.collection(FORMULA_COLLECTION).doc(FORMULA_DOC);

  docRef.get().then(doc => {
    let formulas = [];
    if (doc.exists) {
      formulas = doc.data().formulas || [];  // Если уже есть формулы, добавляем новые
    }

    formulas.push(formula);  // Добавляем новую формулу

    // Ограничиваем количество формул до 8
    if (formulas.length > 8) {
      formulas = formulas.slice(formulas.length - 8);
    }

    docRef.set({ formulas: formulas });  // Сохраняем обновлённый список формул
  });
}

// Функция для броска кости
function rollDice(sides) {
  const modifierInput = document.getElementById("modifier").value;
  const modifier = parseInt(modifierInput) || 0;

  const roll = Math.floor(Math.random() * sides) + 1;
  const finalResult = roll + modifier;

  const diceResultElement = document.getElementById("dice-result");

  // Цвет в зависимости от броска
  if (roll === 1) diceResultElement.style.color = 'red';
  else if (roll === sides) diceResultElement.style.color = 'green';
  else diceResultElement.style.color = 'MediumVioletRed';

  diceResultElement.textContent = finalResult;

  // Сохраняем результат в Firebase
  saveResultToFirebase(finalResult, diceResultElement.style.color);

  // === Формируем текст формулы для истории ===
  let formulaText;
  if (modifier !== 0) {
    const sign = modifier > 0 ? "+" : "";
    formulaText = `D${sides}${sign}${modifier} [${roll}] = ${finalResult}`;
  } else {
    formulaText = `D${sides} [${roll}] = ${finalResult}`;
  }

  saveFormulaToFirebase(formulaText);

  console.log(`Бросок ${formulaText}`);
}



// Функция для работы с произвольной формулой
// Функция для работы с произвольной формулой
// Функция для работы с произвольной формулой
function rollFormula() {
  const formulaInput = document.getElementById("formula").value.trim();  // Получаем формулу
  const modifierInput = document.getElementById("modifier").value.trim();  // Получаем модификатор

  let modifier = parseInt(modifierInput) || 0;  // Преобразуем модификатор в число

  let hitsMin = false;
  let hitsMax = false;
  let rollsList = []; // Сюда запишем все выпавшие значения кубиков

  // Замена D(число) на случайное значение кубика
  const replacedFormula = formulaInput.toUpperCase().replace(/(\d*)D(\d+)/g, (match, count, sides) => {
    sides = parseInt(sides);
    count = parseInt(count) || 1;

    const rolls = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      if (roll === 1) hitsMin = true;
      if (roll === sides) hitsMax = true;
    }

    rollsList.push(...rolls); // добавляем в общий список всех бросков
    return rolls.reduce((a, b) => a + b, 0); // сумма всех бросков по формуле
  });

  let result;
  try {
    result = Math.max(1, Math.floor(eval(replacedFormula) + modifier)); // Вычисляем результат формулы
  } catch (e) {
    alert("Некорректная формула!"); // Ошибка при вычислении формулы
    return;
  }

  const diceResultElement = document.getElementById("dice-result");

  // Цвет результата
  if (hitsMin) diceResultElement.style.color = 'red';
  else if (hitsMax) diceResultElement.style.color = 'green';
  else diceResultElement.style.color = 'MediumVioletRed';

  diceResultElement.textContent = `${result}`;

  // Сохраняем результат в Firebase
  saveResultToFirebase(result, diceResultElement.style.color);

  // Формируем красивую строку с выпавшими значениями
  const rollsText = rollsList.length ? ` [${rollsList.join(", ")}]` : "";

  // сохраняем формулу в историю: "2D6+3 [4,6] = 13"
  const fullRecord = `${formulaInput}${rollsText} = ${result}`;
  saveFormulaToFirebase(fullRecord);
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
  
// Слушаем изменения в реальном времени для отображения текущего результата
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
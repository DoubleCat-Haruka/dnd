// Firebase конфигурация и инициализация
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

// === Новая вспомогательная функция ===
function safeSetTextContent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// === Форматирование модификатора в виде (+X) или (-X) с пробелом перед скобками ===
function formatModifier(value) {
  const mod = Math.floor((value - 10) / 2);
  return `  (${mod >= 0 ? "+" : ""}${mod})`;
}

// --- БОНУС МАСТЕРСТВА (пока фиксирован)
const PROF_BONUS = 2;

// Карта навыков → основной характеристики
const skillToStat = {
  "акробатика": "Ловкость",
  "анализ": "Интеллект",
  "атлетика": "Сила",
  "восприятие": "Мудрость",
  "выживание": "Мудрость",
  "выступление": "Харизма",
  "запугивание": "Харизма",
  "история": "Интеллект",
  "ловкость рук": "Ловкость",
  "магия": "Интеллект",
  "медицина": "Мудрость",
  "обман": "Харизма",
  "природа": "Интеллект",
  "проницательность": "Мудрость",
  "религия": "Интеллект",
  "скрытность": "Ловкость",
  "убеждение": "Харизма",
  "уход за животными": "Мудрость"
};

// Функция расчёта модификатора навыка
function calcSkillBonus(skillName, stats, startValue) {
  const baseStatName = skillToStat[skillName];
  if (!baseStatName || !stats[baseStatName]) return "(0)";
  const base = Math.floor((stats[baseStatName] - 10) / 2);
  const total = base + PROF_BONUS + (startValue || 0);
  return total >= 0 ? `  (+${total})` : `  (${total})`;
}

/// === Реальное время обновления данных персонажа ===
function loadCharacterData(characterId, prefix) {
  const docRef = db.collection("characters").doc(characterId);

  // Слушаем изменения документа в реальном времени
  docRef.onSnapshot((doc) => {
    if (!doc.exists) return;

    const stats = doc.data().stats || {};
    const skillsData = doc.data().skills || {};
    const traitsData = doc.data().traits || {};
    const abilitiesData = doc.data().abilities || [];
    const ideals = doc.data().ideals || "";
    const bonds = doc.data().bonds || "";
    const flaws = doc.data().flaws || "";
    const languages = doc.data().languages || "";

    // Загружаем хиты
    const hp = stats["хиты"] || 0;
    const maxHp = stats["макс хиты"] || Infinity;

    safeSetTextContent(`${prefix}-hp`, hp);
    safeSetTextContent(`${prefix}-max-hp`, maxHp);
    updateHpPlusButton(prefix);

    // Основные характеристики
    document.getElementById(`${prefix}-class`).textContent = stats["класс"] || "-";
    document.getElementById(`${prefix}-race`).textContent = stats["раса"] || "-";
    document.getElementById(`${prefix}-name`).textContent = stats["имя"] || "-";
    document.getElementById(`${prefix}-inspiration`).textContent = stats["вдохновение"] || "-";
    document.getElementById(`${prefix}-ac`).textContent = stats["класс брони"] || "-";
    document.getElementById(`${prefix}-initiative`).textContent = stats["инициатива"] || "-";
    document.getElementById(`${prefix}-speed`).textContent = stats["скорость"] || "-";
    document.getElementById(`${prefix}-lvl`).textContent = stats["Уровень"] || "-";

    // Основные статы
    const mainStats = {
      str: "Сила",
      dex: "Ловкость",
      con: "Телосложение",
      int: "Интеллект",
      wis: "Мудрость",
      cha: "Харизма"
    };

    Object.entries(mainStats).forEach(([key, name]) => {
      const el = document.getElementById(`${prefix}-${key}`);
      if (el) el.textContent = stats[name] ?? "-";
      const saveEl = document.getElementById(`${prefix}-${key}-save`);
      if (saveEl) {
        const mod = Math.floor((stats[name] - 10) / 2) || 0;
        saveEl.textContent = `  (${mod >= 0 ? "+" : ""}${mod})`;
      }
    });

    // Навыки
    Object.entries(skillToStat).forEach(([skill, baseStat]) => {
      const baseValue = Math.floor((stats[baseStat] - 10) / 2) || 0;
      const start = skillsData[skill] || 0;
      const total = baseValue + PROF_BONUS + start;
      const id = `${prefix}-${skill.replace(/\s+/g, "-")}`;
      const el = document.getElementById(id);
      if (el) el.textContent = `${start}  (${total >= 0 ? "+" : ""}${total})`;
    });

    // Черты, идеалы и прочее (если эти поля есть на странице)
    const fields = {
      traits: traitsData,
      ideals,
      bonds,
      flaws,
      languages
    };

    Object.entries(fields).forEach(([key, value]) => {
      const el = document.getElementById(`${prefix}-${key}`);
      if (el) el.value = value;
    });

    // Умения
    for (let i = 1; i <= 10; i++) {
      const el = document.getElementById(`${prefix}-ability${i}`);
      if (el) el.value = abilitiesData[i - 1] || "";
    }
	
	// === Подгружаем инвентарь ===
	const inventoryField = document.getElementById(`${prefix}-inventory`);
	if (inventoryField) inventoryField.value = doc.data().inventory || "";

	
  });
}

// === Универсальный обработчик кнопок + / - ===
document.querySelectorAll('.adjust-btn, .adjust-skill-btn').forEach(button => {
  button.addEventListener('click', async (e) => {
    const target = e.target.dataset.target;
    const action = e.target.dataset.action;
    const valueSpan = document.getElementById(target);
    if (!valueSpan) return;

    let currentValue = parseInt(valueSpan.textContent) || 0;
    if (action === "plus") currentValue += 1;
    else if (action === "minus") currentValue -= 1;

    const prefix = target.split('-')[0];

    // Сохраняем текст на странице сразу
    safeSetTextContent(target, currentValue);

    // Сохраняем в Firestore
    await saveCharacterStat(target, currentValue);

    // --- Проверка кнопки + для хитов ---
    if (target.endsWith('-hp') || target.endsWith('-max-hp')) {
      updateHpPlusButton(prefix);
    }

    // --- Обновление спасброска для характеристик ---
    const statKey = target.split('-')[1];
    const saveSpanId = `${prefix}-${statKey}-save`;
    safeSetTextContent(saveSpanId, formatModifier(currentValue));

    // --- Навыки ---
    const skillKey = target.split('-').slice(1).join("-").replace(/-/g," ");
    if (skillToStat[skillKey]) {
      const stats = (await db.collection("characters").doc(prefix).get()).data().stats || {};
      const baseStat = skillToStat[skillKey];
      const baseValue = Math.floor((stats[baseStat] - 10) / 2) || 0;
      const total = baseValue + PROF_BONUS + currentValue;
      valueSpan.textContent = `${currentValue}  (${total >= 0 ? "+" : ""}${total})`;
    }
  });
});

// === Функция обновления кнопки + для хитов ===
function updateHpPlusButton(prefix) {
  const hpSpan = document.getElementById(`${prefix}-hp`);
  const maxHpSpan = document.getElementById(`${prefix}-max-hp`);
  const plusButton = document.querySelector(`.adjust-btn[data-target="${prefix}-hp"][data-action="plus"]`);

  if (!hpSpan || !maxHpSpan || !plusButton) return;

  const hp = parseInt(hpSpan.textContent) || 0;
  const maxHp = parseInt(maxHpSpan.textContent) || Infinity;

  if (hp >= maxHp) {
    plusButton.disabled = true;
    plusButton.classList.add('disabled');
  } else {
    plusButton.disabled = false;
    plusButton.classList.remove('disabled');
  }
}


// --- Одна кнопка для сохранения всех полей колонки ---
document.querySelectorAll(".save-traits-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const character = btn.dataset.character;
    const dbRef = db.collection("characters").doc(character);

    const data = {
      traits: document.getElementById(`${character}-traits`).value,
      abilities: [],
      ideals: document.getElementById(`${character}-ideals`).value,
      bonds: document.getElementById(`${character}-bonds`).value,
      flaws: document.getElementById(`${character}-flaws`).value,
      languages: document.getElementById(`${character}-languages`).value
    };

    for (let i = 1; i <= 10; i++) {
      data.abilities.push(document.getElementById(`${character}-ability${i}`).value);
    }

    await dbRef.set(data, { merge: true });
    alert("Изменения сохранены!");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".save-inventory-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const character = btn.dataset.character;

      const inventoryText = document.getElementById(`${character}-inventory`).value;
      const gold = parseInt(document.getElementById(`${character}-gold`).value) || 0;
      const silver = parseInt(document.getElementById(`${character}-silver`).value) || 0;
      const copper = parseInt(document.getElementById(`${character}-copper`).value) || 0;

      try {
        await db.collection("characters").doc(character).set(
          {
            inventory: inventoryText,
            coins: { gold, silver, copper }
          },
          { merge: true }
        );
        alert("Инвентарь и монеты сохранены!");
      } catch (error) {
        console.error("Ошибка при сохранении инвентаря:", error);
        alert("Не удалось сохранить. Проверь консоль.");
      }
    });
// Загружаем данные из Firestore при старте
    const character = btn.dataset.character;
    db.collection("characters").doc(character).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();

        if (data.inventory) {
          document.getElementById(`${character}-inventory`).value = data.inventory;
        }

        if (data.coins) {
          document.getElementById(`${character}-gold`).value = data.coins.gold ?? 0;
          document.getElementById(`${character}-silver`).value = data.coins.silver ?? 0;
          document.getElementById(`${character}-copper`).value = data.coins.copper ?? 0;
        }
      }
    }).catch(error => console.error("Ошибка при загрузке данных:", error));
  });
});


// === Функция сохранения в Firestore ===
async function saveCharacterStat(target, newValue) {
  const [characterKey, ...rest] = target.split("-");
  const statKey = rest.join("-");
  const docIds = { lexa: "lexa", axel: "axel" };

  const statMap = {
    str: "Сила",
    dex: "Ловкость",
    con: "Телосложение",
    int: "Интеллект",
    wis: "Мудрость",
    cha: "Харизма",
    ac: "класс брони",
    initiative: "инициатива",
    speed: "скорость",
    hp: "хиты",
    "max-hp": "макс хиты",
    lvl: "Уровень",
    inspiration: "вдохновение",
    name: "имя",
    race: "раса",
    class: "класс"
  };

  const docId = docIds[characterKey];
  if (!docId) return;

  const docRef = db.collection("characters").doc(docId);
  const statName = statMap[statKey];

  if (statName) {
    await docRef.set(
      { stats: { [statName]: Number(newValue) } },
      { merge: true }
    );
    return;
  }

  const possibleSkill = statKey.replace(/-/g, " ");
  if (Object.keys(skillToStat).includes(possibleSkill)) {
    await docRef.set(
      { skills: { [possibleSkill]: Number(newValue) } },
      { merge: true }
    );
    return;
  }

  console.warn(`Неизвестный ключ: ${statKey}`);
}

// === Автозагрузка данных текстовых полей персонажей ===
async function loadTextFields(characterId, prefix) {
  const docRef = db.collection("characters").doc(characterId);
  const doc = await docRef.get();
  if (!doc.exists) return;

  const data = doc.data();

  // Черты характера
  if (data.traits) document.getElementById(`${prefix}-traits`).value = data.traits;

  // Идеалы, связи, недостатки, языки
  if (data.ideals) document.getElementById(`${prefix}-ideals`).value = data.ideals;
  if (data.bonds) document.getElementById(`${prefix}-bonds`).value = data.bonds;
  if (data.flaws) document.getElementById(`${prefix}-flaws`).value = data.flaws;
  if (data.languages) document.getElementById(`${prefix}-languages`).value = data.languages;

  // Умения (abilities)
  if (data.abilities) {
    data.abilities.forEach((val, index) => {
      const el = document.getElementById(`${prefix}-ability${index + 1}`);
      if (el) el.value = val;
    });
  }
}

// === Переключение вкладок ===
document.querySelectorAll('.input-btn').forEach(radio => {
  radio.addEventListener('change', async (e) => {
    if (e.target.id === 'lexa') {
      loadCharacterData('lexa', 'lexa');
      loadTextFields('lexa', 'lexa'); // <-- подтягиваем текстовые поля
      document.getElementById("lexa-info").style.display = 'flex';
      document.getElementById("axel-info").style.display = 'none';
    } else if (e.target.id === 'axel') {
      loadCharacterData('axel', 'axel');
      loadTextFields('axel', 'axel'); // <-- подтягиваем текстовые поля
      document.getElementById("axel-info").style.display = 'flex';
      document.getElementById("lexa-info").style.display = 'none';
    }
  });
});

// --- Инициализация при загрузке страницы ---
window.addEventListener('DOMContentLoaded', async () => {
  loadCharacterData('lexa', 'lexa');
  loadTextFields('lexa', 'lexa'); // <-- подтягиваем текстовые поля по умолчанию
  document.getElementById("lexa-info").style.display = 'flex';
  document.getElementById("axel-info").style.display = 'none';
});

// Инициализация по умолчанию
loadCharacterData('lexa', 'lexa');
document.getElementById("lexa-info").style.display = 'flex';
document.getElementById("axel-info").style.display = 'none';

// ==== Остальная часть кода (оверлей, броски кубиков, сохранение формул) оставлена без изменений ====



//+++++++++++++++++++++++++++++++++++++++++++++++++++++++Характеристики***************************************************************

// Функция для расчёта модификатора навыка
function calcSkillBonus(skillName, stats, startValue) {
  const baseStatName = skillToStat[skillName];
  if (!baseStatName || !stats[baseStatName]) return "(0)";
  
  const base = calcModifier(stats[baseStatName]);
  const total = base + PROF_BONUS + (startValue || 0);
  return total >= 0 ? `  (+${total})` : `  (${total})`;
}




//+++++++++++++++++++++++++++++++++++++++++++++++++++++++ОВЕРЛЕЙ***************************************************************
// Инициализация с Firebase (повторная инициализация)
firebase.initializeApp(firebaseConfig); 
//const db = firebase.firestore();  // Уже инициализировано выше
const RESULT_COLLECTION = "diceResults";  // Коллекция для результатов бросков
const RESULT_DOC = "currentResult";       // Документ с текущим результатом

const FORMULA_COLLECTION = "formulaHistory";  // Коллекция истории формул
const FORMULA_DOC = "lastFormulas";          // Документ с последними 8 формулами

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
  const modifierInput = document.getElementById("modifier").value;  // Получаем модификатор
  let modifier = parseInt(modifierInput) || 0;  // Преобразуем в число (по умолчанию 0)

  const roll = Math.floor(Math.random() * sides) + 1;  // Бросаем кость
  const finalResult = roll + modifier;  // Итоговый результат с модификатором

  const diceResultElement = document.getElementById("dice-result");

  // Изменяем цвет результата в зависимости от того, какой выпал результат
  if (roll === 1) diceResultElement.style.color = 'red';
  else if (roll === sides) diceResultElement.style.color = 'green';
  else diceResultElement.style.color = 'MediumVioletRed';

  diceResultElement.textContent = `${finalResult}`;  // Отображаем результат

  // Сохраняем результат в Firebase
  saveResultToFirebase(finalResult, diceResultElement.style.color);
}

// Функция для работы с произвольной формулой
function rollFormula() {
  const formulaInput = document.getElementById("formula").value;  // Получаем формулу
  const modifierInput = document.getElementById("modifier").value;  // Получаем модификатор

  let modifier = parseInt(modifierInput) || 0;  // Преобразуем модификатор в число

  let hitsMin = false;
  let hitsMax = false;

  // Замена D(число) на случайное значение кубика
  const formula = formulaInput.toUpperCase().replace(/D(\d+)/g, (match, sides) => {
    sides = parseInt(sides);
    const roll = Math.floor(Math.random() * sides) + 1;
    if (roll === 1) hitsMin = true;
    if (roll === sides) hitsMax = true;
    return roll;
  });

  let result;
  try {
    result = Math.max(1, Math.floor(eval(formula) + modifier)); // Вычисляем результат формулы
  } catch (e) {
    alert("Некорректная формула!"); // Ошибка при вычислении формулы
    return;
  }

  const diceResultElement = document.getElementById("dice-result");

  // Устанавливаем цвет в зависимости от минимального или максимального значения кубика
  if (hitsMin) diceResultElement.style.color = 'red';
  else if (hitsMax) diceResultElement.style.color = 'green';
  else diceResultElement.style.color = 'MediumVioletRed';

  diceResultElement.textContent = `${result}`;

  // сохраняем результат в Firebase
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

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++
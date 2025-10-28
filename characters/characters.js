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
let PROF_BONUS = 2; // начальное значение





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
	
	 // --- После полной загрузки данных: пересчитываем PROF_BONUS ---
    const level = stats["Уровень"];
    if (level >= 1 && level <= 4) PROF_BONUS = 2;
    else if (level >= 5 && level <= 8) PROF_BONUS = 3;
    else if (level >= 9 && level <= 12) PROF_BONUS = 4;
    else if (level >= 13 && level <= 16) PROF_BONUS = 5;
    else if (level >= 17 && level <= 20) PROF_BONUS = 6;

    console.log(`[PROF_BONUS] ${characterId}: уровень=${level}, PROF_BONUS=${PROF_BONUS}`);

	
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

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// --- Загрузка экипировки и умений (20 skills) ---
async function loadEquipment(characterId) {
  const prefix = characterId;
  try {
    const docRef = db.collection('characters').doc(prefix);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return;
    const data = docSnap.data();

    // Броня
    const armorEl = document.getElementById(`${prefix}-armor`);
    if (armorEl) armorEl.value = data.armor || '';

    // Два оружия
    for (let i = 1; i <= 2; i++) {
      if (data.weapons && data.weapons[`weapon${i}`]) {
        const weapon = data.weapons[`weapon${i}`];
        const wName = document.getElementById(`${prefix}-weapon${i}-name`);
        const wHit = document.getElementById(`${prefix}-weapon${i}-hit`);
        const wDmg = document.getElementById(`${prefix}-weapon${i}-dmg`);
		const wCrit = document.getElementById(`${prefix}-weapon${i}-crit`);
        if (wName) wName.value = weapon.name || '';
        if (wHit) wHit.value = weapon.hit || '';
        if (wDmg) wDmg.value = weapon.dmg || '';
		if (wCrit) wCrit.value = weapon.crit || '';
      }
    }

    // 20 навыков/способностей
    if (data.skills) {
      for (let i = 1; i <= 20; i++) {
        const skill = data.skills[`skill${i}`] || {};
        const sName = document.getElementById(`${prefix}-skill${i}-name`);
        const sFormula = document.getElementById(`${prefix}-skill${i}-formula`);
        if (sName) sName.value = skill.name || '';
        if (sFormula) sFormula.value = skill.formula || '';
      }
    }

    console.log(`[EQUIP] Loaded equipment for ${characterId}.`);
  } catch (err) {
    console.error(`[ERROR] Failed to load equipment for ${characterId}:`, err);
  }
}

// --- Сохранение экипировки и 20 навыков ---
async function saveEquipment(characterId) {
  const prefix = characterId;
  const data = {
    armor: '',
    weapons: {},
    skills: {}
  };

  // Броня
  const armorEl = document.getElementById(`${prefix}-armor`);
  if (armorEl) data.armor = armorEl.value;

  // Два оружия
  for (let i = 1; i <= 2; i++) {
    const wName = document.getElementById(`${prefix}-weapon${i}-name`);
    const wHit = document.getElementById(`${prefix}-weapon${i}-hit`);
    const wDmg = document.getElementById(`${prefix}-weapon${i}-dmg`);
	const wCrit = document.getElementById(`${prefix}-weapon${i}-crit`);
    data.weapons[`weapon${i}`] = {
      name: wName ? wName.value : '',
      hit: wHit ? wHit.value : '',
      dmg: wDmg ? wDmg.value : '',
	  crit: wCrit ? wCrit.value : ''
    };
  }

  // 20 навыков/способностей
  for (let i = 1; i <= 20; i++) {
    const sName = document.getElementById(`${prefix}-skill${i}-name`);
    const sFormula = document.getElementById(`${prefix}-skill${i}-formula`);
    data.skills[`skill${i}`] = {
      name: sName ? sName.value : '',
      formula: sFormula ? sFormula.value : ''
    };
  }

  try {
    await db.collection('characters').doc(prefix).set(data, { merge: true });
    alert(`Экипировка и навыки ${prefix} сохранены!`);
  } catch (err) {
    console.error(err);
    alert('Ошибка при сохранении');
  }
}

// --- Переключение вкладок ---
function activateTab(characterId) {
  const other = characterId === 'lexa' ? 'axel' : 'lexa';
  document.getElementById(`${characterId}-info`).style.display = 'flex';
  document.getElementById(`${other}-info`).style.display = 'none';
  loadEquipment(characterId);
}

// --- Инициализация после полной загрузки DOM ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lexa').addEventListener('change', () => activateTab('lexa'));
  document.getElementById('axel').addEventListener('change', () => activateTab('axel'));

  const btnLexa = document.getElementById('save-equipment-btn-lexa');
  if (btnLexa) btnLexa.addEventListener('click', () => saveEquipment('lexa'));

  const btnAxel = document.getElementById('save-equipment-btn-axel');
  if (btnAxel) btnAxel.addEventListener('click', () => saveEquipment('axel'));

  // По умолчанию активируем Лексу
  activateTab('lexa');
});




// === Обработчик кнопок dice ===
document.addEventListener("click", (e) => {
  // Проверяем, что клик был по кнопке с классом dice-btn
  if (e.target.classList.contains("dice-btn")) {
    const btn = e.target;
    const prevInput = btn.previousElementSibling; // ближайший input перед кнопкой

    if (!prevInput || prevInput.tagName !== "INPUT") {
      console.warn("Перед кнопкой нет input с формулой!");
      return;
    }

    const formula = prevInput.value.trim();
    if (!formula) {
      alert("Поле с формулой пустое!");
      return;
    }

    // Копируем в буфер обмена (опционально)
    navigator.clipboard.writeText(formula).catch(() => {
      console.warn("Не удалось скопировать в буфер — но это не критично.");
    });

    // Вставляем в общий input
    const formulaField = document.getElementById("formula");
    if (formulaField) {
      formulaField.value = formula;
    }

    // Нажимаем кнопку броска кубов
    const rollButton = document.querySelector("button[onclick='rollFormula()']");
    if (rollButton) {
      rollButton.click();
    } else {
      console.error("Кнопка броска не найдена!");
    }
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll('.skill-name');

  inputs.forEach(input => {
    input.addEventListener('mouseenter', () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'input-tooltip';
      tooltip.innerText = input.value;
      document.body.appendChild(tooltip);

      const rect = input.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.left = rect.left + window.scrollX + 'px';
      tooltip.style.top = rect.bottom + window.scrollY + 'px';
      tooltip.style.background = '#333';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '4px 8px';
      tooltip.style.borderRadius = '6px';
      tooltip.style.width = '500px';        // фиксированная ширина
      tooltip.style.whiteSpace = 'normal';  // перенос текста
      tooltip.style.wordBreak = 'break-word'; // перенос длинных слов
      tooltip.style.zIndex = 9999;

      input._tooltip = tooltip; // сохраняем ссылку
    });

    input.addEventListener('mouseleave', () => {
      if (input._tooltip) {
        input._tooltip.remove();
        input._tooltip = null;
      }
    });
  });
});




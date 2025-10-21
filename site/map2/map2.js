// === Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyA3FGHftCkHCQaZgIjr30Ts9Xg-oWe1XJ8",
  authDomain: "dndcompain-175ed.firebaseapp.com",
  projectId: "dndcompain-175ed",
  storageBucket: "dndcompain-175ed.firebasestorage.app",
  messagingSenderId: "1051977600043",
  appId: "1:1051977600043:web:e43829b20b2127848f6e6e"
};

const mapInner = document.getElementById('map-inner');
const mapArea = document.getElementById('map-area2');
//mapInner.style.transformOrigin = "50% 50%";
let currentTranslateX = 0;
let currentTranslateY = 0;
let currentScale = 1;


mapInner.addEventListener('dragstart', e => e.preventDefault());

let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let scale = 1;

mapInner.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  isDragging = true;
  startX = e.clientX - translateX;
  startY = e.clientY - translateY;
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  translateX = e.clientX - startX;
  translateY = e.clientY - startY;
  mapInner.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  //updateIconsPosition(translateX, translateY);
});

window.addEventListener('mouseup', e => {
  if (!isDragging) return;
  isDragging = false;
});

// Функция для изменения масштаба
function zoomMap(factor) {
  const rect = mapArea.getBoundingClientRect();

  // Центр контейнера
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Преобразуем центр контейнера в координаты карты (до масштабирования)
  const mapX = (centerX - translateX) / scale;
  const mapY = (centerY - translateY) / scale;

  // Новый масштаб
  const newScale = Math.min(Math.max(0.5, scale * factor), 3);

  // После масштабирования пересчитываем смещение, чтобы "центр оставался на месте"
  translateX = centerX - mapX * newScale;
  translateY = centerY - mapY * newScale;

  // Применяем трансформацию
  mapInner.style.transform = `translate(${translateX}px, ${translateY}px) scale(${newScale})`;

  // Сохраняем текущее состояние
  scale = newScale;
}




// Обновление позиций иконок
function updateIconsPosition(dx, dy) {
  document.querySelectorAll('.map-icon').forEach(icon => {
    const iconX = parseFloat(icon.style.left) + dx;
    const iconY = parseFloat(icon.style.top) + dy;
    icon.style.left = `${iconX}px`;
    icon.style.top = `${iconY}px`;
  });
}

// Функция для создания иконки
function renderIcon(id, data) {
  let icon = document.querySelector(`.map-icon[data-id="${id}"]`);
  if (!icon) {
    icon = document.createElement('img');
    icon.src = `../images/${data.type}.png`;
    icon.classList.add('map-icon');
    icon.dataset.id = id;

    icon.addEventListener('contextmenu', async e => {
      e.preventDefault();
      if (confirm('Удалить значок?')) {
        await db.collection(COLLECTION_NAME).doc(id).delete();
      }
    });

    mapInner.appendChild(icon);
    makeIconDraggable(icon); // Делаем иконку перетаскиваемой
  }

  // Позиция с учётом текущего масштаба и сдвига карты
  const transform = mapInner.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
  const mapTranslateX = transform ? parseFloat(transform[1]) : 0;
  const mapTranslateY = transform ? parseFloat(transform[2]) : 0;

  icon.style.left = `${data.relX * 100}%`;
  icon.style.top = `${data.relY * 100}%`;
}

// Сделать иконку перетаскиваемой
function makeIconDraggable(icon) {
  let isDraggingIcon = false;
  let offsetX, offsetY;

  icon.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    isDraggingIcon = true;

    const rect = mapInner.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();

    // Смещение курсора внутри иконки
    offsetX = (e.clientX - iconRect.left) / scale;
    offsetY = (e.clientY - iconRect.top) / scale;
  });

  window.addEventListener('mousemove', e => {
    if (!isDraggingIcon) return;

    const rect = mapArea.getBoundingClientRect();

    // Координаты мыши относительно карты, с учётом смещения и масштаба
    const mouseX = (e.clientX - rect.left - translateX) / scale;
    const mouseY = (e.clientY - rect.top - translateY) / scale;

    // Обновляем позицию иконки в процентах
    const relX = (mouseX - offsetX) / rect.width;
    const relY = (mouseY - offsetY) / rect.height;

    icon.style.left = `${relX * 100}%`;
    icon.style.top = `${relY * 100}%`;
  });

  window.addEventListener('mouseup', async () => {
    if (!isDraggingIcon) return;
    isDraggingIcon = false;

    const relX = parseFloat(icon.style.left) / 100;
    const relY = parseFloat(icon.style.top) / 100;

    await db.collection(COLLECTION_NAME).doc(icon.dataset.id).update({ relX, relY });
  });
}



// === Синхронизация с Firestore ===
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLLECTION_NAME = "mapIcons2";
const SETTINGS_COLLECTION = "settings";
const mapDoc = db.collection(SETTINGS_COLLECTION).doc("currentMap2");

const mapImage = document.getElementById("map-image");
const mapUrlInput = document.getElementById("map-url-input");
const updateMapBtn = document.getElementById("update-map-btn");

mapDoc.onSnapshot(doc => {
  if (doc.exists) {
    const data = doc.data();
    if (data.image) {
      mapImage.src = data.image;
    }
  }
});

updateMapBtn.addEventListener("click", async () => {
  const newUrl = mapUrlInput.value.trim();
  if (!newUrl) {
    alert("Вставь ссылку на картинку!");
    return;
  }
  try {
    await mapDoc.set({ image: newUrl });
    mapUrlInput.value = "";
    alert("Карта обновлена!");
  } catch (err) {
    console.error(err);
    alert("Ошибка обновления карты.");
  }
});

// === Обработка перетаскивания иконок на карту ===
let draggedType = null;
let draggedIconId = null;

document.addEventListener('dragstart', e => {
  if (e.target.classList.contains('draggable-icon')) {
    draggedType = e.target.dataset.type;
    draggedIconId = null;
  } else if (e.target.classList.contains('map-icon')) {
    draggedIconId = e.target.dataset.id;
    draggedType = null;
  }
});

async function dropIcon(e) { //работает
  e.preventDefault();
  e.stopPropagation(); // предотвращаем "всплытие" события
  console.log('dropIcon triggered', draggedType, draggedIconId);
  const mapArea = document.getElementById('map-area2');
  const mapInner = document.getElementById('map-inner');
  if (!mapArea || !mapInner) return;

  const rect = mapArea.getBoundingClientRect();
  
  // Получаем координаты мыши относительно всего окна
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // Получаем трансформацию карты
  const transform = window.getComputedStyle(mapInner).transform;
  const scaleMatch = transform.match(/matrix\((.*)\)/);
  let scaleX = 1, scaleY = 1;
  
  if (scaleMatch) {
    const matrix = scaleMatch[1].split(', ');
    scaleX = parseFloat(matrix[0]); // масштаб по оси X
    scaleY = parseFloat(matrix[3]); // масштаб по оси Y
  }

  // Получаем смещение карты (translateX, translateY)
  const translateX = parseFloat(transform.split(',')[4]) || 0;
  const translateY = parseFloat(transform.split(',')[5]) || 0;

  // Вычисляем координаты мыши относительно центра карты
  const relX = (mouseX - rect.left - translateX) / (rect.width * scaleX);
  const relY = (mouseY - rect.top - translateY) / (rect.height * scaleY);

  console.log(`Drop coordinates: {relX: ${relX}, relY: ${relY}}`);

  // Проверяем на наличие иконки с такими координатами в базе данных
  const snapshot = await db.collection(COLLECTION_NAME)
    .where("relX", "==", relX)
    .where("relY", "==", relY)
    .get();

  if (snapshot.empty) {
    // Если нет иконки с такими координатами, добавляем новую
    if (draggedType) {
      await db.collection(COLLECTION_NAME).add({ type: draggedType, relX, relY });
    }
  } else {
    // Если иконка с такими координатами уже есть, обновляем её
    const docId = snapshot.docs[0].id;
    await db.collection(COLLECTION_NAME).doc(docId).update({ relX, relY });
  }

  draggedType = null;
  draggedIconId = null;
}


// === Слушаем изменения в Firestore и обновляем иконки ===
db.collection(COLLECTION_NAME).onSnapshot(snapshot => {
  clearIcons();
  snapshot.forEach(doc => renderIcon(doc.id, doc.data()));
});

window.addEventListener('resize', () => {
  db.collection(COLLECTION_NAME).get().then(snapshot => {
    clearIcons();
    snapshot.forEach(doc => renderIcon(doc.id, doc.data()));
  });
});

function clearIcons() {
  document.querySelectorAll('.map-icon').forEach(el => el.remove());
}

mapArea.addEventListener('drop', dropIcon);
mapArea.addEventListener('dragover', allowDrop);

function allowDrop(e) {
  e.preventDefault();
}


//++++++++ОВЕРЛЕЙ********
firebase.initializeApp(firebaseConfig);
//const db = firebase.firestore();
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
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++
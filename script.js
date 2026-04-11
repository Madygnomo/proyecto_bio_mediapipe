import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const displayContent = document.getElementById("displayContent");
const uiCanvas = document.getElementById("ui_canvas");
const uiCtx = uiCanvas.getContext("2d");


let handLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;
let isPurpleEffectActive = false; 
let isTvEffectActive = false;     
let isVhsEffectActive = false;    
let lastClickTime = 0;

const baseDocumentText = "This Indenture made the thirteenth day of December One Thousand and eight hundred and thirty eight... system error detected... network breached.";
let currentTextMode = 'normal';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('document-text').textContent = baseDocumentText;
});

// Cargar imagen personalizada para el dedo índice
const customFingerImage = new Image();
customFingerImage.src = './assets/Cursor_Key.png';

// Botones interactivos
// MODIFICADO: Recuperar el botón del gato
const interactiveButtons = [
  {
    id: 'cat-polaroid',
    x: 170, 
    y: 30, 
    width: 100, 
    height: 100, 
    image: './assets/boton1.png',
    action: 'ACTIVATE_LOOP'
  },
  { 
    id: 'cd-player',
    x: 50, // Ajustado a la mitad del costado derecho
    y: 360, // Ajustado a la mitad del costado derecho
    width: 80, 
    height: 80, 
    image: './assets/boton3.png', 
    action: 'RESTART_MIX' // Acción para el CD
  },
  { // NUEVO: Botón del teléfono para efecto VHS
    id: 'kurodenwa-m1',
    x: 50, // Posición de ejemplo (ajusta según tu diseño)
    y: 5, // Posición de ejemplo (ajusta según tu diseño)
    width: 88,
    height: 114,
    image: './assets/kurodenwa-m1.gif', // Asegúrate de tener este asset
    action: 'TOGGLE_VHS_EFFECT'
  },
  { // BOTON OJO
    id: 'OJO',
    x: 50, // Posición de ejemplo (ajusta según tu diseño)
    y: 140, // Posición de ejemplo (ajusta según tu diseño)
    width: 75,
    height: 75,
    image: './assets/OJO.png', // Asegúrate de tener este asset
    action: 'TOGGLE_PURPLE_EFFECT' // Eye handles Purple
  },
  { // BOTON CORAZON
    id: 'boton2',
    x: 50, // Posición de ejemplo (ajusta según tu diseño)
    y: 240, // Posición de ejemplo (ajusta según tu diseño)
    width: 80,
    height: 80,
    image: './assets/boton2.png', // Asegúrate de tener este asset
    action: 'TOGGLE_TV_EFFECT' // Heart handles TV Glitch
  }
];

// Precargar imágenes de los botones
const buttonImages = {};
interactiveButtons.forEach(btn => {
  if (btn.image) {
    const img = new Image();
    img.src = btn.image;
    buttonImages[btn.image] = img;
  }
});

// Definir HAND_CONNECTIONS
const HAND_CONNECTIONS = [
  {start: 0, end: 1}, {start: 1, end: 2}, {start: 2, end: 3}, {start: 3, end: 4},
  {start: 0, end: 5}, {start: 5, end: 6}, {start: 6, end: 7}, {start: 7, end: 8},
  {start: 5, end: 9}, {start: 9, end: 10}, {start: 10, end: 11}, {start: 11, end: 12},
  {start: 9, end: 13}, {start: 13, end: 14}, {start: 14, end: 15}, {start: 15, end: 16},
  {start: 13, end: 17}, {start: 0, end: 17}, {start: 17, end: 18}, {start: 18, end: 19}, {start: 19, end: 20}
];

// Función para dibujar los botones interactivos
function drawButtons(ctx, screenWidth, screenHeight) {
  interactiveButtons.forEach(btn => {
    const scaledBtn = {
      x: (btn.x / 640) * screenWidth,
      y: (btn.y / 480) * screenHeight,
      width: (btn.width / 640) * screenWidth,
      height: (btn.height / 480) * screenHeight
    };

    if (btn.image && buttonImages[btn.image]) {
      ctx.drawImage(buttonImages[btn.image], scaledBtn.x, scaledBtn.y, scaledBtn.width, scaledBtn.height);
    }
  });
}

// --- MODIFIED: Cursor Logic ---
function updateDOMCursor(landmarks) {
  const indexFingerTip = landmarks[8];
  if (!indexFingerTip) return;

  const cursor = document.getElementById('super-cursor');
  if (!cursor) return;

  // Invertimos X para alinear el DOM con el modo espejo de la cámara
  const x = (1 - indexFingerTip.x) * window.innerWidth;
  const y = indexFingerTip.y * window.innerHeight;
  
  // Apply coordinates to the HTML element
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
}

// --- NEW: HTML Collision Detection ---
function checkHTMLCollision(fingerX, fingerY) {
  const hotspots = [
      { id: 'hotspot-hongo', action: 'MODE_HONGO' },
      { id: 'hotspot-nya', action: 'MODE_NYA' },
      { id: 'hotspot-byte-an', action: 'MODE_BYTE' },
      { id: 'hotspot-aqua', action: 'MODE_AQUA' }
  ];

  const now = Date.now();
  if (now - lastClickTime < 1000) return; // Debounce clicks

  hotspots.forEach(spot => {
      const el = document.getElementById(spot.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      
      if (fingerX > rect.left && fingerX < rect.right && fingerY > rect.top && fingerY < rect.bottom) {
          lastClickTime = now;
          handleInteraction(spot.action);
          
          // Optional: Visual feedback on the canvas for clicking HTML elements
          showClickFeedback({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, uiCtx);
      }
  });
}

// Función para detectar colisiones
function checkButtonCollision(landmarks, screenWidth, screenHeight) {
  const indexFingerTip = landmarks[8];
  if (!indexFingerTip) return;

  const fingerX = (1 - indexFingerTip.x) * screenWidth; // Invertimos X de verdad para el modo espejo
  const fingerY = indexFingerTip.y * screenHeight;

  interactiveButtons.forEach((btn) => {
    let scaledBtn;

    if (btn.isAlert) {
      // Para las alertas, las coordenadas ya son absolutas de la pantalla, no necesitan escalado
      scaledBtn = {
        x: btn.x,
        y: btn.y,
        width: btn.width,
        height: btn.height
      };
    } else {
      // Para los botones normales, escalamos desde la resolución base (640x480)
      scaledBtn = {
        x: (btn.x / 640) * screenWidth,
        y: (btn.y / 480) * screenHeight,
        width: (btn.width / 640) * screenWidth,
        height: (btn.height / 480) * screenHeight
      };
    }

    if (
      fingerX > scaledBtn.x &&
      fingerX < scaledBtn.x + scaledBtn.width &&
      fingerY > scaledBtn.y &&
      fingerY < scaledBtn.y + scaledBtn.height
    ) {
      const now = Date.now();
      if (now - lastClickTime > 1000) {
        lastClickTime = now;
        if (btn.isAlert) {
            // Si es una alerta, la cerramos
            // Efecto visual: la ventana se cierra al "tocarla"
            btn.element.style.transition = "transform 0.2s ease-out"; // Transición suave
            btn.element.style.transform = "scale(0.9)";
            setTimeout(() => {
                btn.element.remove();
                // Limpiar el array para que no siga detectando algo que ya no existe
                const idx = interactiveButtons.indexOf(btn);
                if (idx > -1) {
                    interactiveButtons.splice(idx, 1);
                }
            }, 200);
        } else {
            // Si tiene una acción, la ejecutamos
            if (btn.action) { 
              handleInteraction(btn.action);
            }
            // Si tiene un link, mostramos el contenido
            if (btn.link) {
              displayButtonContent(btn.link);
            }
            showClickFeedback(scaledBtn, uiCtx); // Mostramos feedback visual
        }
      }
    }
  });

  // NEW: Check HTML Hotspots
  checkHTMLCollision(fingerX, fingerY);
}

// Función para mostrar contenido
function displayButtonContent(url) {
  displayContent.innerHTML = '';
  
  const ext = url.toLowerCase().split('.').pop();
  
  if (['gif', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => {
      displayContent.appendChild(img);
      displayContent.style.display = 'block';
    };
  }
  
  setTimeout(() => {
    displayContent.style.display = 'none';
  }, 5000);
}

// Feedback visual
function showClickFeedback(btn, ctx) { // Acepta el contexto como argumento
  ctx.strokeStyle = "#FFD700"; // Color del feedback
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.7;
  
  const centerX = btn.x + btn.width / 2;
  const centerY = btn.y + btn.height / 2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, btn.width / 2 + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

// NUEVO: Funciones para gestionar los efectos visuales de la cámara

// NEW: Clean State Reset
function clearAllVideoEffects() {
  const wrapper = document.getElementById('video-effects-wrapper');
  if (wrapper) {
    wrapper.className = 'effects-wrapper'; // Resets to base class, stripping effects
  }
  isPurpleEffectActive = false;
  isTvEffectActive = false;
  isVhsEffectActive = false;
}

// Crear HandLandmarker
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
  console.log("HandLandmarker cargado correctamente");
  enableCam();
};

createHandLandmarker();

// Enable webcam
function enableCam() {
  if (!handLandmarker) {
    console.log("Wait! handLandmarker not loaded yet.");
    return;
  }

  webcamRunning = true;
  const constraints = { video: true };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  }).catch((error) => {
    console.error("Error al acceder a la cámara:", error);
  });
}

function resizeCanvas() {
  uiCanvas.width = window.innerWidth; // El uiCanvas ocupa toda la pantalla
  uiCanvas.height = window.innerHeight; // El uiCanvas ocupa toda la pantalla
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Llamado inicial

let lastVideoTime = -1;
let results = undefined;
let animationFrameId; // Para controlar el requestAnimationFrame

async function predictWebcam() {
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
  }

  // Limpiamos ambos canvas
  canvasCtx.save(); // Guarda el estado actual del canvas
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // Limpia el canvas
  
  uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      // 1. Dibujamos las líneas verdes en la pantallita del PC
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 5
      });
      
      // 2. Actualizamos el cursor DOM y validamos colisiones en pantalla completa
      updateDOMCursor(landmarks);
      checkButtonCollision(landmarks, uiCanvas.width, uiCanvas.height);
    }
  }

  // Dibujamos los botones en el canvas de interfaz global
  drawButtons(uiCtx, uiCanvas.width, uiCanvas.height);
  canvasCtx.restore();

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

// Array de mensajes personalizados para tu narrativa
const alertMessages = [
  "To take back your mind, you have to humble your heart.",
  "System failure: Too much nostalgia detected.",
  "Error: Reality.exe is not responding.",
  "Lions & lizards & lies are watching you."
];

function spawnAlert() {
  const alert = document.createElement('div');
  alert.className = 'win98-alert';
  
  // Posición aleatoria
  // Aseguramos que la alerta no se salga de los límites de la ventana
  const alertWidth = 300; // Ancho aproximado de la alerta
  const alertHeight = 200; // Alto aproximado de la alerta
  const posX = Math.random() * (window.innerWidth - alertWidth);
  const posY = Math.random() * (window.innerHeight - alertHeight);
  alert.style.left = `${posX}px`;
  alert.style.top = `${posY}px`;

  const message = alertMessages[Math.floor(Math.random() * alertMessages.length)];

  alert.innerHTML = `
    <div class="win98-header">
      <span>lions & lizards & lies</span>
      <button onclick="this.parentElement.parentElement.remove()" style="width:16px; height:14px; font-size:9px;">X</button>
    </div>
    <div class="win98-content">
      <img src="./assets/warning_icon.png" width="32">
      <p>${message}</p>
    </div>
    <div style="text-align: center; padding-bottom: 10px;">
       <button onclick="this.parentElement.parentElement.remove()" style="padding: 2px 20px; border: 1px solid black;">OK</button>
    </div>
  `;

  document.body.appendChild(alert);

  // Obtener las dimensiones reales después de insertarla
  // Es importante hacerlo DESPUÉS de que el elemento esté en el DOM
  const rect = alert.getBoundingClientRect();
  
  // Añadir la alerta a la lista de colisiones
  const alertBtn = {
    id: `alert-${Date.now()}`, // ID único para la alerta
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    isAlert: true, // Marcador para identificar que es una alerta
    element: alert // Guardamos la referencia al div para poder manipularlo
  };
  interactiveButtons.push(alertBtn);
}

// Función para manejar interacciones específicas de botones
function handleInteraction(action) {
  const contentText = document.getElementById('document-text');
  const contentArea = document.getElementById('content-area');
  const gnome = document.getElementById('gnome-img');
  const gato = document.getElementById('gato-img');
  const byte = document.getElementById('byte-img');

  const resetEffects = () => {
      if (gnome) gnome.style.display = 'none';
      if (gato) gato.style.display = 'none';
      if (byte) byte.style.display = 'none';
      if (contentArea) contentArea.classList.remove('mode-hongo', 'mode-nya', 'mode-ascii', 'mode-scrambled');
      if (contentText) contentText.textContent = baseDocumentText;
  };

  const wrapper = document.getElementById('video-effects-wrapper');

  if (action === 'ACTIVATE_LOOP') {
    const loopImg = document.getElementById('loop-asset');
    if (loopImg) {
      loopImg.style.display = 'block'; // Aparece y se queda ahí para siempre
      console.log("Manifesto cargado: El hilo de la existencia está en loop.");
    }
  } else if (action === 'RESTART_MIX') { // Esta acción ya no hará nada sin el reproductor de YouTube
    console.log("Acción 'RESTART_MIX' detectada, pero el reproductor de YouTube ha sido eliminado.");
  } else if (action === 'TOGGLE_VHS_EFFECT') {
      if (isVhsEffectActive) { 
          clearAllVideoEffects(); 
      } else { 
          clearAllVideoEffects(); 
          if (wrapper) wrapper.classList.add('vhs-effect'); 
          isVhsEffectActive = true; 
      }
  } else if (action === 'TOGGLE_PURPLE_EFFECT') {
      if (isPurpleEffectActive) { 
          clearAllVideoEffects(); 
      } else { 
          clearAllVideoEffects(); 
          if (wrapper) wrapper.classList.add('purple-effect'); 
          isPurpleEffectActive = true; 
      }
  } else if (action === 'TOGGLE_TV_EFFECT') {
      if (isTvEffectActive) { 
          clearAllVideoEffects(); 
      } else { 
          clearAllVideoEffects(); 
          if (wrapper) wrapper.classList.add('tv-effect'); 
          isTvEffectActive = true; 
      }
  } else if (action === 'MODE_HONGO') {
      if (currentTextMode === 'hongo') { resetEffects(); currentTextMode = 'normal'; return; }
      resetEffects();
      if (gnome) gnome.style.display = 'block';
      if (contentArea) contentArea.classList.add('mode-hongo');
      const emojiMap = {'a': '🍄', 'e': '🌲', 'i': '🧔', 'o': '🍄', 'u': '🌲'};
      if (contentText) contentText.textContent = baseDocumentText.split('').map(char => emojiMap[char.toLowerCase()] || char).join('');
      currentTextMode = 'hongo';
  } else if (action === 'MODE_NYA') {
      if (currentTextMode === 'nya') { resetEffects(); currentTextMode = 'normal'; return; }
      resetEffects();
      if (gato) gato.style.display = 'block';
      if (contentArea) contentArea.classList.add('mode-nya');
      if (contentText) contentText.textContent = Array(30).fill('NYAAAAS').join(' ');
      currentTextMode = 'nya';
  } else if (action === 'MODE_BYTE') {
      if (currentTextMode === 'byte') { resetEffects(); currentTextMode = 'normal'; return; }
      resetEffects();
      if (byte) byte.style.display = 'block';
      if (contentArea) contentArea.classList.add('mode-scrambled');
      const words = baseDocumentText.split(' ');
      if (contentText) contentText.textContent = words.map(word => word.split('').sort(() => 0.5 - Math.random()).join('')).join(' ');
      currentTextMode = 'byte';
  } else if (action === 'MODE_AQUA') {
      if (currentTextMode === 'aqua') { resetEffects(); currentTextMode = 'normal'; return; }
      resetEffects();
      if (contentArea) contentArea.classList.add('mode-ascii');
      const asciiChars = "+-@#%~><./;[]*^&{}";
      if (contentText) contentText.textContent = baseDocumentText.split('').map(() => asciiChars[Math.floor(Math.random() * asciiChars.length)]).join('');
      currentTextMode = 'aqua';
  }
}

// Lógica para inicializar los corazones y añadir sus event listeners
// Esta función debería ser llamada una vez, por ejemplo, en DOMContentLoaded
function setupHeartListeners() {
  heartElements.forEach((heartEl, index) => {
    // Asegúrate de que 'hearts' tenga elementos correspondientes a 'heartElements'
    const heart = hearts[index];
    if (!heart) return; // Evitar errores si hearts no está sincronizado con heartElements

    heartEl.addEventListener('click', () => {
      playHeartAnimation(heartEl, heart.effect);

      if (index === 0) { // Purple effect
        if (isPurpleEffectActive) { clearAllVideoEffects(); } else { applyEffect('purple'); }
      }

      if (index === 1) { // TV Glitch effect
        if (isTvEffectActive) { clearAllVideoEffects(); } else { applyEffect('tv-glitch'); }
      }
      // Añadir más efectos para otros corazones si es necesario
    });
  });
}

// Llama a esta función cuando el DOM esté completamente cargado
// document.addEventListener('DOMContentLoaded', setupHeartListeners); // Descomentar cuando heartElements esté poblado

// Intervalo aleatorio entre 15 y 30 segundos
function startAlertTimer() {
  const minInterval = 15000; // 15 segundos
  const maxInterval = 30000; // 30 segundos
  const nextAlertIn = Math.random() * (maxInterval - minInterval) + minInterval;
  setTimeout(() => {
    spawnAlert();
    startAlertTimer(); // Reinicia el ciclo
  }, nextAlertIn);
}

// Iniciar al cargar el script
startAlertTimer();

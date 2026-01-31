// Speech Recognition Setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = false;
recognition.interimResults = false;

// Voice mapping for different roles using Web Speech API
// These will be matched with available browser voices
const voicePreferences = {
    Mother: { gender: "female", name: ["Google US English Female", "Microsoft Zira", "Samantha", "Victoria"], pitch: 1.1, rate: 0.95 },
    Father: { gender: "male", name: ["Google US English Male", "Microsoft David", "Alex", "Daniel"], pitch: 0.85, rate: 0.9 },
    Brother: { gender: "male", name: ["Google UK English Male", "Microsoft Mark", "Fred", "Oliver"], pitch: 1.0, rate: 1.1 },
    Girlfriend: { gender: "female", name: ["Google UK English Female", "Microsoft Hazel", "Karen", "Fiona"], pitch: 1.15, rate: 1.0 },
    Friend: { gender: "male", name: ["Google US English Male", "Microsoft David", "Tom", "Daniel"], pitch: 1.0, rate: 1.05 }
};

// Role prompts for AI responses
const rolePrompts = {
    Mother: "Answer as if you are my Mother. Speak with love and warmth. Don't use * and specialize keyword.",
    Father: "Answer as if you are my Father. Be wise and caring. Don't use * and specialize keyword.",
    Brother: "Answer as if you are my Brother. Be friendly and humorous. Don't use * and specialize keyword.",
    Girlfriend: "Answer as if you are my Girlfriend. Be romantic and affectionate. Don't use * and specialize keyword.",
    Friend: "Answer as if you are my Friend. Be casual and supportive. Don't use * and specialize keyword."
};

// Global variables
let selectedRole = "Mother";
let isListening = false;
let currentAudio = null;
let availableVoices = [];
let speechSynthesis = window.speechSynthesis;

// Load available voices
function loadVoices() {
    availableVoices = speechSynthesis.getVoices();
    console.log("Available voices:", availableVoices.map(v => v.name));
}

// Load voices on page load and when they change
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// DOM elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const chatArea = document.getElementById("chatArea");
const status = document.getElementById("status");
const roleCards = document.querySelectorAll(".role-card");

// Role selection functionality
roleCards.forEach(card => {
    card.addEventListener("click", () => {
        // Remove selected class from all cards
        roleCards.forEach(c => c.classList.remove("selected"));
        // Add selected class to clicked card
        card.classList.add("selected");
        // Update selected role
        selectedRole = card.dataset.role;

        // Update chat area to show selected person
        if (chatArea.children.length === 1 && chatArea.children[0].style.textAlign === "center") {
            chatArea.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    You're now chatting with your ${selectedRole}. Click "Start Listening" to begin!
                </div>
            `;
        }
    });
});

// Button event listeners
startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);
clearBtn.addEventListener("click", clearChat);

// Speech recognition event handlers
recognition.onstart = () => {
    isListening = true;
    updateUI("listening", "🎤 Listening... Speak now!");
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    addMessage(transcript, "user");
    processTranscript(transcript);
};

recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    updateUI("error", `❌ Error: ${event.error}`);
    resetUI();
};

recognition.onend = () => {
    isListening = false;
    if (!status.textContent.includes("Processing")) {
        resetUI();
    }
};

function startListening() {
    if (!isListening) {
        recognition.start();
    }
}

function stopListening() {
    if (isListening) {
        recognition.stop();
    }
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    resetUI();
}

function clearChat() {
    chatArea.innerHTML = `
        <div style="text-align: center; color: #666; padding: 40px;">
            Chat cleared! You're chatting with your ${selectedRole}. Click "Start Listening" to begin!
        </div>
    `;
}

function addMessage(text, sender) {
    // Remove placeholder text if it exists
    if (chatArea.children.length === 1 && chatArea.children[0].style.textAlign === "center") {
        chatArea.innerHTML = "";
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.textContent = text;
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function updateUI(state, message) {
    status.className = `status ${state}`;
    status.textContent = message;
    status.classList.remove("hidden");

    switch (state) {
        case "listening":
            startBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.classList.add("pulse");
            break;
        case "processing":
            startBtn.disabled = true;
            stopBtn.disabled = false;
            break;
        case "speaking":
            startBtn.disabled = true;
            stopBtn.disabled = false;
            break;
    }
}

function resetUI() {
    status.classList.add("hidden");
    startBtn.disabled = false;
    stopBtn.disabled = true;
    startBtn.classList.remove("pulse");
}




async function processTranscript(transcript) {
  updateUI("processing", "🤔 Thinking...");

  try {
    const response = await fetch("/.netlify/functions/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: transcript,
        rolePrompt: rolePrompts[selectedRole]
      })
    });

    const data = await response.json();
    const reply = data.reply;

    if (!reply) throw new Error("Empty Gemini reply");

    addMessage(reply, "ai");
    await speak(reply);

  } catch (err) {
    console.error("Gemini error:", err);
    updateUI("error", "❌ AI failed");
    setTimeout(resetUI, 2000);
  }
}







// Function to select the best voice for the role
function selectVoiceForRole(role) {
    const preferences = voicePreferences[role];
    
    // Try to find a voice by name preference
    for (let preferredName of preferences.name) {
        const voice = availableVoices.find(v => v.name.includes(preferredName));
        if (voice) return voice;
    }
    
    // Fallback: find any voice matching the gender
    const genderVoice = availableVoices.find(v => 
        v.name.toLowerCase().includes(preferences.gender) ||
        (preferences.gender === "female" && (v.name.includes("Female") || v.name.includes("woman"))) ||
        (preferences.gender === "male" && (v.name.includes("Male") || v.name.includes("man")))
    );
    
    if (genderVoice) return genderVoice;
    
    // Last fallback: use default voice
    return availableVoices[0];
}

// FREE Text-to-Speech using Web Speech API
async function speak(text) {
    updateUI("speaking", "🔊 Speaking...");
    
    // Cancel any ongoing speech
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    return new Promise((resolve, reject) => {
        // Ensure voices are loaded
        if (availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const preferences = voicePreferences[selectedRole];
        
        // Select and set the voice
        const selectedVoice = selectVoiceForRole(selectedRole);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`Using voice: ${selectedVoice.name} for ${selectedRole}`);
        }
        
        // Set voice characteristics based on role
        utterance.pitch = preferences.pitch;
        utterance.rate = preferences.rate;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
            resetUI();
            resolve();
        };
        
        utterance.onerror = (error) => {
            console.error("Speech synthesis error:", error);
            updateUI("error", "❌ Speech error");
            setTimeout(resetUI, 2000);
            reject(error);
        };
        
        speechSynthesis.speak(utterance);
    });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
    console.log("Voice Chat App loaded successfully!");
    
    // Display available voices for debugging
    setTimeout(() => {
        if (availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }
        console.log(`${availableVoices.length} voices available:`, availableVoices.map(v => v.name));
    }, 1000);
});

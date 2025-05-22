
        // Speech Recognition Setup
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        // Voice mapping for different roles
        const voiceMap = {
            Mother: "EXAVITQu4vr4xnSDxMaL",
            Father: "pNInz6obpgDQGcFmaJgB",
            Brother: "TxGEqnHWrfWFTfGW9XjX",
            Girlfriend: "EXAVITQu4vr4xnSDxMaL",
            Friend: "MF3mGyEYCl7XYWbV9V6O"
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
        let selectedVoice = voiceMap[selectedRole];
        let isListening = false;
        let currentAudio = null;

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
                selectedVoice = voiceMap[selectedRole];
                
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
            updateUI("error", "❌ Error: " + event.error);
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
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
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
            updateUI("processing", "🤔 Processing your message...");

            const API_KEY = "AIzaSyDvIKP0qJn-ru5fvv_uiu2RmYy10D8qKSg";
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

            const requestBody = {
                contents: [{
                    parts: [
                        { text: rolePrompts[selectedRole] },
                        { text: transcript }
                    ]
                }],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 100
                }
            };

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (reply) {
                    addMessage(reply, "ai");
                    await speak(reply);
                } else {
                    updateUI("error", "❌ No response received");
                    setTimeout(resetUI, 2000);
                }
            } catch (error) {
                console.error("API error:", error);
                updateUI("error", "❌ Connection error");
                setTimeout(resetUI, 2000);
            }
        }

        async function speak(text) {
            updateUI("speaking", "🔊 Speaking...");

            const apiKey = "sk_700eb1e05ef8f397a40dbd13cf7c5d8d349ba48d9ca6f6e6";
            
            try {
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
                    method: "POST",
                    headers: {
                        "xi-api-key": apiKey,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_monolingual_v1",
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.5
                        }
                    })
                });

                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                currentAudio = new Audio(audioUrl);
                
                currentAudio.onended = () => {
                    resetUI();
                    currentAudio = null;
                };
                
                await currentAudio.play();
            } catch (error) {
                console.error("Speech synthesis error:", error);
                updateUI("error", "❌ Speech error");
                setTimeout(resetUI, 2000);
            }
        }

        // Initialize the app
        document.addEventListener("DOMContentLoaded", () => {
            console.log("Voice Chat App loaded successfully!");
        });
    
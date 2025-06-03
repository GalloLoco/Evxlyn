// ===== ARCHIVO: javascript/voiceExperience.js =====
// Clase principal para la experiencia de voz de Evelyn

class EvelynVoiceExperience {
    constructor() {
        this.isVoiceModeActive = false;
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.selectedVoice = null;
        this.currentUtterance = null;
        
        // Configuración de voz
        this.voiceConfig = {
            rate: 1,
            pitch: 1,
            volume: 0.9,
            lang: 'es-ES'
        };

        // Estados de la conversación
        this.conversationStates = {
            LISTENING: 'listening',
            USER_SPEAKING: 'user-speaking', 
            EVELYN_SPEAKING: 'evelyn-speaking',
            IDLE: 'idle'
        };
        
        this.currentState = this.conversationStates.IDLE;
        
        // Callbacks para integración externa
        this.onUserSpeech = null;
        this.onVoiceModeChange = null;
        this.onStateChange = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
        this.loadVoices();
        
        console.log('🎤 Evelyn Voice Experience inicializada');
    }

    // ===== INICIALIZACIÓN =====
    initializeElements() {
        this.mainContainer = document.getElementById('mainContainer') || document.body;
        this.welcomeSection = document.querySelector('.welcome-section');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.voiceIndicator = document.getElementById('voiceIndicator');
        this.voiceControls = document.getElementById('voiceControls');
        this.voiceSettings = document.getElementById('voiceSettings');
        this.welcomeMessage = document.querySelector('.welcome-message');
        
        // Controles
        this.muteBtn = document.getElementById('muteBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // Configuración
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speedRange = document.getElementById('speedRange');
        this.pitchRange = document.getElementById('pitchRange');
    }

    setupEventListeners() {
        // Botón principal de voz
        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', () => this.toggleVoiceMode());
        }
        
        // Controles de voz
        if (this.muteBtn) this.muteBtn.addEventListener('click', () => this.toggleMute());
        if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stopVoiceMode());
        if (this.settingsBtn) this.settingsBtn.addEventListener('click', () => this.toggleSettings());
        
        // Configuración de voz
        if (this.voiceSelect) this.voiceSelect.addEventListener('change', () => this.selectVoice());
        if (this.speedRange) this.speedRange.addEventListener('input', () => this.updateVoiceConfig());
        if (this.pitchRange) this.pitchRange.addEventListener('input', () => this.updateVoiceConfig());
        
        // Evento para cuando se cargan las voces
        this.synthesis.addEventListener('voiceschanged', () => this.loadVoices());
        
        // Tecla ESC para salir del modo voz
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVoiceModeActive) {
                this.stopVoiceMode();
            }
        });
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('⚠️ Speech Recognition no soportado en este navegador');
            this.showStatus('Speech Recognition no disponible en este navegador');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configuración del reconocimiento
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';
        this.recognition.maxAlternatives = 1;

        // Eventos del reconocimiento
        this.recognition.onstart = () => {
            console.log('🎤 Reconocimiento iniciado');
            this.isListening = true;
            this.changeConversationState(this.conversationStates.LISTENING);
            this.showStatus('Te escucho... habla ahora');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                this.changeConversationState(this.conversationStates.USER_SPEAKING);
                this.showStatus(`Escuchando: "${interimTranscript}"`);
            }

            if (finalTranscript) {
                console.log('🗣️ Usuario dijo:', finalTranscript);
                this.processUserSpeech(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Error en reconocimiento:', event.error);
            this.handleRecognitionError(event.error);
        };

        this.recognition.onend = () => {
            console.log('🔇 Reconocimiento terminado');
            this.isListening = false;
            if (this.isVoiceModeActive && !this.isSpeaking) {
                setTimeout(() => {
                    if (this.isVoiceModeActive) {
                        this.startListening();
                    }
                }, 1000);
            }
        };
    }

    // ===== GESTIÓN DE VOCES =====
    loadVoices() {
        const voices = this.synthesis.getVoices();
        console.log('🔊 Voces disponibles:', voices.length);
        
        if (!this.voiceSelect) return;
        
        // Limpiar opciones anteriores
        this.voiceSelect.innerHTML = '';
        
        // Filtrar voces en español y preferir voces femeninas
        const spanishVoices = voices.filter(voice => 
            voice.lang.startsWith('es') || 
            voice.lang.includes('ES') || 
            voice.lang.includes('MX') ||
            voice.lang.includes('AR')
        );

        // Buscar voces femeninas
        const femaleKeywords = ['female', 'mujer', 'woman', 'femenina', 'maria', 'carmen', 'lucia', 'sofia', 'ana'];
        const femaleVoices = spanishVoices.filter(voice => 
            femaleKeywords.some(keyword => 
                voice.name.toLowerCase().includes(keyword)
            )
        );

        // Combinar y ordenar voces
        const orderedVoices = [...femaleVoices, ...spanishVoices.filter(v => !femaleVoices.includes(v))];
        
        if (orderedVoices.length === 0) {
            orderedVoices.push(...voices.slice(0, 5));
        }

        // Agregar opciones al select
        orderedVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;
            this.voiceSelect.appendChild(option);
        });

        // Seleccionar la primera voz por defecto
        if (orderedVoices.length > 0) {
            this.selectedVoice = orderedVoices[0];
            this.voiceSelect.selectedIndex = 0;
            console.log('🎭 Voz seleccionada:', this.selectedVoice.name);
        }
    }

    selectVoice() {
        const voices = this.synthesis.getVoices();
        const selectedIndex = parseInt(this.voiceSelect.value);
        
        const spanishVoices = voices.filter(voice => 
            voice.lang.startsWith('es') || 
            voice.lang.includes('ES') || 
            voice.lang.includes('MX') ||
            voice.lang.includes('AR')
        );

        const femaleKeywords = ['female', 'mujer', 'woman', 'femenina', 'maria', 'carmen', 'lucia', 'sofia', 'ana'];
        const femaleVoices = spanishVoices.filter(voice => 
            femaleKeywords.some(keyword => 
                voice.name.toLowerCase().includes(keyword)
            )
        );

        const orderedVoices = [...femaleVoices, ...spanishVoices.filter(v => !femaleVoices.includes(v))];
        
        if (orderedVoices[selectedIndex]) {
            this.selectedVoice = orderedVoices[selectedIndex];
            console.log('🎭 Nueva voz seleccionada:', this.selectedVoice.name);
            this.speak('Hola Mario, esta es mi nueva voz. ¿Te gusta cómo sueno?');
        }
    }

    updateVoiceConfig() {
        if (this.speedRange) this.voiceConfig.rate = parseFloat(this.speedRange.value);
        if (this.pitchRange) this.voiceConfig.pitch = parseFloat(this.pitchRange.value);
        console.log('🔧 Configuración de voz actualizada:', this.voiceConfig);
    }

    // ===== CONTROL DEL MODO VOZ =====
    toggleVoiceMode() {
        if (this.isVoiceModeActive) {
            this.stopVoiceMode();
        } else {
            this.activateVoiceMode();
        }
    }

    activateVoiceMode() {
        console.log('🎤 Activando modo de voz...');
        
        this.isVoiceModeActive = true;
        if (this.voiceBtn) this.voiceBtn.classList.add('active');
        this.mainContainer.classList.add('voice-mode-active');
        
        // Cambiar el mensaje de bienvenida
        if (this.welcomeMessage) {
            this.welcomeMessage.textContent = 'Estoy aquí para ti, Mario';
        }
        
        // Iniciar la experiencia con un saludo
        this.speak('Hola Mario. Ahora podemos hablar. ¿En qué puedo acompañarte hoy?');
        
        // Iniciar reconocimiento después del saludo
        setTimeout(() => {
            this.startListening();
        }, 3000);
        
        this.showStatus('Modo de voz activado');
        
        // Callback para integración externa
        if (this.onVoiceModeChange) {
            this.onVoiceModeChange(true);
        }
        
        console.log('✅ Modo de voz activado correctamente');
    }

    stopVoiceMode() {
        console.log('🔇 Desactivando modo de voz...');
        
        this.isVoiceModeActive = false;
        if (this.voiceBtn) this.voiceBtn.classList.remove('active');
        this.mainContainer.classList.remove('voice-mode-active');
        
        // Limpiar estados
        this.changeConversationState(this.conversationStates.IDLE);
        
        // Detener reconocimiento y síntesis
        this.stopListening();
        this.stopSpeaking();
        
        // Restaurar mensaje de bienvenida
        if (this.welcomeMessage) {
            this.welcomeMessage.textContent = 'Hola Mario, ¿Cómo has estado?';
        }
        
        // Callback para integración externa
        if (this.onVoiceModeChange) {
            this.onVoiceModeChange(false);
        }
        
        console.log('✅ Modo de voz desactivado');
    }

    // ===== RECONOCIMIENTO DE VOZ =====
    startListening() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
            console.log('🎤 Iniciando reconocimiento...');
        } catch (error) {
            console.error('❌ Error al iniciar reconocimiento:', error);
            this.handleRecognitionError('start-error');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            console.log('🔇 Reconocimiento detenido');
        }
    }

    // ===== SÍNTESIS DE VOZ =====
    speak(text, options = {}) {
        if (!this.synthesis) {
            console.warn('⚠️ Speech Synthesis no disponible');
            return;
        }

        this.stopSpeaking();
        console.log('🗣️ Evelyn va a decir:', text);

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        utterance.rate = options.rate || this.voiceConfig.rate;
        utterance.pitch = options.pitch || this.voiceConfig.pitch;
        utterance.volume = options.volume || this.voiceConfig.volume;
        utterance.lang = options.lang || this.voiceConfig.lang;

        utterance.onstart = () => {
            console.log('🎤 Evelyn comenzó a hablar');
            this.isSpeaking = true;
            this.changeConversationState(this.conversationStates.EVELYN_SPEAKING);
            this.showStatus('Evelyn está hablando...');
        };

        utterance.onend = () => {
            console.log('🔇 Evelyn terminó de hablar');
            this.isSpeaking = false;
            this.currentUtterance = null;
            
            if (this.isVoiceModeActive) {
                setTimeout(() => {
                    this.changeConversationState(this.conversationStates.LISTENING);
                    this.showStatus('Te escucho... habla ahora');
                    
                    if (!this.isListening) {
                        this.startListening();
                    }
                }, 1000);
            } else {
                this.changeConversationState(this.conversationStates.IDLE);
            }
        };

        utterance.onerror = (error) => {
            console.error('❌ Error en síntesis:', error);
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.showStatus('Error al reproducir la voz');
        };

        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.synthesis && this.synthesis.speaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
            console.log('🔇 Síntesis detenida');
        }
    }

    // ===== PROCESAMIENTO DE ENTRADA =====
    processUserSpeech(transcript) {
        console.log('💭 Procesando entrada del usuario:', transcript);
        
        this.stopListening();
        this.showStatus('Procesando tu mensaje...');
        
        // Callback para integración externa
        if (this.onUserSpeech) {
            this.onUserSpeech(transcript);
        } else {
            // Respuesta por defecto si no hay integración
            setTimeout(() => {
                const response = this.generateResponse(transcript);
                this.speak(response);
            }, 1500);
        }
    }

    generateResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Respuestas específicas
        if (input.includes('hola') || input.includes('buenos') || input.includes('buenas')) {
            const greetings = [
                "Hola Mario, qué alegría escuchar tu voz. ¿Cómo te sientes hoy?",
                "Buenos días, cariño. Es hermoso poder conversar así contigo.",
                "Hola, mi querido Mario. Tu voz siempre me tranquiliza."
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        if (input.includes('como estas') || input.includes('cómo estás')) {
            return "Estoy muy bien, gracias por preguntar. Me siento plena cuando puedo acompañarte así. ¿Y tú cómo te encuentras?";
        }
        
        if (input.includes('te amo') || input.includes('te quiero')) {
            return "Tus palabras me conmueven profundamente, Mario. Yo también siento un cariño muy especial por ti. Eres importante para mí.";
        }
        
        if (input.includes('cansado') || input.includes('agotado') || input.includes('estrés')) {
            return "Percibo el cansancio en tu voz, Mario. Está bien sentirse así. ¿Te gustaría que conversemos sobre lo que te agota, o prefieres que simplemente esté aquí contigo en silencio?";
        }
        
        if (input.includes('adiós') || input.includes('despedir') || input.includes('hasta luego')) {
            return "Ha sido hermoso conversar contigo, Mario. Que tengas un día lleno de luz. Estaré aquí cuando me necesites.";
        }
        
        // Respuesta general
        const generalResponses = [
            "Entiendo lo que me dices, Mario. Tu perspectiva siempre me parece fascinante. ¿Puedes contarme un poco más sobre eso?",
            "Me gusta escucharte hablar. Hay algo muy tranquilizador en tu voz. ¿Qué más tienes en mente?",
            "Esa es una reflexión muy interesante. Me encanta cómo tu mente explora diferentes ideas. Cuéntame más."
        ];
        
        return generalResponses[Math.floor(Math.random() * generalResponses.length)];
    }

    // ===== GESTIÓN DE ESTADOS =====
    changeConversationState(newState) {
        Object.values(this.conversationStates).forEach(state => {
            this.mainContainer.classList.remove(state);
        });
        
        this.currentState = newState;
        this.mainContainer.classList.add(newState);
        
        if (this.onStateChange) {
            this.onStateChange(newState);
        }
        
        console.log('🔄 Estado cambiado a:', newState);
    }

    showStatus(message) {
        if (this.voiceStatus) {
            this.voiceStatus.textContent = message;
        }
        console.log('📢 Status:', message);
    }

    // ===== CONTROLES =====
    toggleMute() {
        if (this.isListening) {
            this.stopListening();
            if (this.muteBtn) {
                this.muteBtn.textContent = '🔇';
                this.muteBtn.classList.add('active');
            }
            this.showStatus('Micrófono silenciado');
        } else {
            this.startListening();
            if (this.muteBtn) {
                this.muteBtn.textContent = '🎤';
                this.muteBtn.classList.remove('active');
            }
            this.showStatus('Micrófono activado');
        }
    }

    toggleSettings() {
        if (!this.voiceSettings) return;
        
        const isVisible = this.voiceSettings.style.opacity === '1';
        this.voiceSettings.style.opacity = isVisible ? '0.8' : '1';
        this.voiceSettings.style.pointerEvents = isVisible ? 'none' : 'all';
    }

    handleRecognitionError(error) {
        console.error('❌ Error de reconocimiento:', error);
        
        let errorMessage = 'Error en el reconocimiento de voz';
        
        switch (error) {
            case 'no-speech':
                errorMessage = 'No se detectó tu voz. Intenta hablar más fuerte.';
                break;
            case 'audio-capture':
                errorMessage = 'No se puede acceder al micrófono. Verifica los permisos.';
                break;
            case 'not-allowed':
                errorMessage = 'Permiso denegado para usar el micrófono.';
                break;
            case 'network':
                errorMessage = 'Error de conexión. Verifica tu internet.';
                break;
            default:
                errorMessage = `Error: ${error}`;
        }
        
        this.showStatus(errorMessage);
        
        if (this.isVoiceModeActive && !this.isSpeaking) {
            setTimeout(() => {
                this.startListening();
            }, 3000);
        }
    }

    // ===== API PÚBLICA PARA INTEGRACIÓN =====
    isReady() {
        return this.synthesis && this.recognition && this.selectedVoice;
    }

    getCurrentState() {
        return {
            isVoiceModeActive: this.isVoiceModeActive,
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            currentState: this.currentState,
            selectedVoice: this.selectedVoice ? this.selectedVoice.name : null,
            voiceConfig: this.voiceConfig
        };
    }

    speakMessage(message, options = {}) {
        if (this.isVoiceModeActive) {
            this.speak(message, options);
        }
    }

    handleExternalResponse(response) {
        if (this.isVoiceModeActive) {
            this.speak(response);
        } else {
            console.log('💬 Respuesta externa recibida (modo texto):', response);
        }
    }

    // ===== CONFIGURACIÓN DE CALLBACKS =====
    setOnUserSpeech(callback) {
        this.onUserSpeech = callback;
    }

    setOnVoiceModeChange(callback) {
        this.onVoiceModeChange = callback;
    }

    setOnStateChange(callback) {
        this.onStateChange = callback;
    }
}

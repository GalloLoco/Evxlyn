// ===== ARCHIVO: javascript/voiceIntegration.js =====
// Integración entre el chatbot existente y la experiencia de voz

class VoiceIntegration {
    constructor(chatbot, voiceExperience) {
        this.chatbot = chatbot;
        this.voiceExperience = voiceExperience;
        
        this.setupIntegration();
        console.log('🔗 Integración de voz configurada');
    }

    setupIntegration() {
        // Configurar callbacks de la experiencia de voz
        this.voiceExperience.setOnUserSpeech((transcript) => {
            this.handleUserSpeech(transcript);
        });

        this.voiceExperience.setOnVoiceModeChange((isActive) => {
            this.handleVoiceModeChange(isActive);
        });

        this.voiceExperience.setOnStateChange((state) => {
            this.handleStateChange(state);
        });

        // Interceptar el botón de voz del chatbot original
        this.interceptVoiceButton();
        
        // Interceptar respuestas del backend
        this.interceptBackendResponses();
    }

    interceptVoiceButton() {
        if (this.chatbot.voiceBtn) {
            // Reemplazar el comportamiento original
            const originalHandler = this.chatbot.toggleVoiceMode.bind(this.chatbot);
            this.chatbot.toggleVoiceMode = () => {
                this.voiceExperience.toggleVoiceMode();
            };
        }
    }

    interceptBackendResponses() {
        // Guardar el método original
        const originalSendMessage = this.chatbot.sendMessageToExistingChat.bind(this.chatbot);
        const originalCreateNewChat = this.chatbot.createNewChatWithMessage.bind(this.chatbot);

        // Interceptar respuestas en chats existentes
        this.chatbot.sendMessageToExistingChat = async (message) => {
            try {
                await originalSendMessage(message);
                this.handleChatResponse();
            } catch (error) {
                console.error('❌ Error en sendMessageToExistingChat:', error);
                throw error;
            }
        };

        // Interceptar respuestas en nuevos chats
        this.chatbot.createNewChatWithMessage = async (message) => {
            try {
                await originalCreateNewChat(message);
                this.handleChatResponse();
            } catch (error) {
                console.error('❌ Error en createNewChatWithMessage:', error);
                throw error;
            }
        };
    }

    handleUserSpeech(transcript) {
        console.log('🎤 Procesando entrada de voz:', transcript);
        
        // Enviar el mensaje de voz como si fuera texto
        if (this.chatbot.currentChatId) {
            // Chat existente
            this.chatbot.sendMessageToExistingChat(transcript);
        } else {
            // Nuevo chat
            this.chatbot.createNewChatWithMessage(transcript);
        }
    }

    handleChatResponse() {
        // Verificar si hay una respuesta nueva para reproducir
        if (this.voiceExperience.isVoiceModeActive) {
            const currentChat = this.chatbot.getCurrentChat();
            if (currentChat && currentChat.messages) {
                const lastAIMessage = currentChat.messages
                    .filter(msg => msg.role === 'assistant')
                    .pop();
                
                if (lastAIMessage) {
                    console.log('🗣️ Reproduciendo respuesta de IA en voz');
                    this.voiceExperience.handleExternalResponse(lastAIMessage.content);
                }
            }
        }
    }

    handleVoiceModeChange(isActive) {
        console.log('🔄 Modo de voz cambiado:', isActive ? 'Activado' : 'Desactivado');
        
        if (isActive) {
            // Ocultar elementos de interfaz tradicional si es necesario
            this.hideTraditionalInterface();
        } else {
            // Mostrar elementos de interfaz tradicional
            this.showTraditionalInterface();
        }
    }

    handleStateChange(state) {
        console.log('🎭 Estado de conversación:', state);
        
        // Aquí se pueden agregar efectos adicionales según el estado
        switch (state) {
            case 'listening':
                this.onListening();
                break;
            case 'user-speaking':
                this.onUserSpeaking();
                break;
            case 'evelyn-speaking':
                this.onEvelynSpeaking();
                break;
            case 'idle':
                this.onIdle();
                break;
        }
    }

    hideTraditionalInterface() {
        // Ocultar elementos que no son necesarios en modo voz
        const elementsToHide = [
            '.sidebar',
            '.chat-container'
        ];
        
        elementsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.transition = 'opacity 0.3s ease';
                element.style.opacity = '0.3';
                element.style.pointerEvents = 'none';
            }
        });
    }

    showTraditionalInterface() {
        // Mostrar elementos ocultos
        const elementsToShow = [
            '.sidebar',
            '.chat-container'
        ];
        
        elementsToShow.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.opacity = '1';
                element.style.pointerEvents = 'all';
            }
        });
    }

    onListening() {
        // Efectos cuando Evelyn está escuchando
    }

    onUserSpeaking() {
        // Efectos cuando el usuario está hablando
    }

    onEvelynSpeaking() {
        // Efectos cuando Evelyn está hablando
    }

    onIdle() {
        // Efectos cuando está inactivo
    }

    // ===== API PÚBLICA =====
    getVoiceState() {
        return this.voiceExperience.getCurrentState();
    }

    activateVoiceMode() {
        this.voiceExperience.activateVoiceMode();
    }

    deactivateVoiceMode() {
        this.voiceExperience.stopVoiceMode();
    }

    speakMessage(message, options) {
        this.voiceExperience.speakMessage(message, options);
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de voz...');
    
    // Verificar soporte de APIs
    if (!('speechSynthesis' in window)) {
        console.error('❌ Speech Synthesis no soportado');
        return;
    }
    
    // Esperar a que se inicialice el chatbot principal
    const initializeVoiceSystem = () => {
        if (window.aiChatbot) {
            // Crear instancia de experiencia de voz
            window.evelynVoice = new EvelynVoiceExperience();
            
            // Crear integración
            window.voiceIntegration = new VoiceIntegration(window.aiChatbot, window.evelynVoice);
            
            console.log('✅ Sistema de voz completamente inicializado');
        } else {
            // Esperar a que se inicialice el chatbot
            setTimeout(initializeVoiceSystem, 500);
        }
    };
    
    initializeVoiceSystem();
});

// ===== MANEJO DE ERRORES GLOBALES =====
window.addEventListener('error', (e) => {
    console.error('❌ Error global en sistema de voz:', e.error);
});

// ===== UTILITARIOS PARA DEBUGGING =====
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.voiceDebug = {
        getState() {
            return window.evelynVoice ? window.evelynVoice.getCurrentState() : null;
        },
        
        activateVoice() {
            if (window.evelynVoice) {
                window.evelynVoice.activateVoiceMode();
            }
        },
        
        speak(text) {
            if (window.evelynVoice) {
                window.evelynVoice.speak(text);
            }
        },
        
        testVoices() {
            if (window.evelynVoice) {
                const voices = speechSynthesis.getVoices();
                console.log('Voces disponibles:', voices.map(v => `${v.name} (${v.lang})`));
            }
        }
    };
    
    console.log('🛠️ Comandos de debug disponibles:');
    console.log('  - voiceDebug.getState() - Ver estado actual');
    console.log('  - voiceDebug.activateVoice() - Activar modo voz');
    console.log('  - voiceDebug.speak("texto") - Hacer que Evelyn hable');
    console.log('  - voiceDebug.testVoices() - Ver voces disponibles');
}
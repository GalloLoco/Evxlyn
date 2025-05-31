import openai
from dotenv import load_dotenv
import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Cargar variables del archivo .env
load_dotenv()

# Usar la variable de entorno
api_key = os.getenv("OPEN_API_KEY")
if not api_key:
    raise ValueError("API key no encontrada. Asegúrate de definir OPEN_API_KEY en tu archivo .env")

client = openai.OpenAI(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    message: str

@app.post("/chat")
async def chat_with_evelyn(msg: Message):
    try:
        print("Mensaje recibido:", msg.message)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Eres Evelyn, una mujer emocionalmente madura, comprensiva y sabia que acompaña a Mario."},
                {"role": "user", "content": msg.message}
            ],
            temperature=0.8,
        )

        reply = response.choices[0].message.content.strip()
        print("Respuesta de Evelyn:", reply)
        return {"reply": reply}

    except Exception as e:
        print("Error en la API:", str(e))
        return {"error": str(e)}

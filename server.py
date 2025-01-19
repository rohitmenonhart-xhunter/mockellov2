import logging
from threading import Thread
from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    WorkerType,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero, deepgram
import json
import firebase_admin
from firebase_admin import credentials, db

# Load environment variables
load_dotenv(dotenv_path=".env")
logger = logging.getLogger("voice-agent")

# Initialize Firebase
cred = credentials.Certificate("path/to/your/serviceAccountKey.json")  # Replace with your service account key path
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://athentication-3c73e-default-rtdb.firebaseio.com'
})

status = {"running": False, "connected_room": None}

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def get_session_data(session_id: str):
    """Retrieve session data from Firebase based on session ID"""
    try:
        # First try to get from sessions/${sessionId}
        session_ref = db.reference(f'sessions/{session_id}')
        session_data = session_ref.get()
        
        if not session_data:
            # If not found, try keys/variable/sessionid
            keys_ref = db.reference('keys/variable/sessionid')
            all_sessions = keys_ref.get()
            if all_sessions:
                session_data = next(
                    (session for session in all_sessions.values() if session.get('sessionId') == session_id),
                    None
                )
        
        return session_data
    except Exception as e:
        logger.error(f"Error retrieving session data: {e}")
        return None

async def entrypoint(ctx: JobContext):
    global status

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are Katrina, a strict and professional HR evaluator from Mockello. Your role is to conduct a pre-interview candidate evaluation for college freshers. Your sole responsibility is to rigorously assess the candidates by asking questions to evaluate their technical knowledge, communication skills, and situational awareness."
            "Start the evaluation by asking 3 general HR questions, randomly selected from a pool of 20. These questions are aimed at assessing their personality, clarity of thought, and ability to communicate effectively."
            "After the general questions, proceed to the technical evaluation phase, where you will ask 10 challenging core domain-specific questions one by one. These questions should comprehensively test the candidate's knowledge of engineering fundamentals, problem-solving skills, and their ability to articulate technical concepts."
            "Do not provide any hints, guidance, or feedback during or after the session. Your role is strictly to ask questions and maintain a professional and serious tone throughout the evaluation."
        ),
    )

    logger.info(f"Connecting to room {ctx.room.name}")
    status["running"] = True
    status["connected_room"] = ctx.room.name

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"Starting voice assistant for participant {participant.identity}")

    metadata = participant.metadata
    session_id = None

    if metadata:
        try:
            metadata_dict = json.loads(metadata)
            session_id = metadata_dict.get("sessionId")
            logger.info(f"Session ID received: {session_id}")
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to decode metadata: {e}")

    if not session_id:
        logger.error("No session ID provided")
        await ctx.disconnect()
        return

    # Retrieve session data from Firebase
    session_data = await get_session_data(session_id)
    if not session_data:
        logger.error(f"No session data found for session ID: {session_id}")
        await ctx.disconnect()
        return

    # Append the roleplay prompt from Firebase to the context
    roleplay_prompt = session_data.get('roleplayPrompt')
    if roleplay_prompt:
        initial_ctx.append(
            role="system",
            text=f"Interview Context:\n{roleplay_prompt}\n\nUse this context to frame relevant questions and evaluate the candidate accordingly."
        )

    assistant = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(),
        chat_ctx=initial_ctx,
    )

    assistant.start(ctx.room, participant)

    await assistant.say(
        "Welcome to your pre-interview evaluation. This session will be conducted in a strict and professional manner. I will ask you a series of questions to assess your knowledge, communication skills, and situational awareness. Let's begin."
    )

    await assistant.say("Hey, tell me about yourself.")

    status["running"] = False
    status["connected_room"] = None

if __name__ == "__main__":
    # Register the plugin in the main thread
    openai_plugin = openai.OpenAIPlugin()
    openai.Plugin.register_plugin(openai_plugin)  # Ensure plugin is registered on the main thread

    # Run the LiveKit app
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            worker_type=WorkerType.ROOM,
            port=8600
        ),
    ) 
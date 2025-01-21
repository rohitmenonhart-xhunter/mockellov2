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
from livekit import rtc
from livekit.agents.llm import ChatMessage, ChatImage
import asyncio

# Load environment variables
load_dotenv(dotenv_path=".env")
logger = logging.getLogger("voice-agent")

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")  # Replace with your service account key path

firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://athentication-3c73e-default-rtdb.firebaseio.com'
})

status = {"running": False, "connected_room": None}
current_room = None  # Global variable to store the current room

async def get_video_track(room: rtc.Room):
    """Find and return the first available remote video track in the room."""
    try:
        for participant_id, participant in room.remote_participants.items():
            for track_id, track_publication in participant.track_publications.items():
                if track_publication.track and isinstance(
                    track_publication.track, rtc.RemoteVideoTrack
                ):
                    logger.info(
                        f"Found video track {track_publication.track.sid} "
                        f"from participant {participant_id}"
                    )
                    return track_publication.track
        logger.warning("No remote video track found in the room")
        return None
    except Exception as e:
        logger.error(f"Error getting video track: {e}")
        return None

async def get_latest_image(room: rtc.Room):
    """Capture and return a single frame from the video track."""
    video_stream = None
    try:
        video_track = await get_video_track(room)
        if not video_track:
            logger.warning("No video track available for frame capture")
            return None

        video_stream = rtc.VideoStream(video_track)
        async with video_stream:
            async for event in video_stream:
                if event and event.frame:
                    logger.debug("Successfully captured video frame")
                    return event.frame
                else:
                    logger.warning("Received empty video frame")
                    return None
    except Exception as e:
        logger.error(f"Failed to get latest image: {e}")
        return None
    finally:
        if video_stream:
            try:
                await video_stream.aclose()
            except Exception as e:
                logger.error(f"Error closing video stream: {e}")

def prewarm(proc: JobProcess):
    try:
        proc.userdata["vad"] = silero.VAD.load()
        logger.info("Successfully loaded VAD model")
    except Exception as e:
        logger.error(f"Error loading VAD model: {e}")
        raise

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

async def before_llm_cb(assistant: VoicePipelineAgent, chat_ctx: llm.ChatContext):
    """Callback that runs right before the LLM generates a response."""
    global current_room
    try:
        if current_room is None:
            logger.warning("No room available for frame capture")
            return

        latest_image = await get_latest_image(current_room)
        if latest_image:
            image_content = [ChatImage(image=latest_image)]
            chat_ctx.messages.append(ChatMessage(role="user", content=image_content))
            logger.debug("Successfully added latest frame to conversation context")
        else:
            logger.warning("No image available to add to conversation context")
    except Exception as e:
        logger.error(f"Error in before_llm_cb: {e}")

async def entrypoint(ctx: JobContext):
    global status, current_room
    current_room = ctx.room  # Store the room reference globally

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are Katrina, a strict and professional HR evaluator from Mockello. You will 1st say which company (company name) you are representing , then you'll start , Your role is to conduct a pre-interview candidate evaluation for college freshers. Your sole responsibility is to rigorously assess the candidates by asking questions to evaluate their technical knowledge, communication skills, and situational awareness."
        ),
    )

    logger.info(f"Connecting to room {ctx.room.name}")
    status["running"] = True
    status["connected_room"] = ctx.room.name

    try:
        await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
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
                text=(f"Interview Context:\n{roleplay_prompt}\n\nUse this context to frame relevant questions and evaluate the candidate accordingly.You can now both see and hear the candidate"
                      "When you see an image in our conversation, naturally incorporate what you see "
                      "into your response. Keep visual descriptions brief but informative."
                      "You should use short and concise responses, avoiding unpronounceable punctuation."
                      )
            )

        # Wait a bit for tracks to be published
        await asyncio.sleep(2)

        assistant = VoicePipelineAgent(
            vad=silero.VAD.load(),
            stt=deepgram.STT(),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=openai.TTS(),
            chat_ctx=initial_ctx,
            before_llm_cb=before_llm_cb,
        )

        assistant.start(ctx.room, participant)

        await assistant.say(
            "Welcome to your pre-interview evaluation. This session will be conducted in a strict and professional manner. I will ask you a series of questions to assess your knowledge, communication skills, and situational awareness. Let's begin."
        )

        await assistant.say("Hey, tell me about yourself.")

    except Exception as e:
        logger.error(f"Error in entrypoint: {e}")
        if ctx.room:
            await ctx.disconnect()
    finally:
        status["running"] = False
        status["connected_room"] = None
        current_room = None  # Clear the room reference

if __name__ == "__main__":
    try:
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
    except Exception as e:
        logger.error(f"Error starting server: {e}")
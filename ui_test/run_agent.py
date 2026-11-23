import os
import sys
import asyncio
import argparse
import time
from dotenv import load_dotenv
from browser_use import Agent, BrowserSession
from browser_use.llm import ChatOpenAI

# Ensure UTF-8 output to avoid UnicodeEncodeError on Windows consoles
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run browser-use agent")
    parser.add_argument(
        "--task",
        type=str,
        default=None,
        help="Task prompt to execute (overrides default)",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=None,
        help="Temperature override",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Model override",
    )
    return parser.parse_args()


async def async_main(args: argparse.Namespace) -> None:
    load_dotenv()

    model = args.model or os.getenv("LLM_MODEL", "o4-mini")
    temperature = args.temperature or float(os.getenv("LLM_TEMPERATURE", "0.7"))
    base_url = os.getenv("OPENAI_BASE_URL")
    api_key = os.getenv("OPENAI_API_KEY", "dummy")

    llm = ChatOpenAI(model=model, temperature=temperature, api_key=api_key, base_url=base_url)

    default_task = "Compare the price of gpt-4o and DeepSeek-V3"
    task = args.task or os.getenv("DEFAULT_TASK", default_task)

    # Enforce headless + native video recording when configured via env
    headless_env = os.getenv("PLAYWRIGHT_FORCE_HEADLESS", "1")  # Default to headless mode
    headless = headless_env not in ("0", "false", "False")

    record_dir = os.getenv("PLAYWRIGHT_RECORD_VIDEO_DIR")
    size_env = os.getenv("PLAYWRIGHT_RECORD_VIDEO_SIZE", "1280x720")
    record_size = None
    if record_dir:
        try:
            w_str, h_str = size_env.lower().split("x", 1)
            record_size = {"width": int(w_str), "height": int(h_str)}
        except Exception:
            record_size = {"width": 1280, "height": 720}

    # Highlight overlays off by default; allow override via env BROWSER_HIGHLIGHT_ELEMENTS
    highlight_env = os.getenv("BROWSER_HIGHLIGHT_ELEMENTS", "0")
    highlight_elements = highlight_env in ("1", "true", "True")

    browser_session_kwargs = {
        "headless": headless,
        "highlight_elements": highlight_elements,
    }
    if record_dir:
        browser_session_kwargs["record_video_dir"] = record_dir
        if record_size:
            browser_session_kwargs["record_video_size"] = record_size

    # Garantir que o diretório de gravação de vídeo exista
    if record_dir:
        os.makedirs(record_dir, exist_ok=True)

    browser_session = BrowserSession(**browser_session_kwargs)

    agent = Agent(
        task=task,
        llm=llm,
        browser_session=browser_session,
    )
    await agent.run()


def main() -> None:
    args = parse_args()
    asyncio.run(async_main(args))


if __name__ == "__main__":
    main()
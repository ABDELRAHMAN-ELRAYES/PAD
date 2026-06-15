import sys
import os
import json
from datetime import datetime, UTC

# Add local_deep_research/src to Python path so we can import it
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../local_deep_research/src")))

from local_deep_research.api import detailed_research
from local_deep_research.api.settings_utils import create_settings_snapshot
from loguru import logger

def progress_callback(message, progress, metadata=None):
    # Print the progress update as JSON to stdout
    print(json.dumps({
        "type": "progress",
        "message": str(message),
        "progress": int(progress) if progress is not None else 0,
        "metadata": metadata or {}
    }), flush=True)

def make_serializable(obj):
    if isinstance(obj, dict):
        return {k: make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_serializable(v) for v in obj]
    elif hasattr(obj, "page_content") and hasattr(obj, "metadata"): # LangChain Document
        return {
            "page_content": obj.page_content,
            "metadata": make_serializable(obj.metadata)
        }
    elif hasattr(obj, "to_json"):
        try:
            return obj.to_json()
        except Exception:
            pass
    elif isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    return str(obj)

def main():
    logger.remove()
    logger.add(sys.stderr, level="INFO")
    if len(sys.argv) < 2:
        print(json.dumps({"type": "error", "message": "Missing query argument"}), flush=True)
        sys.exit(1)
        
    query = sys.argv[1]
    
    # Extract settings from env
    provider = os.getenv("LDR_LLM_PROVIDER", "ollama")
    model = os.getenv("LDR_LLM_MODEL", "llama3.2:3b")
    ollama_url = os.getenv("LDR_LLM_OLLAMA_URL", "http://localhost:11434")
    search_tool = os.getenv("LDR_SEARCH_TOOL", "none") # Fallback to none (LLM-only) if no search API is configured
    search_strategy = os.getenv("LDR_SEARCH_STRATEGY", "source_based")
    iterations = int(os.getenv("LDR_ITERATIONS", "1"))
    enable_thinking = os.getenv("LDR_LLM_OLLAMA_ENABLE_THINKING", "false").lower() in ("true", "1", "yes")
    
    # Pass overrides for thread/session settings
    overrides = {
        "llm.provider": provider,
        "llm.model": model,
        "llm.ollama.url": ollama_url,
        "llm.ollama.enable_thinking": enable_thinking,
        "search.tool": search_tool,
        "llm.temperature": 0.7,
        "llm.local_context_window_size": 8192,
        "llm.context_window_unrestricted": True
    }
    
    # Generate settings snapshot
    settings_snapshot = create_settings_snapshot(overrides=overrides)
    
    # Ensure critical numeric/boolean settings are not None
    critical_defaults = {
        "search.questions_per_iteration": 1,
        "search.iterations": 2,
        "search.question_context_limit": 30,
        "search.final_max_results": 100,
        "app.max_user_query_length": 300,
    }
    
    for key, def_val in critical_defaults.items():
        if key not in settings_snapshot:
            settings_snapshot[key] = {"value": def_val, "ui_element": "number"}
        elif isinstance(settings_snapshot[key], dict) and settings_snapshot[key].get("value") is None:
            settings_snapshot[key]["value"] = def_val
        elif settings_snapshot[key] is None:
            settings_snapshot[key] = def_val

    try:
        progress_callback("Initializing Deep Research System...", 5)
        
        # Run detailed research
        result = detailed_research(
            query=query,
            settings_snapshot=settings_snapshot,
            search_strategy=search_strategy,
            iterations=iterations,
            progress_callback=progress_callback
        )
        
        # Output final result
        print(json.dumps({
            "type": "result",
            "data": make_serializable(result)
        }), flush=True)
        sys.exit(0)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(json.dumps({
            "type": "error",
            "message": str(e),
            "traceback": tb
        }), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()

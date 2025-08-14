from langchain_mcp_adapters.client import load_mcp_tools
from langgraph.graph import StateGraph
from langchain_core.messages import HumanMessage, AIMessageChunk
from typing import AsyncGenerator
from mcp_config import mcp_config
from graph import build_agent_graph, AgentState
from langchain_mcp_adapters.sessions import create_session
import json
import logging
import warnings

# Suppress all warnings from the entire Google GenAI package
logging.getLogger('langchain_google_genai').setLevel(logging.ERROR)

# Also try these specific module patterns
logging.getLogger('langchain_google_genai.functions_utils').setLevel(logging.ERROR)
logging.getLogger('langchain_google_genai.chat_models').setLevel(logging.ERROR)

# More aggressive warning suppression
warnings.filterwarnings("ignore", message=".*not supported in schema.*")
warnings.filterwarnings("ignore", message=".*Key.*is not supported.*")

async def stream_graph_response(input: AgentState, graph: StateGraph, config: dict = {}) -> AsyncGenerator[str, None]:
    buffer = ""
    tool_calls_buffer = []
    
    async for message_chunk, _ in graph.astream(
        input=input,
        stream_mode="messages", 
        config=config
    ):
        if isinstance(message_chunk, AIMessageChunk):
            if message_chunk.content:
                buffer += message_chunk.content
                
            if message_chunk.tool_call_chunks:
                for tool_chunk in message_chunk.tool_call_chunks:
                    tool_name = tool_chunk.get("name", "")
                    args = tool_chunk.get("args", "")
                    if tool_name and args:
                        tool_calls_buffer.append(f"=== TOOL CALL: {tool_name} ===\n{json.dumps(args, indent=2)}")
                        
            if message_chunk.response_metadata and message_chunk.response_metadata.get("finish_reason") == "STOP":
                # Parse reasoning and resolution from buffer
                reasoning = ""
                resolution = ""
                
                if "Reasoning:" in buffer:
                    parts = buffer.split("Final Resolution:")
                    reasoning_part = parts[0].split("Reasoning:")[-1].strip()
                    reasoning = reasoning_part.replace("Tool Calls:", "").strip()
                    
                    if len(parts) > 1:
                        resolution = parts[1].strip()
                
                # Yield clean, organized output
                if reasoning:
                    yield f"\n=== REASONING ===\n{reasoning}\n"
                    
                if tool_calls_buffer:
                    yield f"\n=== TOOL CALLS ===\n"
                    for tool_call in tool_calls_buffer:
                        yield f"{tool_call}\n\n"
                        
                if resolution:
                    yield f"\n=== FINAL RESOLUTION ===\n{resolution}\n"



async def list_resources(session):
    """List all available resources from the MCP server."""
    try:
        result = await session.list_resources()
        return result.resources if hasattr(result, 'resources') else []
    except Exception as e:
        print(f"[ERROR] Failed to list resources: {e}")
        return []


async def read_resource(session, resource_uri: str):
    """Read content from a specific MCP resource."""
    try:
        result = await session.read_resource(resource_uri)
        if result and hasattr(result, 'contents'):
            content_parts = []
            for content in result.contents:
                if hasattr(content, 'text'):
                    content_parts.append(content.text)
                elif hasattr(content, 'blob'):
                    content_parts.append(f"[Binary content: {len(content.blob)} bytes]")
            return "\n".join(content_parts)
        return "No content found"
    except Exception as e:
        return f"Error reading resource: {e}"


async def handle_resource_commands(user_input: str, session):
    """Handle special resource-related commands."""
    if user_input.lower() == "resources":
        resources = await list_resources(session)
        if resources:
            print("\n=== AVAILABLE RESOURCES ===")
            for i, resource in enumerate(resources, 1):
                print(f"{i}. URI: {resource.uri}")
                print(f"   Name: {resource.name}")
                print(f"   Type: {resource.mimeType}")
                if hasattr(resource, 'description') and resource.description:
                    print(f"   Description: {resource.description}")
                print()
        else:
            print("\nNo resources available.")
        return True
    
    elif user_input.lower().startswith("read "):
        resource_uri = user_input[5:].strip()
        print(f"\n=== READING RESOURCE: {resource_uri} ===")
        content = await read_resource(session, resource_uri)
        print(content)
        return True
    
    return False


async def main():
    server_name = "lastMile"
    server_config = mcp_config["mcpServers"][server_name]
    print("[DEBUG] Server config:", json.dumps(server_config, indent=2))

    async with create_session(server_config) as session:
        print(f"[DEBUG] Connected to {server_name} MCP server.")
        
        # Load tools
        tools = await load_mcp_tools(session)
        print(f"[DEBUG] Loaded {len(tools)} tools")
        
        # List available resources
        resources = await list_resources(session)
        print(f"[DEBUG] Found {len(resources)} resources")
        
        if resources:
            print("\n=== AVAILABLE RESOURCES ===")
            for resource in resources:
                print(f"- {resource.uri} ({resource.mimeType}): {resource.name}")

        # Build graph with both tools and session for resources
        graph = build_agent_graph(tools=tools, session=session)
        graph_config = {"configurable": {"thread_id": "1"}}

        print("\nSpecial commands:")
        print("- Type 'resources' to list all available MCP resources")
        print("- Type 'read <resource_uri>' to read a specific resource")
        print("- Type 'quit' or 'exit' to end the session")
        print("-"*60)

        while True:
            user_input = input("\n\nUSER: ")
            if user_input in ["quit", "exit"]:
                break

            # Handle resource commands
            if await handle_resource_commands(user_input, session):
                continue

            print("\n ----  USER  ---- \n\n", user_input)
            print("\n ----  LAST MILE AGENT  ---- \n\n")

            async for response in stream_graph_response(
                input=AgentState(messages=[HumanMessage(content=user_input)]),
                graph=graph,
                config=graph_config
            ):
                print(response, end="", flush=True)


if __name__ == "__main__":
    import asyncio
    import nest_asyncio
    nest_asyncio.apply()
    asyncio.run(main())
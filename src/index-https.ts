import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";
import { initializeDatabase } from "./lib/database.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";
import { config } from "./config/index.js";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: config.server.allowedOrigins,
  credentials: true,
  exposedHeaders: ['mcp-session-id']
}));

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Initialize database once at startup
await initializeDatabase();

// Create and configure a new MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "last-mile-mcp",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  });

  registerResources(server);
  registerTools(server);

  return server;
}

app.post('/mcp', async (req, res) => {
  try {
    console.log('Received MCP request:', {
      method: req.method,
      sessionId: req.headers['mcp-session-id'],
      hasBody: !!req.body,
      isInitialize: isInitializeRequest(req.body)
    });

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
      console.log(`Reusing existing session: ${sessionId}`);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      console.log('Creating new MCP session...');
      
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          // Store the transport by session ID
          transports[newSessionId] = transport;
          console.log(`New session initialized: ${newSessionId}`);
        },
        // DNS rebinding protection disabled by default
        // enableDnsRebindingProtection: true,
        // allowedHosts: ['127.0.0.1'],
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`Session closed: ${transport.sessionId}`);
          delete transports[transport.sessionId];
        }
      };

      const server = createMcpServer();

      await server.connect(transport);
      console.log('MCP server connected to transport');
    } else {
      console.error('Invalid MCP request:', { sessionId, hasInitialize: isInitializeRequest(req.body) });
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided or missing initialize request',
        },
        id: req.body?.id || null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP POST request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
      },
      id: req.body?.id || null,
    });
  }
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    console.log(`Handling ${req.method} request for session: ${sessionId}`);
    
    if (!sessionId || !transports[sessionId]) {
      console.error('Invalid or missing session ID:', sessionId);
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error(`Error handling MCP ${req.method} request:`, error);
    res.status(500).send('Internal server error');
  }
};

app.get('/mcp', handleSessionRequest);

app.delete('/mcp', handleSessionRequest);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    activeSessions: Object.keys(transports).length
  });
});

app.get('/', (req, res) => {
  res.json({
    name: "Last Mile MCP Server",
    version: "1.0.0",
    transport: "StreamableHTTP",
    endpoints: {
      mcp: {
        post: "/mcp - Client-to-server communication",
        get: "/mcp - Server-to-client SSE notifications", 
        delete: "/mcp - Session termination"
      },
      health: "/health - Health check",
      sessions: "/sessions - Active sessions info"
    },
    activeSessions: Object.keys(transports).length
  });
});

app.get('/sessions', (req, res) => {
  const sessions = Object.keys(transports).map(sessionId => ({
    sessionId,
    created: new Date().toISOString()
  }));
  
  res.json({
    count: sessions.length,
    sessions
  });
});

const cleanup = () => {
  console.log('Shutting down gracefully...');
  
  Object.values(transports).forEach(transport => {
    try {
      transport.close?.();
    } catch (error) {
      console.error('Error closing transport:', error);
    }
  });
  
  process.exit(0);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 MCP Server running on port ${port}`);
  console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});
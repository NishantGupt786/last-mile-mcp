import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "../lib/database.js";
import { run } from "node:test";
import { randomUUID } from "crypto";

export function registerSamplings(server: McpServer) {
  server.tool(
    "create-random-user",
    "Generate and create a new customer account using AI-generated realistic fake data including name, email, address, and phone number. Use this for testing, demonstration purposes, or populating development databases with sample customer data that looks authentic.",
    {
      title: "Create Random User",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async () => {
      const res = await server.server.request(
        {
          method: "sampling/createMessage",
          params: {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Generate fake user data. The user should have a realistic name, email, address, and phone number. Return this data as a JSON object with no other text or formatter so it can be used with JSON.parse.",
                },
              },
            ],
            maxTokens: 1024,
          },
        },
        CreateMessageResultSchema
      );

      if (res.content.type !== "text") {
        return {
          content: [{ type: "text", text: "Failed to generate user data" }],
        };
      }

      try {
        const fakeUser = JSON.parse(
          res.content.text
            .trim()
            .replace(/^```json/, "")
            .replace(/```$/, "")
            .trim()
        );

        const id = await prisma.user
          .create({ data: fakeUser })
          .then((r) => r.id);
        return {
          content: [{ type: "text", text: `User ${id} created successfully` }],
        };
      } catch {
        return {
          content: [{ type: "text", text: "Failed to generate user data" }],
        };
      }
    }
  );

  server.tool(
    "analyze-evidence",
    "Perform AI-powered analysis of incident evidence to automatically assess severity, determine fault, and provide structured evaluation results. Uses advanced reasoning to examine incident descriptions and metadata, returning confidence-scored verdicts and explanatory summaries. Essential for automated incident triage and investigation support.",
    {
      title: "Analyze Evidence",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async (params: { incidentId?: number }) => {
      if (!params?.incidentId) {
        return {
          content: [{ type: "text", text: "No incidentId provided" }],
        };
      }

      const incident = await prisma.incident.findUnique({
        where: { id: params.incidentId },
        select: { description: true, metadata: true },
      });

      if (!incident) {
        return {
          content: [
            {
              type: "text",
              text: `No incident found for id ${params.incidentId}`,
            },
          ],
        };
      }

      const res = await server.server.request(
        {
          method: "sampling/createMessage",
          params: {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `You are an expert incident investigator. 
Your task is to analyze the following incident and provide a JSON object with your assessment.

Incident details:
${JSON.stringify(incident, null, 2)}

Instructions for output:
- Output ONLY valid JSON — no explanations, no markdown, no extra text.
- The JSON must have exactly these keys:
  1. "verdict": one of ["severe", "moderate", "minor", "inconclusive"]
  2. "confidence": a number between 0 and 1 (representing how certain you are in your verdict)
  3. "summary": a concise 1-2 sentence explanation of your reasoning

Example output format:
{
  "verdict": "moderate",
  "confidence": 0.78,
  "summary": "The incident shows property damage but no injuries, suggesting a moderate severity."
}

Now provide your JSON response based on the incident.`,
                },
              },
            ],
            maxTokens: 1024,
          },
        },
        CreateMessageResultSchema
      );

      if (res.content.type !== "text") {
        return {
          content: [{ type: "text", text: "Failed to analyze incident" }],
        };
      }

      try {
        const analysis = JSON.parse(
          res.content.text
            .trim()
            .replace(/^```json/, "")
            .replace(/```$/, "")
            .trim()
        );

        return {
          content: [
            {
              type: "text",
              text: `Verdict: ${analysis.verdict}\nConfidence: ${analysis.confidence}\nSummary: ${analysis.summary}`,
            },
          ],
        };
      } catch {
        return {
          content: [{ type: "text", text: "Failed to parse LLM analysis" }],
        };
      }
    }
  );

  server.tool(
    "create-random-food-delivery-incident",
    "Generate realistic food delivery incident scenarios with AI-created contextual details including incident types (late delivery, missing items, damaged food, driver issues, merchant delays), severity levels, reporter information, and metadata. Use this for testing incident handling workflows, training AI systems, or populating databases with diverse incident examples.",
    {
      title: "Create Random Food Delivery Incident",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async () => {
      const res = await server.server.request(
        {
          method: "sampling/createMessage",
          params: {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Generate realistic fake incident data for a food delivery platform.
                Return a valid JSON object only with these fields:
                {
                  "description": "clear description of the incident in food delivery context",
                  "metadata": {
                    "location": "city, area",
                    "severity": "low | medium | high | critical",
                    "reporterName": "realistic full name",
                    "reportedAt": "ISO timestamp",
                    "incidentType": "one of: late_delivery, missing_item, damaged_food, driver_behavior, merchant_delay",
                    "orderId": "random numeric order ID",
                    "additionalNotes": "extra contextual details"
                  }
                }
                Ensure it sounds like a real food delivery scenario.`,
                },
              },
            ],
            maxTokens: 1024,
          },
        },
        CreateMessageResultSchema
      );

      if (res.content.type !== "text") {
        return {
          content: [{ type: "text", text: "Failed to generate incident data" }],
        };
      }

      try {
        const fakeIncident = JSON.parse(
          res.content.text
            .trim()
            .replace(/^```json/, "")
            .replace(/```$/, "")
            .trim()
        );

        const incident = await prisma.incident.create({
          data: {
            scenarioId: randomUUID(),
            description: fakeIncident.description ?? "",
            metadata: fakeIncident.metadata
              ? JSON.stringify(fakeIncident.metadata, null, 2)
              : null,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `Incident ${incident.id} created successfully`,
            },
          ],
        };
      } catch {
        return {
          content: [{ type: "text", text: "Failed to parse incident data" }],
        };
      }
    }
  );

  server.tool(
    "create-random-driver",
    "Generate and create a new driver account using AI-generated realistic fake data including name, phone number, status, and coordinates for a specific location. The location parameter allows you to specify where the driver should be based (e.g., 'Mumbai', 'New York', 'London'). The driver will be assigned a random status of idle by default.",
    {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location/region where the driver should be based",
        },
      },
      required: ["location"],
    },
    async (args) => {
      try {
        let location;

        if (typeof args === "string") {
          location = args;
        } else if (args && typeof args === "object") {
          location =
            args.location || args["location"] || Object.values(args)[0];
        } else {
          location = "Indiranager, Bangalore";
        }

        console.log("Resolved location:", location);

        const res = await server.server.request(
          {
            method: "sampling/createMessage",
            params: {
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: `Generate fake driver data for a delivery driver based in ${location}. The driver should have:
- A realistic name (first and last name)
- Phone number (realistic format for the region)  
- State: "idle" (driver status, not geographical state)
- Latitude coordinate (realistic for ${location} city center area)
- Longitude coordinate (realistic for ${location} city center area)

For coordinates, provide realistic lat/lng values that would place the driver within ${location}. Use your knowledge of major city coordinates and add slight variation to simulate different locations within the city.

Return this data as a JSON object with exactly these keys: name, phone, state, lat, lng. Include no other text or formatting so it can be used with JSON.parse.`,
                  },
                },
              ],
              maxTokens: 512,
            },
          },
          CreateMessageResultSchema
        );

        if (res.content.type !== "text") {
          return {
            content: [
              {
                type: "text",
                text: "Failed to generate driver data - invalid response type",
              },
            ],
          };
        }

        try {
          // Enhanced JSON parsing to handle various formats
          const fakeDriver = JSON.parse(
            res.content.text
              .trim()
              .replace(/^```json/, "")
              .replace(/```$/, "")
              .trim()
          );

          // Validate required fields with better error messages
          if (!fakeDriver.name) {
            throw new Error("Missing 'name' field");
          }
          if (!fakeDriver.state) {
            throw new Error("Missing 'state' field");
          }
          if (typeof fakeDriver.lat !== "number") {
            throw new Error("'lat' must be a number");
          }
          if (typeof fakeDriver.lng !== "number") {
            throw new Error("'lng' must be a number");
          }

          // Ensure state is valid
          const validStates = ["idle", "enroute", "offline"];
          if (!validStates.includes(fakeDriver.state)) {
            fakeDriver.state = "idle"; // Default to idle if invalid
          }

          // Round coordinates to reasonable precision
          fakeDriver.lat = parseFloat(fakeDriver.lat.toFixed(6));
          fakeDriver.lng = parseFloat(fakeDriver.lng.toFixed(6));

          const id = await prisma.driver
            .create({ data: fakeDriver })
            .then((r) => r.id);

          return {
            content: [
              {
                type: "text",
                text: `Driver ${id} created successfully in ${location} at coordinates (${fakeDriver.lat}, ${fakeDriver.lng}) with status: ${fakeDriver.state}`,
              },
            ],
          };
        } catch (parseError: any) {
          console.error("JSON Parse Error:", parseError);
          console.error("Raw response:", res.content.text);
          return {
            content: [
              {
                type: "text",
                text: `Failed to parse driver data: ${
                  parseError.message
                }. Raw response: ${res.content.text.substring(0, 200)}...`,
              },
            ],
          };
        }
      } catch (error: any) {
        console.error("Tool execution error:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to create driver: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}

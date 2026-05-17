import cors from "cors";
import express from "express";
import { analyzeWebsite } from "./analysisService";
import { generateExperimentsWithAI } from "./services/experimentService";
import { runAgentAnalysis } from "./services/agentService";
import { AnalysisServiceError } from "./services/analysisError";
import type { AgentObservation, AnalysisProgressEvent, AnalysisRequest, ExperimentRequest } from "../../shared/analysis.ts";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/analyze", async (request, response) => {
  const body = request.body as Partial<AnalysisRequest> | undefined;

  if (!body?.url || typeof body.url !== "string") {
    response.status(400).json({
      message: "A valid URL is required.",
    });
    return;
  }

  console.log("[analyze] incoming URL:", body.url);

  try {
    const parsedUrl = new URL(body.url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      response.status(400).json({
        message: "Please submit an http:// or https:// website URL.",
      });
      return;
    }

    const analysis = await analyzeWebsite({ url: parsedUrl.toString() });
    response.json(analysis);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "We could not prepare the analysis request for that website.",
    });
  }
});

app.post("/api/analyze/stream", async (request, response) => {
  const body = request.body as Partial<AnalysisRequest> | undefined;

  if (!body?.url || typeof body.url !== "string") {
    response.status(400).json({ message: "A valid URL is required." });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    response.status(400).json({ message: "Invalid URL." });
    return;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    response.status(400).json({ message: "Please submit an http:// or https:// website URL." });
    return;
  }

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const emit = (eventName: string, data: unknown) => {
    response.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  console.log("[stream] incoming URL:", body.url);

  try {
    const analysis = await analyzeWebsite(
      { url: parsedUrl.toString() },
      (event: AnalysisProgressEvent) => emit("progress", event),
    );
    emit("result", analysis);
  } catch (error) {
    emit("error", {
      message: error instanceof Error
        ? error.message
        : "We could not prepare the analysis request for that website.",
    });
  } finally {
    response.end();
  }
});

app.post("/api/experiments", async (request, response) => {
  const body = request.body as Partial<ExperimentRequest> | undefined;

  if (!Array.isArray(body?.issues) || body.issues.length === 0) {
    response.status(400).json({ message: "issues[] is required." });
    return;
  }

  if (!Array.isArray(body?.techStack)) {
    response.status(400).json({ message: "techStack[] is required." });
    return;
  }

  try {
    const experiments = await generateExperimentsWithAI(body as ExperimentRequest);
    response.json({ experiments });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Could not generate experiment suggestions.",
    });
  }
});

app.post("/api/agent-analyze", async (request, response) => {
  const body = request.body as Partial<AnalysisRequest> | undefined;

  if (!body?.url || typeof body.url !== "string") {
    response.status(400).json({ message: "A valid URL is required." });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    response.status(400).json({ message: "Invalid URL." });
    return;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    response.status(400).json({ message: "Please submit an http:// or https:// website URL." });
    return;
  }

  console.log("[agent] incoming URL:", body.url);

  try {
    const session = await runAgentAnalysis(parsedUrl.toString());
    response.json(session);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Agent analysis failed.",
    });
  }
});

app.get("/api/agent-analyze/stream", async (request, response) => {
  const rawUrl = request.query.url;

  if (!rawUrl || typeof rawUrl !== "string") {
    response.status(400).json({ message: "A valid url query parameter is required." });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    response.status(400).json({ message: "Invalid URL." });
    return;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    response.status(400).json({ message: "Please submit an http:// or https:// website URL." });
    return;
  }

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const emit = (eventName: string, data: unknown) => {
    response.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  console.log("[agent-stream] incoming URL:", rawUrl);

  try {
    const session = await runAgentAnalysis(
      parsedUrl.toString(),
      (obs: AgentObservation) => emit("observation", obs),
    );
    emit("result", session);
  } catch (error) {
    emit("error", {
      message: error instanceof Error ? error.message : "Agent analysis failed.",
    });
  } finally {
    response.end();
  }
});

app.listen(port, () => {
  console.log(`Analyzer backend listening on http://localhost:${port}`);
});

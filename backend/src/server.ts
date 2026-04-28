import cors from "cors";
import express from "express";
import { analyzeWebsite } from "./analysisService";
import { generateExperimentsWithAI } from "./services/experimentService";
import { AnalysisServiceError } from "./services/analysisError";
import type { AnalysisRequest, ExperimentRequest } from "../../shared/analysis.ts";

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

app.listen(port, () => {
  console.log(`Analyzer backend listening on http://localhost:${port}`);
});

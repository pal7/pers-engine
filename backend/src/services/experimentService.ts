import { AzureOpenAI } from 'openai/azure'
import type { AnalysisExperiment, ExperimentRequest } from '../../../shared/analysis.ts'
import { generateExperiments } from './generateExperiments'

// --- tool definitions ---

const TARGET_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_target_experiment',
    description: 'Design an Adobe Target A/B, XT, MVT, or Auto-Target activity for this issue.',
    parameters: {
      type: 'object',
      properties: {
        activityType:      { type: 'string', enum: ['A/B', 'XT', 'MVT', 'Auto-Target'] },
        activityName:      { type: 'string' },
        hypothesis:        { type: 'string' },
        vecSelector:       { type: 'string', description: 'CSS selector for the VEC element to modify' },
        controlExperience: { type: 'string' },
        variantExperience: { type: 'string' },
        primaryMetric:     { type: 'string' },
        audienceRule:      { type: 'string', description: 'XT only — audience targeting rule' },
      },
      required: ['activityType', 'activityName', 'hypothesis', 'vecSelector',
                 'controlExperience', 'variantExperience', 'primaryMetric'],
    },
  },
}

const OPTIMIZELY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_optimizely_experiment',
    description: 'Design an Optimizely A/B test, multivariate, or feature flag experiment.',
    parameters: {
      type: 'object',
      properties: {
        experimentType: { type: 'string', enum: ['a/b', 'multivariate', 'feature_flag'] },
        experimentName: { type: 'string' },
        hypothesis:     { type: 'string' },
        variations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name:    { type: 'string' },
              changes: { type: 'string' },
            },
            required: ['name', 'changes'],
          },
        },
        primaryMetric:      { type: 'string' },
        audienceConditions: { type: 'string' },
      },
      required: ['experimentType', 'experimentName', 'hypothesis', 'variations', 'primaryMetric'],
    },
  },
}

const VWO_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_vwo_experiment',
    description: 'Design a VWO A/B, Split URL, or Multivariate campaign.',
    parameters: {
      type: 'object',
      properties: {
        campaignType: { type: 'string', enum: ['AB', 'Split URL', 'Multivariate'] },
        hypothesis:   { type: 'string' },
        control:      { type: 'string' },
        variation:    { type: 'string' },
        primaryGoal:  { type: 'string' },
      },
      required: ['campaignType', 'hypothesis', 'control', 'variation', 'primaryGoal'],
    },
  },
}

const GENERIC_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_generic_experiment',
    description: 'Design a generic A/B, MVT, or Feature Flag experiment when no specific platform is detected.',
    parameters: {
      type: 'object',
      properties: {
        experimentType: { type: 'string', enum: ['A/B', 'MVT', 'Feature Flag'] },
        hypothesis:     { type: 'string' },
        control:        { type: 'string' },
        variant:        { type: 'string' },
        metric:         { type: 'string' },
      },
      required: ['experimentType', 'hypothesis', 'control', 'variant', 'metric'],
    },
  },
}

function buildTools(techStack: ExperimentRequest['techStack']) {
  const names = techStack.map((t) => t.name)
  return [
    ...(names.includes('Adobe Target') ? [TARGET_TOOL]     : []),
    ...(names.includes('Optimizely')   ? [OPTIMIZELY_TOOL] : []),
    ...(names.includes('VWO')          ? [VWO_TOOL]        : []),
    GENERIC_TOOL,
  ]
}

// --- prompt ---

function buildExperimentPrompt(request: ExperimentRequest): string {
  const issueList = request.issues
    .map((i) => `- id: ${i.id} | ${i.severity.toUpperCase()} | ${i.title}: ${i.detail}`)
    .join('\n')

  const techLine =
    request.techStack.length > 0
      ? request.techStack.map((t) => t.name).join(', ')
      : 'None detected'

  const ctaLine =
    request.pageContext.ctaTexts.length > 0
      ? request.pageContext.ctaTexts.join(', ')
      : 'None detected'

  const trustLine =
    request.pageContext.trustSignalKeywords.length > 0
      ? request.pageContext.trustSignalKeywords.join(', ')
      : 'None detected'

  return `Design one experiment for each issue listed below. Call one tool per issue. Set the experiment id to match the issue id exactly.

ISSUES TO ADDRESS
${issueList}

PAGE CONTEXT
URL: ${request.pageContext.url}
Summary: ${request.pageContext.summary}
Page category: ${request.pageContext.pageType}
Hero text: ${request.pageContext.heroText || 'Not detected'}
Candidate CTAs: ${ctaLine}
Trust signal keywords: ${trustLine}
Detected tech stack: ${techLine}`
}

// --- tool call → AnalysisExperiment mapping ---

function mapToolCall(
  toolName: string,
  args: Record<string, unknown>,
  issueId: string,
): AnalysisExperiment {
  switch (toolName) {
    case 'create_target_experiment': {
      const hint = [
        `Create ${args.activityType} activity: "${args.activityName}".`,
        `VEC selector: ${args.vecSelector}.`,
        `Control: ${args.controlExperience}.`,
        `Variant: ${args.variantExperience}.`,
        args.audienceRule ? `Audience rule: ${args.audienceRule}.` : '',
      ]
        .filter(Boolean)
        .join(' ')
      return {
        id: issueId,
        title: `Adobe Target ${args.activityType}: ${args.activityName}`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: `${args.controlExperience} → ${args.variantExperience}`,
        metric: String(args.primaryMetric ?? ''),
        impact: '',
        confidence: 'Medium',
        implementationHint: hint,
      }
    }
    case 'create_optimizely_experiment': {
      const variations = (args.variations as Array<{ name: string; changes: string }>) ?? []
      const variantSummary = variations.map((v) => `${v.name}: ${v.changes}`).join('; ')
      const hint = [
        `Create ${args.experimentType} experiment: "${args.experimentName}".`,
        `Variations: ${variantSummary}.`,
        args.audienceConditions ? `Audience: ${args.audienceConditions}.` : '',
      ]
        .filter(Boolean)
        .join(' ')
      return {
        id: issueId,
        title: `Optimizely ${args.experimentType}: ${args.experimentName}`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: variantSummary,
        metric: String(args.primaryMetric ?? ''),
        impact: '',
        confidence: 'Medium',
        implementationHint: hint,
      }
    }
    case 'create_vwo_experiment': {
      return {
        id: issueId,
        title: `VWO ${args.campaignType}`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: String(args.variation ?? ''),
        metric: String(args.primaryGoal ?? ''),
        impact: '',
        confidence: 'Medium',
        implementationHint: `Create ${args.campaignType} campaign. Control: ${args.control}. Variation: ${args.variation}.`,
      }
    }
    default: {
      return {
        id: issueId,
        title: `${args.experimentType} test`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: String(args.variant ?? ''),
        metric: String(args.metric ?? ''),
        impact: '',
        confidence: 'Medium',
      }
    }
  }
}

// --- main export ---

export async function generateExperimentsWithAI(
  request: ExperimentRequest,
): Promise<AnalysisExperiment[]> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5.2'

  if (!apiKey || !endpoint) {
    console.warn('[experiments] AZURE_OPENAI_KEY not set, using template fallback')
    return generateExperiments(request.issues, request.evidence)
  }

  const tools = buildTools(request.techStack)

  try {
    const client = new AzureOpenAI({
      endpoint,
      apiKey,
      deployment,
      apiVersion: '2025-01-01-preview',
      timeout: 30_000,
    })

    const completion = await client.chat.completions.create({
      model: deployment,
      tools,
      tool_choice: 'required',
      messages: [
        {
          role: 'system',
          content: [
            'You are a senior experimentation strategist with deep expertise in Adobe Target, Optimizely, VWO, and A/B testing.',
            'For each issue provided, design exactly one experiment using the most appropriate tool based on the detected tech stack.',
            '',
            'Rules:',
            '- One tool call per issue — match the experiment id to the issue id',
            '- Use platform-specific tools only when that platform is in the detected stack',
            '- Use create_generic_experiment for all other cases',
            '- Hypothesis format: If we [specific change referencing page signals], we expect [measurable outcome] because [reason grounded in observed data]',
            '- Reference specific signals from pageContext in every hypothesis',
            '- primaryMetric must be specific: not "engagement" but "primary CTA click rate" or "form completion rate"',
          ].join('\n'),
        },
        {
          role: 'user',
          content: buildExperimentPrompt(request),
        },
      ],
    })

    const toolCalls = completion.choices[0]?.message?.tool_calls ?? []

    if (toolCalls.length === 0) {
      console.warn('[experiments] GPT returned no tool calls, using template fallback')
      return generateExperiments(request.issues, request.evidence)
    }

    const experimentMap = new Map<string, AnalysisExperiment>()

    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i]
      if (call.type !== 'function') continue
      try {
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>
        const issueId = request.issues[i]?.id ?? `experiment-${i + 1}`
        experimentMap.set(issueId, mapToolCall(call.function.name, args, issueId))
      } catch {
        // malformed tool call — gap filled below by template
      }
    }

    const templateFallbacks = generateExperiments(request.issues, request.evidence)

    return request.issues.map((issue, i) => {
      return (
        experimentMap.get(issue.id) ??
        templateFallbacks[i] ?? {
          id: issue.id,
          title: `Experiment for ${issue.title}`,
          hypothesis: '',
          variant: '',
          metric: '',
          impact: '',
          confidence: 'Low' as const,
        }
      )
    })
  } catch (error) {
    console.error(
      '[experiments] GPT tool call failed, using template fallback:',
      error instanceof Error ? error.message : String(error),
    )
    return generateExperiments(request.issues, request.evidence)
  }
}

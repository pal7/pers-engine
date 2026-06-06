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
        activityType:      { type: 'string', enum: ['A/B', 'XT', 'MVT', 'Auto-Target', 'Automated Personalization'] },
        activityName:      { type: 'string', description: 'Max 5 words, plain English, no jargon' },
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
    description: 'Design an Adobe Target-style experiment when no specific platform is detected. Use the Adobe Target activity type vocabulary.',
    parameters: {
      type: 'object',
      properties: {
        experimentType: { type: 'string', enum: ['A/B', 'XT', 'MVT', 'Auto-Target', 'Automated Personalization'] },
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

  const comparableSection =
    request.comparableSites && request.comparableSites.length > 0
      ? '\n\nCOMPARABLE BUSINESSES\nThese sites share a similar business model. Where relevant, reference what works for them to justify your experiment hypotheses:\n' +
        request.comparableSites
          .map((s, i) => {
            const profile = [s.businessType, s.productCategory, s.audience, s.industryVertical]
              .filter(Boolean).join(' | ')
            return `${i + 1}. ${s.url}${profile ? ` — ${profile}` : ''}\n   ${s.summary}`
          })
          .join('\n')
      : ''

  const agentSection = request.agentSummary
    ? `\n\nBROWSER AGENT OBSERVATIONS\nFrom a live browser session:\n${request.agentSummary}`
    : ''

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
Detected tech stack: ${techLine}${comparableSection}${agentSection}`
}

// --- tool call → AnalysisExperiment mapping ---

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  'A/B':                      'A/B Test',
  'a/b':                      'A/B Test',
  'AB':                       'A/B Test',
  'XT':                       'Experience Targeting',
  'MVT':                      'Multivariate Test',
  'multivariate':             'Multivariate Test',
  'Multivariate':             'Multivariate Test',
  'Auto-Target':              'Auto-Target',
  'Automated Personalization':'Automated Personalization',
  'feature_flag':             'Feature Flag',
  'Feature Flag':             'Feature Flag',
  'Split URL':                'Split URL Test',
}

function formatType(raw: unknown): string {
  const s = String(raw ?? '')
  return ACTIVITY_TYPE_LABELS[s] ?? s
}

function mapToolCall(
  toolName: string,
  args: Record<string, unknown>,
  issueId: string,
): AnalysisExperiment {
  switch (toolName) {
    case 'create_target_experiment': {
      const hint = [
        `VEC selector: ${args.vecSelector}.`,
        args.audienceRule ? `Audience: ${args.audienceRule}.` : '',
      ]
        .filter(Boolean)
        .join(' ')
      return {
        id: issueId,
        title: `${formatType(args.activityType)}: ${args.activityName}`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: `${args.controlExperience} → ${args.variantExperience}`,
        metric: String(args.primaryMetric ?? ''),
        impact: '',
        confidence: 'Medium',
        implementationHint: hint || undefined,
      }
    }
    case 'create_optimizely_experiment': {
      const variations = (args.variations as Array<{ name: string; changes: string }>) ?? []
      const variantSummary = variations.map((v) => `${v.name}: ${v.changes}`).join('; ')
      return {
        id: issueId,
        title: `${formatType(args.experimentType)}: ${args.experimentName}`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: variantSummary,
        metric: String(args.primaryMetric ?? ''),
        impact: '',
        confidence: 'Medium',
        implementationHint: args.audienceConditions ? `Audience: ${args.audienceConditions}` : undefined,
      }
    }
    case 'create_vwo_experiment': {
      return {
        id: issueId,
        title: `${formatType(args.campaignType)}: ${issueId.replace(/-/g, ' ')}`,
        hypothesis: String(args.hypothesis ?? ''),
        variant: `${args.control} → ${args.variation}`,
        metric: String(args.primaryGoal ?? ''),
        impact: '',
        confidence: 'Medium',
      }
    }
    default: {
      return {
        id: issueId,
        title: `${formatType(args.experimentType)}: ${issueId.replace(/-/g, ' ')}`,
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
      max_completion_tokens: 1024,
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
            '- Vary the activity type across issues — do not use A/B for every issue. Choose the type that best fits:',
            '    A/B — single copy, layout, or design change; one variable at a time',
            '    XT (Experience Targeting) — different experience for a specific audience segment (new vs returning, mobile vs desktop)',
            '    MVT — test multiple page elements simultaneously; needs higher traffic',
            '    Auto-Target — ML picks the best experience per visitor from a defined set',
            '    Automated Personalization — 1-to-1 ML personalisation; highest-traffic pages only',
            '',
            'Brevity rules — keep every field short and plain:',
            '- activityName / experimentName: max 5 words, plain English, no jargon (e.g. "Simplify hero buttons", "Add trust badges")',
            '- Hypothesis: exactly 2 sentences. Sentence 1: what changes and why it should help. Sentence 2: what metric improves. No URLs, no parentheticals, no lists.',
            '- controlExperience / variantExperience / control / variant: 1 short sentence each — describe what the visitor sees, not the code',
            '- primaryMetric / metric: a short phrase only (e.g. "main button click rate", "form completion rate") — not a full sentence',
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

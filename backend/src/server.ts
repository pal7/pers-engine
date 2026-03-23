import cors from 'cors'
import express from 'express'
import { analyzeWebsite } from './analysisService'
import type { AnalysisRequest } from '../../src/types/analysis'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post('/api/analyze', async (request, response) => {
  const body = request.body as Partial<AnalysisRequest> | undefined

  if (!body?.url || typeof body.url !== 'string') {
    response.status(400).json({
      message: 'A valid URL is required.',
    })
    return
  }

  try {
    const analysis = await analyzeWebsite({ url: body.url })
    response.json(analysis)
  } catch {
    response.status(500).json({
      message: 'We could not prepare the analysis request for that website.',
    })
  }
})

app.listen(port, () => {
  console.log(`Analyzer backend listening on http://localhost:${port}`)
})

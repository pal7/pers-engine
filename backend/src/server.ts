import cors from 'cors'
import express from 'express'
import { analyzeWebsite } from './analysisService'
import { AnalysisServiceError } from './services/analysisError'
import type { AnalysisRequest } from '../../shared/analysis.ts'

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

  console.log('[analyze] incoming URL:', body.url)

  try {
    const parsedUrl = new URL(body.url)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      response.status(400).json({
        message: 'Please submit an http:// or https:// website URL.',
      })
      return
    }

    const analysis = await analyzeWebsite({ url: parsedUrl.toString() })
    response.json(analysis)
  } catch (error) {
<<<<<<< HEAD
    if (error instanceof AnalysisServiceError) {
      console.error('[analyze] request failed:', error.message)
      response.status(error.statusCode).json({
        message: error.message,
      })
      return
    }

    console.error('[analyze] unexpected failure:', error)
=======
>>>>>>> b908bc75df7938daea8c55056ae7fdf3b51ab876
    response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : 'We could not prepare the analysis request for that website.',
    })
  }
})

app.listen(port, () => {
  console.log(`Analyzer backend listening on http://localhost:${port}`)
})
<<<<<<< HEAD
=======

>>>>>>> b908bc75df7938daea8c55056ae7fdf3b51ab876

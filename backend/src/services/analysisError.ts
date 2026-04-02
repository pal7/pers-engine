export class AnalysisServiceError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'AnalysisServiceError'
    this.statusCode = statusCode
  }
}

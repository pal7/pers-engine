import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())

export type LaunchOptions = {
  headless?: boolean
  executablePath?: string | undefined
}

export function launchStealth(options: LaunchOptions = {}) {
  return chromium.launch({
    headless: options.headless ?? true,
    executablePath: options.executablePath,
  })
}

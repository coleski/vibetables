import { enumValues } from '@conar/shared/utils/helpers'
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export enum AiProvider {
  Anthropic = 'anthropic',
  OpenAI = 'openai',
  Google = 'google',
  XAI = 'xai',
}

export const aiProvider = pgEnum('ai_provider', enumValues(AiProvider))

export const apiKeys = pgTable('api_keys', {
  id: text().primaryKey(),
  provider: aiProvider().notNull(),
  nickname: text(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})

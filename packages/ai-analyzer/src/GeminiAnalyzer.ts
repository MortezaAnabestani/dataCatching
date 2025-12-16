import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Article,
  AnalysisResult,
  SentimentAnalysis,
  Entity,
  SentimentType,
  GEMINI_CONFIG,
  chunkArray,
} from '@media-intelligence/shared';
import { logger } from './logger';

export interface AnalyzerConfig {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  batchSize?: number;
}

export class GeminiAnalyzer {
  private client: GoogleGenerativeAI;
  private config: Required<AnalyzerConfig>;
  private model: any;

  constructor(config: AnalyzerConfig) {
    this.config = {
      model: GEMINI_CONFIG.model,
      maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
      temperature: GEMINI_CONFIG.temperature,
      batchSize: GEMINI_CONFIG.batchSize,
      ...config,
    };

    this.client = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });

    logger.info('Gemini Analyzer initialized', {
      model: this.config.model,
      batchSize: this.config.batchSize,
    });
  }

  /**
   * تحلیل یک مقاله
   */
  async analyzeArticle(article: Article): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('Analyzing article', { articleId: article._id, title: article.title });

      const prompt = this.buildAnalysisPrompt(article);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const analysisText = response.text();

      const analysis = this.parseAnalysisResponse(analysisText);

      const analysisResult: AnalysisResult = {
        articleId: article._id!,
        sentiment: analysis.sentiment,
        topics: analysis.topics,
        entities: analysis.entities,
        keywords: analysis.keywords,
        summary: analysis.summary,
        language: 'fa',
        processingTime: Date.now() - startTime,
        createdAt: new Date(),
      };

      logger.info('Article analysis completed', {
        articleId: article._id,
        processingTime: analysisResult.processingTime,
      });

      return analysisResult;
    } catch (error) {
      logger.error('Failed to analyze article', {
        articleId: article._id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * تحلیل دسته‌ای چندین مقاله
   */
  async analyzeArticles(articles: Article[]): Promise<AnalysisResult[]> {
    logger.info(`Starting batch analysis of ${articles.length} articles`);

    const results: AnalysisResult[] = [];
    const batches = chunkArray(articles, this.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1}/${batches.length}`, { batchSize: batch.length });

      const batchResults = await Promise.allSettled(
        batch.map((article) => this.analyzeArticle(article))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Batch analysis item failed', { error: result.reason });
        }
      }

      // تاخیر کوچک بین بچ‌ها برای رعایت محدودیت نرخ
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Batch analysis completed`, {
      total: articles.length,
      successful: results.length,
      failed: articles.length - results.length,
    });

    return results;
  }

  /**
   * تحلیل احساسات از متن
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    try {
      const prompt = `تحلیل احساسات متن زیر را انجام بده و نتیجه را به صورت JSON برگردان:

متن: "${text}"

فرمت پاسخ:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "score": عدد بین -1 تا 1,
  "confidence": عدد بین 0 تا 1
}

فقط JSON را برگردان، بدون توضیح اضافه.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // پاکسازی متن و استخراج JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const sentiment = JSON.parse(jsonMatch[0]);

      return {
        sentiment: sentiment.sentiment as SentimentType,
        score: sentiment.score,
        confidence: sentiment.confidence,
      };
    } catch (error) {
      logger.error('Sentiment analysis failed', { error });
      throw error;
    }
  }

  /**
   * استخراج موضوعات از مقالات
   */
  async extractTopics(articles: Article[], limit: number = 10): Promise<string[]> {
    try {
      const titles = articles.map((a) => a.title).join('\n');
      const prompt = `از عناوین خبری زیر، ${limit} موضوع اصلی را استخراج کن:

${titles}

موضوعات را به صورت یک آرایه JSON برگردان. فقط JSON را برگردان، بدون توضیح اضافه.

مثال: ["اقتصاد", "سیاست", "ورزش"]`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Topic extraction failed', { error });
      throw error;
    }
  }

  /**
   * ساخت پرامپت تحلیل برای Gemini
   */
  private buildAnalysisPrompt(article: Article): string {
    return `لطفاً مقاله خبری زیر را به صورت جامع تحلیل کن و نتایج را به فرمت JSON برگردان:

عنوان: ${article.title}
متن: ${article.content.substring(0, 5000)}

تحلیل های مورد نیاز:
1. احساسات (sentiment): مثبت، منفی، خنثی، یا مختلط
2. موضوعات اصلی (topics): حداکثر 5 موضوع
3. موجودیت های نامدار (entities): افراد، سازمان ها، مکان ها، رویدادها
4. کلمات کلیدی (keywords): حداکثر 10 کلمه کلیدی
5. خلاصه (summary): خلاصه ای در 2-3 جمله

فرمت JSON مورد انتظار:
{
  "sentiment": {
    "sentiment": "positive" | "negative" | "neutral" | "mixed",
    "score": عدد بین -1 تا 1,
    "confidence": عدد بین 0 تا 1
  },
  "topics": ["موضوع1", "موضوع2", ...],
  "entities": [
    {
      "text": "نام موجودیت",
      "type": "PERSON" | "ORGANIZATION" | "LOCATION" | "DATE" | "EVENT" | "OTHER",
      "relevance": عدد بین 0 تا 1
    }
  ],
  "keywords": ["کلمه1", "کلمه2", ...],
  "summary": "خلاصه مقاله"
}

فقط JSON را برگردان، بدون توضیح اضافه.`;
  }

  /**
   * پردازش پاسخ تحلیل از Gemini
   */
  private parseAnalysisResponse(responseText: string): {
    sentiment: SentimentAnalysis;
    topics: string[];
    entities: Entity[];
    keywords: string[];
    summary?: string;
  } {
    try {
      // استخراج JSON از پاسخ
      let jsonText = responseText.trim();

      // حذف markdown code blocks اگر وجود داشت
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // استخراج JSON با regex
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        sentiment: {
          sentiment: parsed.sentiment.sentiment as SentimentType,
          score: parsed.sentiment.score,
          confidence: parsed.sentiment.confidence,
        },
        topics: parsed.topics || [],
        entities: parsed.entities || [],
        keywords: parsed.keywords || [],
        summary: parsed.summary,
      };
    } catch (error) {
      logger.error('Failed to parse analysis response', { responseText, error });
      throw new Error('Invalid analysis response format');
    }
  }
}

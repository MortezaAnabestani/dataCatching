// Export database connection
export { Database, db } from './connection';
export type { DatabaseConfig } from './connection';

// Export all models
export { SourceModel } from './models/Source';
export type { SourceDocument } from './models/Source';
export { ArticleModel } from './models/Article';
export type { ArticleDocument } from './models/Article';
export { AnalysisResultModel } from './models/AnalysisResult';
export type { AnalysisResultDocument } from './models/AnalysisResult';
export { TopicModel } from './models/Topic';
export type { TopicDocument } from './models/Topic';
export { TrendModel } from './models/Trend';
export type { TrendDocument } from './models/Trend';

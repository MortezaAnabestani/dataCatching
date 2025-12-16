import mongoose, { Schema, Document } from 'mongoose';
import {
  AnalysisResult as IAnalysisResult,
  SentimentType,
} from '@media-intelligence/shared';

export interface AnalysisResultDocument extends Omit<IAnalysisResult, '_id'>, Document {}

const EntitySchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'EVENT', 'OTHER'],
      required: true,
    },
    relevance: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
  },
  { _id: false }
);

const SentimentSchema = new Schema(
  {
    sentiment: {
      type: String,
      enum: Object.values(SentimentType),
      required: true,
    },
    score: {
      type: Number,
      min: -1,
      max: 1,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
  },
  { _id: false }
);

const AnalysisResultSchema = new Schema<AnalysisResultDocument>(
  {
    // @ts-ignore - Mongoose ObjectId type issue
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      unique: true,
      index: true,
    },
    sentiment: {
      type: SentimentSchema,
      required: true,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    entities: {
      type: [EntitySchema],
      default: [],
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      default: 'fa',
    },
    processingTime: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: 'analysis_results',
  }
);

// Indexes
AnalysisResultSchema.index({ 'sentiment.sentiment': 1 });
AnalysisResultSchema.index({ topics: 1 });
AnalysisResultSchema.index({ createdAt: -1 });

// Static method to find by sentiment
AnalysisResultSchema.statics.findBySentiment = function (sentiment: SentimentType) {
  return this.find({ 'sentiment.sentiment': sentiment }).populate('articleId');
};

// Static method to find by topics
AnalysisResultSchema.statics.findByTopics = function (topics: string[]) {
  return this.find({ topics: { $in: topics } }).populate('articleId');
};

// Static method to get sentiment distribution
AnalysisResultSchema.statics.getSentimentDistribution = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$sentiment.sentiment',
        count: { $sum: 1 },
        avgScore: { $avg: '$sentiment.score' },
      },
    },
    {
      $project: {
        sentiment: '$_id',
        count: 1,
        avgScore: 1,
        _id: 0,
      },
    },
  ]);
};

export const AnalysisResultModel = mongoose.model<AnalysisResultDocument>(
  'AnalysisResult',
  AnalysisResultSchema
);

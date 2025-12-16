import mongoose, { Schema, Document } from 'mongoose';
import { Article as IArticle, ArticleStatus } from '@media-intelligence/shared';

export interface ArticleDocument extends Omit<IArticle, '_id'>, Document {}

const ArticleSchema = new Schema<ArticleDocument>(
  {
    // @ts-ignore - Mongoose ObjectId type issue
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    content: {
      type: String,
      required: true,
      index: 'text',
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },
    author: {
      type: String,
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ArticleStatus),
      default: ArticleStatus.PENDING,
      index: true,
    },
    raw: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'articles',
  }
);

// Compound indexes for common queries
ArticleSchema.index({ sourceId: 1, publishedAt: -1 });
ArticleSchema.index({ status: 1, createdAt: -1 });
ArticleSchema.index({ publishedAt: -1 });

// Text index for full-text search
ArticleSchema.index({ title: 'text', content: 'text' });

// Method to check if article is recent (within 24 hours)
ArticleSchema.methods.isRecent = function (): boolean {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return this.publishedAt.getTime() > oneDayAgo;
};

// Static method to find articles by date range
ArticleSchema.statics.findByDateRange = function (startDate: Date, endDate: Date) {
  return this.find({
    publishedAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ publishedAt: -1 });
};

// Static method to find pending articles for analysis
ArticleSchema.statics.findPendingAnalysis = function (limit: number = 100) {
  return this.find({ status: ArticleStatus.PENDING })
    .sort({ createdAt: 1 })
    .limit(limit);
};

export const ArticleModel = mongoose.model<ArticleDocument>('Article', ArticleSchema);

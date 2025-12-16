import mongoose, { Schema, Document } from 'mongoose';
import { Source as ISource, SourceType, SourceStatus } from '@media-intelligence/shared';

export interface SourceDocument extends Omit<ISource, '_id'>, Document {}

const SourceSchema = new Schema<SourceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(SourceType),
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SourceStatus),
      default: SourceStatus.ACTIVE,
      index: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      language: {
        type: String,
        default: 'fa',
      },
      category: {
        type: String,
        index: true,
      },
      credibilityScore: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    scrapeInterval: {
      type: Number,
      default: 300000, // 5 minutes
    },
    lastScrapedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'sources',
  }
);

// Indexes
SourceSchema.index({ type: 1, status: 1 });
SourceSchema.index({ 'metadata.category': 1 });

// Virtual for next scrape time
SourceSchema.virtual('nextScrapeAt').get(function () {
  if (!this.lastScrapedAt) return new Date();
  return new Date(this.lastScrapedAt.getTime() + this.scrapeInterval);
});

// Method to check if source should be scraped
SourceSchema.methods.shouldScrape = function (): boolean {
  if (this.status !== SourceStatus.ACTIVE) return false;
  if (!this.lastScrapedAt) return true;
  return Date.now() >= this.lastScrapedAt.getTime() + this.scrapeInterval;
};

export const SourceModel = mongoose.model<SourceDocument>('Source', SourceSchema);

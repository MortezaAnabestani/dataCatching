import mongoose, { Schema, Document } from 'mongoose';
import { Trend as ITrend, SentimentType } from '@media-intelligence/shared';

export interface TrendDocument extends Omit<ITrend, '_id'>, Document {}

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

const TrendSchema = new Schema<TrendDocument>(
  {
    // @ts-ignore - Mongoose ObjectId type issue
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    articleCount: {
      type: Number,
      required: true,
      default: 0,
    },
    velocity: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    acceleration: {
      type: Number,
      required: true,
      default: 0,
    },
    // @ts-ignore - Mongoose ObjectId array type issue
    sources: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Source',
      default: [],
    },
    sentiment: {
      type: SentimentSchema,
    },
    peakTime: {
      type: Date,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    weight: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'trends',
  }
);

// Compound indexes
TrendSchema.index({ isActive: 1, weight: -1 });
TrendSchema.index({ isActive: 1, velocity: -1 });
TrendSchema.index({ startTime: -1, isActive: 1 });

// Static method to get active trends
TrendSchema.statics.getActiveTrends = function (limit: number = 20) {
  return this.find({ isActive: true })
    .sort({ weight: -1, velocity: -1 })
    .limit(limit)
    .populate('topicId')
    .populate('sources');
};

// Static method to get trending topics by time range
TrendSchema.statics.getTrendingInRange = function (startDate: Date, endDate: Date) {
  return this.find({
    startTime: { $lte: endDate },
    $or: [{ endTime: { $gte: startDate } }, { endTime: null }],
  })
    .sort({ weight: -1 })
    .populate('topicId')
    .populate('sources');
};

// Method to calculate trend weight
TrendSchema.methods.calculateWeight = function (): number {
  const velocityWeight = this.velocity * 2;
  const accelerationWeight = this.acceleration * 1.5;
  const volumeWeight = Math.log(this.articleCount + 1) * 10;
  const sourcesDiversity = this.sources.length * 5;

  // Recency bonus (higher weight for newer trends)
  const ageInHours = (Date.now() - this.startTime.getTime()) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, 50 - ageInHours * 2);

  return velocityWeight + accelerationWeight + volumeWeight + sourcesDiversity + recencyBonus;
};

// Method to update trend metrics
TrendSchema.methods.updateMetrics = async function (
  newArticleCount: number,
  timeWindowHours: number = 1
) {
  const previousVelocity = this.velocity;
  this.articleCount = newArticleCount;
  this.velocity = newArticleCount / timeWindowHours;
  this.acceleration = this.velocity - previousVelocity;
  this.weight = this.calculateWeight();

  if (this.velocity > previousVelocity && (!this.peakTime || this.velocity > previousVelocity)) {
    this.peakTime = new Date();
  }

  return this.save();
};

export const TrendModel = mongoose.model<TrendDocument>('Trend', TrendSchema);

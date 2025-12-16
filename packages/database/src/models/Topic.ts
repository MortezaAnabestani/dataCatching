import mongoose, { Schema, Document } from 'mongoose';
import { Topic as ITopic } from '@media-intelligence/shared';

export interface TopicDocument extends Omit<ITopic, '_id'>, Document {}

const TopicSchema = new Schema<TopicDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'topics',
  }
);

// Text index for searching
TopicSchema.index({ name: 'text', description: 'text' });

// Static method to find by keywords
TopicSchema.statics.findByKeywords = function (keywords: string[]) {
  return this.find({ keywords: { $in: keywords } });
};

export const TopicModel = mongoose.model<TopicDocument>('Topic', TopicSchema);

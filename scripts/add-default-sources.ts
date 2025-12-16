/**
 * Script to add all default Iranian news sources to the database
 *
 * Usage:
 *   tsx scripts/add-default-sources.ts
 */

import { SourceModel, db } from '@media-intelligence/database';
import { IRANIAN_NEWS_SOURCES, SourceType, SourceStatus } from '@media-intelligence/shared';

async function addDefaultSources() {
  try {
    console.log('🔌 Connecting to database...');
    await db.connect({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/media-intelligence',
    });

    console.log('✅ Connected to database\n');
    console.log(`📰 Adding ${IRANIAN_NEWS_SOURCES.length} news sources...\n`);

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const source of IRANIAN_NEWS_SOURCES) {
      try {
        // Check if source already exists
        const existing = await SourceModel.findOne({ url: source.url });
        if (existing) {
          console.log(`⏭️  Skipped ${source.name} (already exists)`);
          skipped++;
          continue;
        }

        // Create new source
        await SourceModel.create({
          name: source.name,
          type: SourceType.RSS,
          url: source.url,
          status: SourceStatus.ACTIVE,
          metadata: {
            language: 'fa',
            category: source.category,
          },
          scrapeInterval: 300000, // 5 minutes
        });

        console.log(`✅ Added ${source.name}`);
        added++;
      } catch (error) {
        console.error(`❌ Failed to add ${source.name}:`, (error as Error).message);
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${added}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📰 Total: ${IRANIAN_NEWS_SOURCES.length}`);

    await db.disconnect();
    console.log('\n👋 Done!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

addDefaultSources();

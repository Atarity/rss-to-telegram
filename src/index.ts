import { Hono } from 'hono';
import { checkAndSendUpdates } from './checkAndSendUpdates';
import { Bindings } from './types/Bindings';
import { getLatestRssItems } from './rss';
import { sendToTelegram } from './telegram';

const app = new Hono<{Bindings: Bindings}>();

/**
 * Health check route
 */
app.get('/', (c) => {
  return c.text('RSS to Telegram push service is running!');
});

/**
 * Route for manually triggering updates
 */
app.get('/check-updates', async (c) => {
  const env = c.env;

  try {
    const result = await checkAndSendUpdates(env);
    return c.json({ success: true, sent: result.sent, error: result.error });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Development route for testing layouts by publishing the last RSS item
 */
app.get('/publish-last', async (c) => {
  const env = c.env;

  // Check if the endpoint is enabled in environment
  if (env.PUBLISH_LAST_ENDPOINT !== 'true') {
    return c.json({
      success: false,
      error: 'Endpoint not enabled'
    }, 403);
  }

  try {
    // Get all items without time filtering
    const items = await getLatestRssItems(env.RSS_FEED_URL, { ignoreTimeFilter: true });

    if (items.length === 0) {
      return c.json({ success: false, error: 'No RSS items found' }, 404);
    }

    // Take the most recent item
    const lastItem = items[0];

    // Send it to Telegram
    const success = await sendToTelegram(
      env.TELEGRAM_BOT_TOKEN,
      env.TELEGRAM_CHANNEL_ID,
      lastItem
    );

    if (!success) {
      return c.json({ success: false, error: 'Failed to send to Telegram' }, 500);
    }

    return c.json({
      success: true,
      item: {
        title: lastItem.title,
        link: lastItem.link,
        pubDate: lastItem.pubDate
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Export Cloudflare Worker entry point
 */
export default {
  fetch: app.fetch,
  /**
   * Scheduled task handler function
   * @param {ScheduledEvent} event - Scheduled event
   * @param {Bindings} env - Environment variables
   * @param {ExecutionContext} ctx - Execution context
   */
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(checkAndSendUpdates(env));
  },
};

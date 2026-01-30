import Parser from 'rss-parser';

// Define Feed item type
export interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  headerImage?: string;
}

// Use fetch API to get data
async function fetchUrl(url: string): Promise<string> {
  console.log('Using fetch to get:', url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed, status code: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('xml') && !contentType.includes('rss')) {
      console.warn(`Warning: Content type may not be XML: ${contentType}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw error;
  }
}

type CustomFeed = {};
type CustomItem = { headerImage: string };

interface GetLatestRssItemsOptions {
  ignoreTimeFilter?: boolean;
}

// Get the latest RSS items
export async function getLatestRssItems(
  feedUrl: string,
  options: GetLatestRssItemsOptions = {}
): Promise<FeedItem[]> {
  console.log('Getting RSS feed:', feedUrl);

  const parser = new Parser<CustomFeed, CustomItem>({
    customFields: {
      item: ['headerImage']
    }
  });

  try {
    // Use fetch API to get RSS content
    const xmlContent = await fetchUrl(feedUrl);
    // Use rss-parser to parse XML content
    const feed = await parser.parseString(xmlContent);

    // Get current time and 24 hours ago time point
    const now = new Date();
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(now.getHours() - 168);

    console.log(`Filtering items within 168 hours (7 days), current time: ${now.toISOString()}`);

    // Sort by publication date, newest first
    const sortedItems = feed.items
      .map(item => ({
        ...item,
        title: item.title || 'No Title',
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        content: item.content,
        contentSnippet: item.contentSnippet,
        headerImage: item.headerImage,
      }))
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Apply time filter only if ignoreTimeFilter is false
    if (!options.ignoreTimeFilter) {
      return sortedItems.filter(item => {
        const pubDate = new Date(item.pubDate);
        return pubDate >= twentyFourHoursAgo;
      });
    }

    return sortedItems;
  } catch (error) {
    console.error('Error getting RSS feed:', error);
    return [];
  }
}
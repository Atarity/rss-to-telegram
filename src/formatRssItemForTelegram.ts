import { FeedItem } from "./rss";
import { escapeHtml } from "./escapeHtml";
import { cleanHtmlForTelegram, extractFirstImage } from "./htmlProcessor";

/**
 * Available rendering styles for Telegram messages
 */
export type RenderStyle = 'default' | 'custom' | 'htmlish';

/**
 * Interface for rendering functions
 */
interface RenderFunction {
    (item: FeedItem): {
        text: string;
        photo?: string;
    };
}

/**
 * Collection of rendering functions for different styles
 */
const renderStyles: Record<RenderStyle, RenderFunction> = {
    default: (item: FeedItem) => ({
        text: `${escapeHtml(item.title)}${item.contentSnippet ? `\n\n${item.contentSnippet.substring(0, 150)}${item.contentSnippet.length > 150 ? '...' : ''}` : ''}\n${item.link}`
    }),

    custom: (item: FeedItem) => ({
        text: `<b>${item.title}</b>\n\n${item.contentSnippet || ''}\n\n${item.link}`
    }),

    htmlish: (item: FeedItem) => {
        const content = item.content || '';
        const imageUrl = extractFirstImage(content);
        const cleanContent = cleanHtmlForTelegram(content, item.link);

        return {
            text: `<b>${item.title}</b>\n\n${cleanContent}`,
            photo: imageUrl
        };
    }
};

/**
 * Format an RSS item as a Telegram message.
 * @param {FeedItem} item - The RSS feed item to format.
 * @param {RenderStyle} style - The rendering style to use (default: 'custom').
 * @returns {Object} - The formatted message and optional photo URL for Telegram.
 */
export function formatRssItemForTelegram(
    item: FeedItem,
    style: RenderStyle = 'custom'
): { text: string; photo?: string } {
    const renderFunction = renderStyles[style];
    return renderFunction(item);
}
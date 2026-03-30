import { FeedItem } from "./rss";
import { escapeHtml } from "./escapeHtml";
import { cleanHtmlForTelegram, extractFirstImage, truncateHtml } from "./htmlProcessor";

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
        let cleanContent = cleanHtmlForTelegram(content, item.link);

        const readMoreText = "читать целиком";
        const title = `<b>${escapeHtml(item.title)}</b>`;
        const linkTag = `<a href="${item.link}">${readMoreText}</a>`;

        // Visible text limit for Telegram captions is 1024.
        // Overhead: Title length, Link text length (14), 4 newlines (\n\n x 2), and 3 for "..." if truncated.
        const visibleTitleLength = item.title.length;
        const visibleLinkLength = readMoreText.length;
        const maxContentVisibleLength = 1000 - visibleTitleLength - visibleLinkLength - 4 - 3;

        // Strip any existing "read more" link from the end of cleanContent to avoid duplication.
        // We look for a link pointing to item.link at the very end.
        const escapedLinkForRegex = item.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkAtEndPattern = new RegExp(`<a href="${escapedLinkForRegex}"[^>]*>.*?</a>\\s*$`, 'i');
        cleanContent = cleanContent.replace(linkAtEndPattern, '').trim();

        const truncatedContent = truncateHtml(cleanContent, maxContentVisibleLength);

        return {
            text: `${title}\n\n${truncatedContent}\n\n${linkTag}`,
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
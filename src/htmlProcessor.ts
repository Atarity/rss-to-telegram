/**
 * Extract the first image URL from HTML content
 */
export function extractFirstImage(html: string): string | null {
    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
    return imgMatch ? imgMatch[1] : null;
}

/**
 * Convert relative URL to absolute using base URL
 */
function makeUrlAbsolute(relativeUrl: string, baseUrl: string): string {
    try {
        // If the URL is already absolute, return it as is
        if (relativeUrl.match(/^https?:\/\//)) {
            return relativeUrl;
        }

        // Extract domain from base URL
        const urlObj = new URL(baseUrl);
        const domain = `${urlObj.protocol}//${urlObj.host}`;

        // Handle different types of relative URLs
        if (relativeUrl.startsWith('/')) {
            // URLs starting with / are relative to domain root
            return `${domain}${relativeUrl}`;
        } else {
            // URLs without / are relative to current path
            const basePath = urlObj.pathname.split('/').slice(0, -1).join('/');
            return `${domain}${basePath}/${relativeUrl}`;
        }
    } catch (error) {
        console.error('Error converting URL:', error);
        return relativeUrl; // Return original URL if conversion fails
    }
}

/**
 * Clean up HTML content for Telegram
 * - Preserve <a> tags with their href attributes
 * - Convert relative URLs to absolute
 * - Remove all other HTML tags
 * - Clean up whitespace while preserving intentional line breaks
 */
export function cleanHtmlForTelegram(html: string, articleUrl: string): string {
    // First, decode CDATA if present
    const decodedHtml = html.replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1');

    // Split content into paragraphs
    const paragraphs = decodedHtml.split('</p>');

    // Process each paragraph separately
    const processedParagraphs = paragraphs.map(p => {
        // Remove <p> tags and any other opening tags at the start
        let processed = p.replace(/<p[^>]*>|^<[^>]+>/g, '');

        // Remove img tags
        processed = processed.replace(/<img[^>]+>/g, '');

        // Check if this paragraph contains only a link
        const isLastLinkParagraph = /^\s*<a[^>]+>[^<]+<\/a>\s*$/.test(processed);

        // Convert links to absolute URLs
        processed = processed.replace(
            /<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g,
            (match, href, text) => {
                const absoluteUrl = makeUrlAbsolute(href, articleUrl);
                return `<a href="${absoluteUrl}">${text}</a>`;
            }
        );

        // Remove all remaining HTML tags except <a> and <b>
        processed = processed.replace(
            /<(?!\/?a(?=>|\s.*>)|\/?b(?=>|\s.*>))\/?(?!a(?=>|\s.*>)|b(?=>|\s.*>))[^>]*>/g,
            ''
        );

        // Add double newline before the last link paragraph
        if (isLastLinkParagraph) {
            return processed.trim();
        }

        return processed.trim() + '\n\n';
    });

    // Log the processed paragraphs before joining
    //console.log('Processed paragraphs before joining:', JSON.stringify(processedParagraphs, null, 2));

    // Join paragraphs and filter out empty ones
    const result = processedParagraphs
        .filter(p => p.length > 0)  // Remove empty paragraphs
        .join('')  // Just join without adding extra newlines
        .trim();

    // Log the final result
    //console.log('Final cleaned HTML:', JSON.stringify(result, null, 2));

    return result;
    }

    /**
    * Truncate HTML content by visible character count
    * - Preserves HTML tags
    * - Closes any open tags if truncated
    * - Appends '...' if truncated
    * - Tries to truncate at space boundaries
    */
    export function truncateHtml(html: string, maxVisibleLength: number): string {
    if (html.length <= maxVisibleLength) return html;

    let visibleCount = 0;
    let result = '';
    let i = 0;
    const tagStack: string[] = [];
    let lastSpaceIndex = -1;
    let lastSpaceVisibleCount = -1;
    let lastSpaceTagStack: string[] = [];

    while (i < html.length && visibleCount < maxVisibleLength) {
        if (html[i] === '<') {
            const closingBracket = html.indexOf('>', i);
            if (closingBracket !== -1) {
                const tag = html.substring(i, closingBracket + 1);
                result += tag;

                // Track tags to close them later
                const tagNameMatch = tag.match(/^<\/?([a-z1-6]+)/i);
                if (tagNameMatch) {
                    const tagName = tagNameMatch[1].toLowerCase();
                    if (tag.startsWith('</')) {
                        if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
                            tagStack.pop();
                        }
                    } else if (!tag.endsWith('/>')) {
                        tagStack.push(tagName);
                    }
                }

                i = closingBracket + 1;
                continue;
            }
        }

        if (html[i] === ' ') {
            lastSpaceIndex = result.length;
            lastSpaceVisibleCount = visibleCount;
            lastSpaceTagStack = [...tagStack];
        }

        result += html[i];
        visibleCount++;
        i++;
    }

    if (i < html.length) {
        // If we're in the middle of a word and found a space earlier, truncate at the last space
        if (html[i] !== ' ' && lastSpaceIndex !== -1) {
            result = result.substring(0, lastSpaceIndex);
            // Use the tag stack from the time of the last space
            while (tagStack.length > lastSpaceTagStack.length) {
                tagStack.pop();
            }
        }

        // Remove trailing whitespace before adding ellipsis
        result = result.trimEnd();
        result += '...';

        // Close remaining tags in reverse order
        while (tagStack.length > 0) {
            const tagName = tagStack.pop();
            result += `</${tagName}>`;
        }
    }

    return result;
    }
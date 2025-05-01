import { FeedItem } from './rss';
import { SendPhotoParams } from './types/sendPhotoParams';
import { convertHeaderImage } from './parseHeaderImage';
import { formatRssItemForTelegram } from './formatRssItemForTelegram';
import { RenderStyle } from './formatRssItemForTelegram';

const trySendPhoto = async (
	filetype: string,
	botToken: string,
	channelId: string,
	item: FeedItem,
	style: RenderStyle = 'custom',
	formattedContent?: ReturnType<typeof formatRssItemForTelegram>
): Promise<boolean> => {
	try {
		const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
		const content = formattedContent || formatRssItemForTelegram(item, style);

		// Log the formatted content
		console.log('Sending to Telegram with content:', JSON.stringify({
			text: content.text,
			photo: content.photo
		}, null, 2));

		// For htmlish style, use extracted image if available
		const photo = style === 'htmlish' && content.photo
			? content.photo
			: convertHeaderImage(item.headerImage || '', filetype);

		const body: SendPhotoParams = {
			chat_id: channelId,
			photo,
			caption: content.text,
			parse_mode: 'HTML'
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error(`Telegram API error for ${filetype}:`, error);
			return false;
		}

		return true;
	} catch (error) {
		console.error(`Error sending to Telegram with ${filetype}:`, error);
		return false;
	}
};

const sendTextMessage = async (
	botToken: string,
	channelId: string,
	item: FeedItem,
	style: RenderStyle = 'custom',
	formattedContent?: ReturnType<typeof formatRssItemForTelegram>
): Promise<boolean> => {
	try {
		const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
		const content = formattedContent || formatRssItemForTelegram(item, style);

		// Log the formatted content
		console.log('Sending to Telegram with content:', JSON.stringify({
			text: content.text
		}, null, 2));

		// For htmlish style with photo, use sendPhoto instead
		if (style === 'htmlish' && content.photo) {
			return trySendPhoto('jpg', botToken, channelId, item, style, content);
		}

		const body = {
			chat_id: channelId,
			text: content.text,
			parse_mode: 'HTML'
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Telegram API error for text message:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error sending text message to Telegram:', error);
		return false;
	}
};

// Update the main function to accept style parameter
export async function sendToTelegram(
	botToken: string,
	channelId: string,
	item: FeedItem,
	style: RenderStyle = 'htmlish'
): Promise<boolean> {
	// Format content once
	const formattedContent = formatRssItemForTelegram(item, style);

	// If using htmlish style and we found a photo in the content,
	// or if there's a header image, try sending as photo first
	if ((style === 'htmlish' && formattedContent.photo) || item.headerImage) {
		const fileTypes = ['.png', '.jpg', '.jpeg'];
		for (const fileType of fileTypes) {
			if (await trySendPhoto(fileType, botToken, channelId, item, style, formattedContent)) {
				return true;
			}
		}
	}

	// Fall back to text message
	return sendTextMessage(botToken, channelId, item, style, formattedContent);
}

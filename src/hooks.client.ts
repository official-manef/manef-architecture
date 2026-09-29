import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = () => ({
	message: 'This page could not be loaded. Reload and try again.'
});

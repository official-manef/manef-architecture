import type { Component } from 'svelte';
export type FeatureIcon = 'dashboard' | 'activity' | 'settings' | 'notes' | 'assistant';
export type FeatureDefinition = {
	slug: string;
	label: string;
	description: string;
	icon: FeatureIcon;
	loadScreen: () => Promise<Component>;
};

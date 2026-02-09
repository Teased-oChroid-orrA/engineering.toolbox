
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/buckling" | "/bushing" | "/inspector" | "/profile" | "/properties" | "/shear" | "/suite" | "/surface";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/buckling": Record<string, never>;
			"/bushing": Record<string, never>;
			"/inspector": Record<string, never>;
			"/profile": Record<string, never>;
			"/properties": Record<string, never>;
			"/shear": Record<string, never>;
			"/suite": Record<string, never>;
			"/surface": Record<string, never>
		};
		Pathname(): "/" | "/buckling" | "/buckling/" | "/bushing" | "/bushing/" | "/inspector" | "/inspector/" | "/profile" | "/profile/" | "/properties" | "/properties/" | "/shear" | "/shear/" | "/suite" | "/suite/" | "/surface" | "/surface/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.ico" | string & {};
	}
}
<script lang="ts">
  import { cn } from '$lib/utils';

  export let variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' = 'primary';
  export let size: 'sm' | 'md' | 'lg' | 'icon' = 'md';
  export let className = '';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;

  const base =
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 disabled:pointer-events-none disabled:opacity-50 hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]';

  const variants: Record<typeof variant, string> = {
    primary: 'bg-teal-400 text-black hover:bg-teal-300',
    secondary: 'bg-white/10 text-white hover:bg-white/15',
    outline: 'border border-white/12 bg-white/0 text-white hover:bg-white/6',
    ghost: 'bg-transparent text-white/80 hover:bg-white/6 hover:text-white',
    destructive: 'bg-rose-500 text-white hover:bg-rose-400'
  };

  const sizes: Record<typeof size, string> = {
    sm: 'h-8 px-3',
    md: 'h-9 px-4',
    lg: 'h-10 px-5',
    icon: 'h-9 w-9'
  };
</script>

<button {type} class={cn(base, variants[variant], sizes[size], className)} {disabled}>
  <slot />
</button>

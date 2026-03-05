<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { cn } from '$lib/utils';

  
  interface Props {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    class?: string | undefined | null;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    children?: import('svelte').Snippet;
    [key: string]: any
  }

  let {
    variant = 'primary',
    size = 'md',
    class: className = undefined,
    type = 'button',
    disabled = false,
    children,
    ...rest
  }: Props = $props();
  const dispatch = createEventDispatcher<{ click: MouseEvent }>();

  function handleClick(event: MouseEvent) {
    dispatch('click', event);
  }

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

<button {type} class={cn(base, variants[variant], sizes[size], className)} {disabled} onclick={handleClick} {...rest}>
  {@render children?.()}
</button>

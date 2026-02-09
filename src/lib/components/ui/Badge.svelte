<script lang="ts">
  import { cn } from '$lib/utils';

  export let variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' = 'default';
  export let className = '';

  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide border';

  const variants: Record<typeof variant, string> = {
    default: 'bg-white/8 border-white/10 text-white/80',
    secondary: 'bg-sky-400/10 border-sky-400/20 text-sky-200',
    success: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-200',
    warning: 'bg-amber-400/10 border-amber-400/20 text-amber-200',
    destructive: 'bg-rose-400/10 border-rose-400/20 text-rose-200'
  };
</script>

<span class={cn(base, variants[variant], className)}>
  <slot />
</span>

<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui';
  
  const tools = [
    {
      title: 'Shear Joint Analysis',
      desc: 'Pin shear, bearing, shear-out, and interaction analysis for single/double shear joints.',
      href: '#/shear',
      icon: '✂️',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20'
    },
    {
      title: 'Bushing Toolbox',
      desc: 'Press-fit bushing analysis including sleeve walls, contact pressure, and retention.',
      href: '#/bushing',
      icon: '◎',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20'
    }
  ];
</script>

<div class="space-y-8 p-4">
  <div class="glass-panel p-8 rounded-2xl relative overflow-hidden">
    <div class="relative z-10">
      <h1 class="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back, Engineer.</h1>
      <p class="text-white/60 max-w-2xl">
        Select a toolbox to begin your analysis. All calculations are performed locally and deterministically.
      </p>
    </div>
    
    <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-600/20 to-transparent"></div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {#each tools as tool}
      <a href={tool.href} class="block group">
        <Card class={`h-full glass-card hover:scale-[1.02] transition-all duration-300 ${tool.bg}`}>
          <CardContent class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class={`text-4xl ${tool.color}`}>{tool.icon}</div>
              <div class="opacity-0 group-hover:opacity-100 transition-opacity text-white/40">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">{tool.title}</h3>
            <p class="text-white/60 text-sm leading-relaxed">{tool.desc}</p>
          </CardContent>
        </Card>
      </a>
    {/each}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="md:col-span-2 glass-panel rounded-xl p-6 min-h-[200px]">
      <h3 class="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Recent Projects</h3>
      <div class="flex flex-col items-center justify-center h-32 text-white/20 border-2 border-dashed border-white/5 rounded-lg">
        <span class="text-sm">No recent projects found (Local Persistence)</span>
      </div>
    </div>
    
    <div class="glass-panel rounded-xl p-6">
      <h3 class="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">System Status</h3>
      <div class="space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-white/60">Core Solver</span>
          <span class="text-emerald-400 font-mono">v2.5.0</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-white/60">UI Framework</span>
          <span class="text-indigo-400 font-mono">Neon Glass</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-white/60">Storage</span>
          <span class="text-white font-mono">Local</span>
        </div>
      </div>
    </div>
  </div>
</div>
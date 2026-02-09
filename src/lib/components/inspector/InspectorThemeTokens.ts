export const INSPECTOR_THEME = {
  control: {
    cardMinHeight: 66,
    labelGap: 6,
    inputMinHeight: 38,
  },
  topControls: {
    grid: 'grid grid-cols-12 gap-4 items-start',
    spans: {
      headers: 'col-span-6 md:col-span-2 md:row-start-1',
      target: 'col-span-6 md:col-span-3 md:row-start-1',
      match: 'col-span-6 md:col-span-2 md:row-start-2',
      scope: 'col-span-6 md:col-span-2 md:row-start-2',
      query: 'col-span-12 md:col-span-3 md:row-start-2',
      options: 'col-span-12 md:col-span-3 md:row-start-2',
      maxScan: 'col-span-12 md:col-span-2 md:row-start-2',
    },
  },
  grid: {
    rowHeight: 34,
    overscan: 10,
    maxWindowAbs: 80,
    headerHeight: 34,
    bannerHeight: 30,
    stickyOffsetTop: 34,
  },
} as const;

export type TopControlSpanKey = keyof typeof INSPECTOR_THEME.topControls.spans;

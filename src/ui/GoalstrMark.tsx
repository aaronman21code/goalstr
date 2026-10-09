import type { CSSProperties } from 'react';

/** The open progress ring doubles as Goalstr's G. Pure SVG; no asset requests. */
export function GoalstrMark({ size = 26, style }: { size?: number; style?: CSSProperties }) {
    return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" style={style}><path d="M45.4 18.6A19 19 0 1 0 45.4 45.4V32H33" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

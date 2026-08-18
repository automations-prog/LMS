// Shared brand-accent classes for the auth pages (login, forgot/reset password,
// confirm password, verify email, two-factor challenge) — all rendered through
// the same auth-simple-layout.tsx card, so the same accents keep them consistent.

export const authLabelClass = 'text-sm font-bold';

export const authInputClass =
    'h-11 rounded-[10px] border-slate-200 bg-[#fbfaff] focus-visible:border-[#f598ff] focus-visible:ring-[#f598ff]/40 dark:border-input dark:bg-input/30';

export const authLinkClass =
    'font-semibold text-[#473364] no-underline hover:underline dark:text-[#f5b8ff]';

export const authCheckboxClass =
    'data-[state=checked]:border-transparent data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-[#f598ff] data-[state=checked]:to-[#5a4177]';

export const authButtonClass =
    'h-12 rounded-xl border-0 font-extrabold text-[#3a2a54] shadow-[0_12px_24px_-8px_rgba(245,152,255,0.55)] bg-[linear-gradient(135deg,#c774ff_0%,#f598ff_50%,#b98cff_100%)] hover:opacity-95';

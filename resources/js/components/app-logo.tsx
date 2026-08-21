export default function AppLogo() {
    return (
        <div className="flex w-full items-center group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center">
            <img
                src="/images/logo-icon.webp"
                alt="PitchHealth Solutions"
                className="hidden h-10 w-auto shrink-0 object-contain group-data-[collapsible=icon]:block"
            />
            <img
                src="/images/logo_black_text.png"
                alt="PitchHealth Solutions"
                className="h-8 w-auto object-contain group-data-[collapsible=icon]:hidden dark:hidden"
            />
            <img
                src="/images/logo.webp"
                alt="PitchHealth Solutions"
                className="hidden h-8 w-auto object-contain group-data-[collapsible=icon]:hidden dark:block"
            />
        </div>
    );
}

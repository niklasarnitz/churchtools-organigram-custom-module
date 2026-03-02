import React from 'react';

export const TopBar = React.memo(() => {
    return (
        <div className="flex w-full items-center justify-between gap-6 border-0 border-b border-solid px-6 py-3.5 text-lg">
            <div className="flex grow gap-6 divide-x font-bold">
                <div className="flex h-7 items-baseline gap-4">
                    <span>ChurchTools Organigramm</span>
                </div>
            </div>
        </div>
    );
});

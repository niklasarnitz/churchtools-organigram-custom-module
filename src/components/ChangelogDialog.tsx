import { History } from 'lucide-react';
import React from 'react';

import changelogData from '../changelog.json';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export const ChangelogDialog = () => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					className="h-9 w-9 shrink-0 rounded-full border border-slate-200 bg-white/80 p-0 shadow-lg backdrop-blur-md transition-all hover:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-900"
					variant="ghost"
				>
					<History className="size-4 text-slate-500" />
					<span className="sr-only">Changelog anzeigen</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl sm:max-h-[80vh]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<History className="size-5 text-blue-600" />
						Was ist neu?
					</DialogTitle>
					<DialogDescription>
						Hier findest du eine Übersicht über die letzten Änderungen und neuen Funktionen.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4 overflow-y-auto pr-2 sm:max-h-[60vh]">
					<div className="space-y-8">
						{changelogData.versions.map((version) => (
							<div key={version.version}>
								<div className="flex items-baseline justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
									<h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
										v{version.version}
									</h3>
									<span className="text-sm text-slate-500 dark:text-slate-400">
										{new Date(version.date).toLocaleDateString('de-DE', {
											day: '2-digit',
											month: 'long',
											year: 'numeric',
										})}
									</span>
								</div>
								<ul className="mt-4 space-y-2">
									{version.changes.map((change, index) => (
										<li
											className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
											key={index}
										>
											<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
											{change}
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

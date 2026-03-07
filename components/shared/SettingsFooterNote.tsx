interface SettingsFooterNoteProps {
  children: string;
  className?: string;
}

export function SettingsFooterNote({
  children,
  className = 'mt-8',
}: SettingsFooterNoteProps) {
  return (
    <div className={`${className} text-center`.trim()}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
    </div>
  );
}

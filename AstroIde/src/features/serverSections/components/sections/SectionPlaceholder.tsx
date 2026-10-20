/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
interface SectionPlaceholderProps {
  title: string;
  description?: string;
}

export default function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
  return (
    <div className="section-placeholder">
      <h2>{title}</h2>
      <p>{description ?? "Esta sección está en construcción…"}</p>
    </div>
  );
}

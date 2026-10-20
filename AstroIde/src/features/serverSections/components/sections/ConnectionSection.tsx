/*
##################################################################
                  Copyright (c) 2026 Windsor
                      Astro Code Editor
##################################################################
*/
import SectionPlaceholder from "./SectionPlaceholder";

interface ConnectionSectionProps {
  provider: string;
  host: string;
  name: string;
}

export default function ConnectionSection({ provider, host, name }: ConnectionSectionProps) {
  return (
    <SectionPlaceholder
      title="Conexión"
      description={`Conectado a ${name || "Mi servidor"} (${host || "sin host"} · ${provider})…`}
    />
  );
}

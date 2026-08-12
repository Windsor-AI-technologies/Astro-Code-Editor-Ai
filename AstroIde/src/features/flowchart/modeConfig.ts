import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCircle, faStop, faSquare, faDiamond, faRightLeft, faLayerGroup, faDatabase, faStickyNote, faBolt, faLightbulb, faToggleOn, faBatteryFull, faMicrochip, faWaveSquare, faPlug, faArrowDown, faCircleNodes, faTriangleExclamation, faTable, faLink, faCubes, faListOl, faFont, faHashtag, faQuestion, faBan,
} from "@fortawesome/free-solid-svg-icons";

export type DiagramMode = "flowchart" | "circuit" | "database" | "json";

export interface NodeTemplate {
  type: string;
  label: string;
  icon: IconDefinition;
  data?: Record<string, unknown>;
}

export const MODE_CONFIG: Record<
  DiagramMode,
  { label: string; icon: IconDefinition; templates: NodeTemplate[] }
> = {
  flowchart: {
    label: "Flowchart",
    icon: faCircleNodes,
    templates: [
      { type: "startEnd", label: "Start", icon: faCircle },
      { type: "startEnd", label: "End", icon: faStop },
      { type: "process", label: "Process", icon: faSquare },
      { type: "decision", label: "Decision", icon: faDiamond },
      { type: "io", label: "Input/Output", icon: faRightLeft },
      { type: "subprocess", label: "Subprocess", icon: faLayerGroup },
      { type: "dataStore", label: "Data Store", icon: faDatabase },
      { type: "note", label: "Note", icon: faStickyNote },
    ],
  },
  circuit: {
    label: "Circuit",
    icon: faBolt,
    templates: [
      {
        type: "circuit",
        label: "Resistor",
        icon: faWaveSquare,
        data: { component: "resistor", value: "10kΩ" },
      },
      {
        type: "circuit",
        label: "Capacitor",
        icon: faPlug,
        data: { component: "capacitor", value: "100µF" },
      },
      {
        type: "circuit",
        label: "Inductor",
        icon: faCircleNodes,
        data: { component: "inductor", value: "10mH" },
      },
      {
        type: "circuit",
        label: "LED",
        icon: faLightbulb,
        data: { component: "led", value: "Red" },
      },
      {
        type: "circuit",
        label: "Diode",
        icon: faArrowDown,
        data: { component: "diode", value: "1N4148" },
      },
      {
        type: "circuit",
        label: "Transistor",
        icon: faTriangleExclamation,
        data: { component: "transistor", value: "2N2222" },
      },
      {
        type: "circuit",
        label: "IC Chip",
        icon: faMicrochip,
        data: { component: "ic", value: "ATmega328" },
      },
      {
        type: "circuit",
        label: "Op-Amp",
        icon: faTriangleExclamation,
        data: { component: "opamp", value: "LM741" },
      },
      {
        type: "circuit",
        label: "VCC (+)",
        icon: faBolt,
        data: { component: "vcc", value: "5V" },
      },
      {
        type: "circuit",
        label: "GND",
        icon: faArrowDown,
        data: { component: "ground", value: "0V" },
      },
      {
        type: "circuit",
        label: "Switch",
        icon: faToggleOn,
        data: { component: "switch", value: "SPST" },
      },
      {
        type: "circuit",
        label: "Battery",
        icon: faBatteryFull,
        data: { component: "battery", value: "9V" },
      },
    ],
  },
  database: {
    label: "Database",
    icon: faDatabase,
    templates: [
      {
        type: "dbTable",
        label: "Table",
        icon: faTable,
        data: {
          columns: [
            { name: "id", type: "INT", pk: true },
            { name: "name", type: "VARCHAR(255)", pk: false },
          ],
        },
      },
      {
        type: "dbTable",
        label: "Junction",
        icon: faLink,
        data: {
          columns: [
            { name: "id", type: "INT", pk: true },
            { name: "left_id", type: "INT FK", pk: false },
            { name: "right_id", type: "INT FK", pk: false },
          ],
        },
      },
      { type: "note", label: "Note", icon: faStickyNote },
    ],
  },
  json: {
    label: "JSON / Tree",
    icon: faCubes,
    templates: [
      {
        type: "json",
        label: "Object {}",
        icon: faCubes,
        data: {
          nodeType: "object",
          properties: [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" },
          ],
        },
      },
      {
        type: "json",
        label: "Array []",
        icon: faListOl,
        data: { nodeType: "array", items: ["item1", "item2", "item3"] },
      },
      {
        type: "json",
        label: "String",
        icon: faFont,
        data: { nodeType: "value", valueType: "string" },
      },
      {
        type: "json",
        label: "Number",
        icon: faHashtag,
        data: { nodeType: "value", valueType: "number" },
      },
      {
        type: "json",
        label: "Boolean",
        icon: faQuestion,
        data: { nodeType: "value", valueType: "boolean" },
      },
      {
        type: "json",
        label: "Null",
        icon: faBan,
        data: { nodeType: "value", valueType: "null" },
      },
      { type: "note", label: "Note", icon: faStickyNote },
    ],
  },
};

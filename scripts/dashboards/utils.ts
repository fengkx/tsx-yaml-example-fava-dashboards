type IPanelType = "html" | "echarts" | "d3_sankey" | "jinja2";

type IBaseQueryType = { bql: string;[k: string]: any };

type IPanelCommon<QueryType extends IBaseQueryType = IBaseQueryType> = {
  title: string;
  width?: string;
  height?: string;
  link?: string;
  queries: QueryType[];
  type: IPanelType;
  script?: string;
  template?: string;
};

type IHtmlPanel = IPanelCommon & {
  type: "html";
  script: string; // script property
};

type IEchartsPanel = IPanelCommon & {
  type: "echarts";
  script: string;
};

type ID3SankeyPanel = IPanelCommon & {
  type: 'd3_sankey';
  script: string
}

type IJinja2Panel = IPanelCommon & {
  type: 'jinja2';
  template: string
}

type IPanel = IHtmlPanel | IEchartsPanel | ID3SankeyPanel | IJinja2Panel;
type IDashboard = {
  name: string;
  panels: IPanel[];
};

export function DashBoards(props: { children?: MarkAsChildren<IDashboard, 'panels'>[] }) {
  return { dashboards: props.children ?? [] };
}

export function DashBoard({ name, children }: MarkAsChildren<IDashboard, 'panels'>) {
  return {
    name,
    panels: children,
  };
}

type ToArray<T extends unknown> = T extends unknown[] ? T : T[];
type MarkAsChildren<T, K extends keyof T> = Omit<T, K> & { children?: ToArray<T[K]> }

type PanelParams = IPanel['type'] extends 'jinja2' ? MarkAsChildren<IPanel, 'template'> : MarkAsChildren<IPanel, 'script'>;


export function Panel(panel: PanelParams) {
  const r: IPanel = {
    title: panel.title,
    queries: panel.queries,
    type: panel.type,
    script: (panel.children ?? []).join(""),
    template: ''
  };
  if (panel.type === 'jinja2') {
    delete r['script'];
    r.template = (panel.children ?? []).join('')
  }
  if (panel.width) {
    r.width = panel.width
  }
  if (panel.link) {
    r.link = panel.link
  }
  if (panel.height) {
    r.height = panel.height
  }

  return r
}

const getFunctionBody = (fn: any) => {
  const fnStr = fn.toString();
  if (fnStr.startsWith("function")) {
    return fnStr.replace(/^function\s*\S+\s*\([^)]*\)\s*\{|\}$/g, "");
  }
  const matches = fnStr.match(
    /^(?:\s*\(?(?:\s*\w*\s*,?\s*)*\)?\s*?=>\s*){?([\s\S]*)}?$/
  );
  if (!matches) {
    return null;
  }

  const firstPass = matches[1];

  // Needed because the RegExp doesn't handle the last '}'.
  const secondPass =
    (firstPass.match(/{/g) || []).length ===
      (firstPass.match(/}/g) || []).length - 1
      ? firstPass.slice(0, firstPass.lastIndexOf("}"))
      : firstPass;

  return secondPass;
};

export const convertCurrency = (ammountPart: string, currencies: string[], datePart?: string) => {
  let r = ammountPart;
  for (const currency of currencies) {
    r = `CONVERT(${r}, '${currency}'`
    if (datePart) {
      r = `${r}, ${datePart})`
    } else {
      r = `${r})`
    }
  }
  return r;
}

export type ScriptFunction<T extends IBaseQueryType = IBaseQueryType> = (
  ledger: any,// { ccy: string },
  panel: { queries: T[], [k: string]: any },
  utis: any,
  window: typeof globalThis
) => string | object;

export function Script(props: { fn: ScriptFunction }) {
  return getFunctionBody(props.fn).trim();
}

export namespace JSX {
  export const h = (type: any, config: any, ...children: any[]) => {
    if (typeof type === "function") {
      const props = { ...config };
      props.children = children;
      return type(props);
    }
    return { type, children, props: config };
  };
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // div: {
      //     id?: string
      //     style?: {}
      // }
      // span: {}
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

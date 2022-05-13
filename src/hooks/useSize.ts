import * as React from "react";
import useResizeObserver from "@react-hook/resize-observer";

export const useSize = (target: React.RefObject<HTMLElement>) => {
  const [size, setSize] = React.useState({ width: 800, height: 600 });

  React.useLayoutEffect(() => {
    console.log("useLayoutEffect", target);
    setSize(target.current.getBoundingClientRect());
  }, [target]);

  // Where the magic happens
  useResizeObserver(target, (entry) => setSize(entry.contentRect));
  return size;
};

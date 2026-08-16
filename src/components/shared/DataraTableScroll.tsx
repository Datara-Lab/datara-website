"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type DataraTableScrollProps = {
  children: ReactNode;
  className?: string;
};

type FloatingBarLayout = {
  left: number;
  width: number;
  visible: boolean;
};

export default function DataraTableScroll({
  children,
  className = "",
}: DataraTableScrollProps) {
  const tableScrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const floatingScrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const isSynchronizingRef =
    useRef(false);

  const [
    contentWidth,
    setContentWidth,
  ] = useState(0);

  const [
    floatingBarLayout,
    setFloatingBarLayout,
  ] = useState<FloatingBarLayout>({
    left: 0,
    width: 0,
    visible: false,
  });

  useEffect(() => {
    const tableScroll =
      tableScrollRef.current;

    const floatingScroll =
      floatingScrollRef.current;

    if (
      !tableScroll ||
      !floatingScroll
    ) {
      return;
    }

    function updateMeasurements() {
      const rect =
        tableScroll!
          .getBoundingClientRect();

      const nextContentWidth =
        tableScroll!.scrollWidth;

      const hasOverflow =
        nextContentWidth >
        tableScroll!.clientWidth +
          1;

      const tableIsVisible =
        rect.bottom > 0 &&
        rect.top <
          window.innerHeight;

      const originalScrollbarIsVisible =
        rect.bottom <=
        window.innerHeight;

      setContentWidth(
        nextContentWidth,
      );

      setFloatingBarLayout({
        left:
          Math.max(
            rect.left,
            0,
          ),

        width:
          Math.min(
            rect.width,
            window.innerWidth -
              Math.max(
                rect.left,
                0,
              ),
          ),

        visible:
          hasOverflow &&
          tableIsVisible &&
          !originalScrollbarIsVisible,
      });
    }

    function synchronizeScroll(
      source: HTMLDivElement,
      target: HTMLDivElement,
    ) {
      if (
        isSynchronizingRef.current
      ) {
        return;
      }

      isSynchronizingRef.current =
        true;

      target.scrollLeft =
        source.scrollLeft;

      window.requestAnimationFrame(
        () => {
          isSynchronizingRef.current =
            false;
        },
      );
    }

    function handleTableScroll() {
      synchronizeScroll(
        tableScroll!,
        floatingScroll!,
      );
    }

    function handleFloatingScroll() {
      synchronizeScroll(
        floatingScroll!,
        tableScroll!,
      );
    }

    const resizeObserver =
      new ResizeObserver(
        updateMeasurements,
      );

    const mutationObserver =
      new MutationObserver(
        updateMeasurements,
      );

    resizeObserver.observe(
      tableScroll,
    );

    if (
      tableScroll.firstElementChild
    ) {
      resizeObserver.observe(
        tableScroll
          .firstElementChild,
      );
    }

    mutationObserver.observe(
      tableScroll,
      {
        childList: true,
        subtree: true,
        attributes: true,
      },
    );

    tableScroll.addEventListener(
      "scroll",
      handleTableScroll,
      {
        passive: true,
      },
    );

    floatingScroll.addEventListener(
      "scroll",
      handleFloatingScroll,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "scroll",
      updateMeasurements,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      updateMeasurements,
    );

    updateMeasurements();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();

      tableScroll.removeEventListener(
        "scroll",
        handleTableScroll,
      );

      floatingScroll.removeEventListener(
        "scroll",
        handleFloatingScroll,
      );

      window.removeEventListener(
        "scroll",
        updateMeasurements,
      );

      window.removeEventListener(
        "resize",
        updateMeasurements,
      );
    };
  }, []);

  return (
    <div
      className={[
        "relative",
        className,
      ].join(" ")}
    >
      <div
        ref={tableScrollRef}
        className="overflow-x-auto"
      >
        {children}
      </div>

      <div
        ref={floatingScrollRef}
        aria-label="Desplazamiento horizontal de la tabla"
        className={[
          "fixed bottom-0 z-[200] overflow-x-auto border-x border-t border-slate-300 bg-white shadow-[0_-6px_18px_rgba(15,23,42,0.16)]",
          floatingBarLayout.visible
            ? "block"
            : "hidden",
        ].join(" ")}
        style={{
          left:
            floatingBarLayout.left,

          width:
            floatingBarLayout.width,
        }}
      >
        <div
          className="h-4"
          style={{
            width:
              contentWidth,
          }}
        />
      </div>
    </div>
  );
}
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({
    items,
    direction = "left",
    speed = "fast",
    pauseOnHover = true,
    className,
}) => {
    const containerRef = React.useRef(null);
    const scrollerRef = React.useRef(null);

    const [start, setStart] = useState(false);
    useEffect(() => {
        const containerNode = containerRef.current;
        const scroller = scrollerRef.current;
        if (!containerNode || !scroller) return;

        const duplicates = Array.from(scroller.children, (item) => item.cloneNode(true));
        duplicates.forEach((item) => scroller.appendChild(item));
        containerNode.style.setProperty("--animation-direction", direction === "left" ? "forwards" : "reverse");
        containerNode.style.setProperty("--animation-duration", speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s");
        setStart(true);

        // React StrictMode and prop changes must not accumulate cloned cards.
        return () => duplicates.forEach((item) => item.remove());
    }, [direction, speed]);
    return (
        <div
            ref={containerRef}
            className={cn(
                "scroller relative z-20  max-w-7xl overflow-hidden  [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
                className
            )}
        >
            <ul
                ref={scrollerRef}
                className={cn(
                    " flex min-w-full shrink-0 gap-4 py-4 w-fit flex-nowrap",
                    start && "animate-scroll ",
                    pauseOnHover && "hover:[animation-play-state:paused]"
                )}
            >
                {items.map((item) => (
                    <li
                        className="w-[350px] max-w-full relative rounded-2xl border border-b-0 flex-shrink-0 border-gold/10 px-8 py-6 md:w-[450px]"
                        style={{
                            background:
                                "linear-gradient(180deg, #1E1C2C, #12111A)",
                        }}
                        key={item.name}
                    >
                        <blockquote>
                            <div
                                aria-hidden="true"
                                className="user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
                            ></div>
                            <span className=" relative z-20 font-editorial italic text-sm leading-[1.6] text-cream-soft font-normal">
                                {item.quote}
                            </span>
                            <div className="relative z-20 mt-6 flex flex-row items-center">
                                <span className="flex flex-col gap-1">
                                    <span className=" text-xs leading-[1.6] text-gold font-title tracking-widest uppercase font-bold">
                                        {item.name}
                                    </span>
                                    <span className=" text-xs leading-[1.6] text-cream-soft font-body font-normal">
                                        {item.title}
                                    </span>
                                </span>
                            </div>
                        </blockquote>
                    </li>
                ))}
            </ul>
        </div>
    );
};

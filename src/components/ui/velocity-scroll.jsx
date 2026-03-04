import React, { useRef } from "react";
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useMotionValue,
    useVelocity,
    useAnimationFrame,
} from "framer-motion";
import { cn } from "@/lib/utils";

const wrap = (min, max, v) => {
    const rangeSize = max - min;
    return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function VelocityScroll({
    text,
    default_velocity = 5,
    className,
}) {
    function ParallaxText({
        children,
        baseVelocity = 100,
        className,
    }) {
        const baseX = useMotionValue(0);
        const { scrollY } = useScroll();
        const scrollVelocity = useVelocity(scrollY);
        const smoothVelocity = useSpring(scrollVelocity, {
            damping: 50,
            stiffness: 400,
        });
        const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
            clamp: false,
        });

        const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

        const directionFactor = useRef(1);
        useAnimationFrame((t, delta) => {
            let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

            if (velocityFactor.get() < 0) {
                directionFactor.current = -1;
            } else if (velocityFactor.get() > 0) {
                directionFactor.current = 1;
            }

            moveBy += directionFactor.current * moveBy * velocityFactor.get();

            baseX.set(baseX.get() + moveBy);
        });

        return (
            <div className="overflow-hidden whitespace-nowrap flex flex-nowrap">
                <motion.div
                    className={cn("text-4xl font-bold tracking-[-0.02em] drop-shadow-sm md:text-7xl md:leading-[5rem]", className)}
                    style={{ x }}
                >
                    <span>{children} </span>
                    <span>{children} </span>
                    <span>{children} </span>
                    <span>{children} </span>
                </motion.div>
            </div>
        );
    }

    return (
        <section className="relative w-full">
            <ParallaxText baseVelocity={default_velocity} className={className}>
                {text}
            </ParallaxText>
            <ParallaxText baseVelocity={-default_velocity} className={className}>
                {text}
            </ParallaxText>
        </section>
    );
}

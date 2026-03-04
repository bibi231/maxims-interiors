"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const animationProps = {
    initial: { "--x": "100%", scale: 0.8 },
    animate: { "--x": "-100%", scale: 1 },
    whileTap: { scale: 0.95 },
    transition: {
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 1,
        type: "spring",
        stiffness: 20,
        damping: 15,
        mass: 2,
        scale: {
            type: "spring",
            stiffness: 200,
            damping: 5,
            mass: 0.5,
        },
    },
}

export const ShinyButton = React.forwardRef(({ children, className, ...props }, ref) => {
    return (
        <motion.button
            ref={ref}
            className={cn(
                "relative cursor-pointer rounded-lg border px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow bg-purple-rich/10 border-gold/10",
                className
            )}
            {...animationProps}
            {...props}
        >
            <span
                className="relative block size-full text-sm tracking-wide text-gold uppercase font-title"
                style={{
                    maskImage:
                        "linear-gradient(-75deg, #C9A84C calc(var(--x) + 20%), transparent calc(var(--x) + 30%), #C9A84C calc(var(--x) + 100%))",
                }}
            >
                {children}
            </span>
            <span
                style={{
                    mask: "linear-gradient(#000, #000) content-box exclude, linear-gradient(#000, #000)",
                    WebkitMask:
                        "linear-gradient(#000, #000) content-box exclude, linear-gradient(#000, #000)",
                    backgroundImage:
                        "linear-gradient(-75deg, rgba(201,168,76,0.1) calc(var(--x)+20%), rgba(201,168,76,0.5) calc(var(--x)+25%), rgba(201,168,76,0.1) calc(var(--x)+100%))",
                }}
                className="absolute inset-0 z-10 block rounded-[inherit] p-px"
            />
        </motion.button>
    )
})
ShinyButton.displayName = "ShinyButton"

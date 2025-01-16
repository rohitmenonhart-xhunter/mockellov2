"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useTransform,
  useScroll,
  useSpring,
  useInView,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface BeamProps {
  children: React.ReactNode;
  className?: string;
}

export default function Beam({ children, className }: BeamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setSvgHeight(contentRef.current.offsetHeight);
    }
  }, []);

  const y1 = useSpring(
    useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]),
    {
      stiffness: 1000,
      damping: 50,
      mass: 0.5,
    }
  );
  const y2 = useSpring(
    useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]),
    {
      stiffness: 1000,
      damping: 50,
      mass: 0.5,
    }
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("relative w-full max-w-4xl mx-auto h-full", className)}
    >
      <div className="absolute left-0 sm:-left-2 md:-left-12 lg:-left-16 -top-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 15,
          }}
          className="ml-2 sm:ml-[14px] md:ml-[27px] h-3 w-3 md:h-4 md:w-4 rounded-full border border-neutral-200 shadow-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.1,
              type: "spring",
              stiffness: 400,
              damping: 15,
            }}
            className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full border border-neutral-300 bg-[#BE185D]"
          />
        </motion.div>
        <motion.svg
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewBox={`0 0 20 ${svgHeight}`}
          width="16"
          height={svgHeight}
          className="ml-1 sm:ml-2 md:ml-4 block"
          aria-hidden="true"
        >
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="#9091A0"
            strokeOpacity="0.16"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="1.5"
            className="motion-reduce:hidden"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <defs>
            <motion.linearGradient
              id="gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1}
              y2={y2}
            >
              <stop stopColor="#BE185D" stopOpacity="0" />
              <stop stopColor="#BE185D" />
              <stop offset="0.325" stopColor="#BE185D" />
              <stop offset="1" stopColor="#BE185D" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </motion.svg>
      </div>
      <div ref={contentRef} className="pl-8 sm:pl-10 md:pl-12 lg:pl-16">{children}</div>
    </motion.div>
  );
} 
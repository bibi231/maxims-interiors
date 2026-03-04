import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto ",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  badge,
  location,
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {badge && (
          <div className="mb-2 inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest bg-gold text-purple-darkest font-bold">
            {badge}
          </div>
        )}
        {icon}
        <div className="font-title font-bold text-purple-rich dark:text-neutral-200 mb-2 mt-2">
          {title}
        </div>
        <div className="font-body font-normal text-charcoal-muted text-xs dark:text-neutral-300">
          {description}
        </div>
        {location && (
          <div className="font-body text-[10px] text-gold/60 mt-2">
            📍 {location}
          </div>
        )}
      </div>
    </div>
  );
};

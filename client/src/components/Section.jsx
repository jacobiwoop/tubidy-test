import React from "react";

const Section = ({ title, children, onShowAll }) => {
  return (
    <section className="mt-12 first:mt-4">
      <div className="flex justify-between items-end mb-6">
        <h2 className="font-headline font-black text-2xl md:text-3xl tracking-tighter uppercase italic">
          {title}
        </h2>
        {onShowAll && (
          <button
            onClick={onShowAll}
            className="text-secondary font-black text-[10px] uppercase tracking-[0.2em] hover:text-primary transition-colors py-1 border-b border-transparent hover:border-primary/50"
          >
            Show all
          </button>
        )}
      </div>
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
        {children}
      </div>
    </section>
  );
};

export default Section;

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { TripGrid } from "./trips";

/* ============================================================
   Homepage — Featured Journeys
   ------------------------------------------------------------
   Reads the same Pilgrimage records as /trips; the only
   difference is the `showOnHomepage` flag the admin sets. No
   trip content is duplicated here.
   ============================================================ */

export const FeaturedTripsSection = ({
  trips = [],
  loading = false,
  titleLead = "Explore Our",
  titleAccent = "Journeys",
  subtitle = "Guided pilgrimages to the places where devotion took root.",
  viewAllLabel = "View All Trips",
  viewAllLink = "/trips"
}) => {
  if (!loading && !trips.length) return null;

  return (
    <section aria-label="Featured journeys" className="relative overflow-hidden bg-bg-cream">
      <div className="mx-auto w-full max-w-shell px-4 py-16 sm:px-6 md:py-20 lg:py-[96px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div className="min-w-0">
            <h2 className="font-display text-[34px] font-bold leading-[1.0] tracking-[-0.02em] text-heading sm:text-[40px] md:text-[46px] lg:text-[52px]">
              {titleLead} <span className="text-primary">{titleAccent}</span>
            </h2>
            <p className="mt-2.5 font-ui text-[15px] leading-[1.55] text-text-muted md:text-[16px]">{subtitle}</p>
          </div>

          <Link
            to={viewAllLink}
            className="group inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border border-primary px-6 py-3 font-ui text-[12.5px] font-bold text-primary-dark transition-colors duration-[250ms] hover:bg-primary/[0.07] sm:self-auto"
          >
            {viewAllLabel}
            <ArrowRight size={14} className="transition-transform duration-[250ms] group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-9 lg:mt-11">
          <TripGrid trips={trips.slice(0, 6)} loading={loading} skeletonCount={3} />
        </div>
      </div>
    </section>
  );
};

export default FeaturedTripsSection;

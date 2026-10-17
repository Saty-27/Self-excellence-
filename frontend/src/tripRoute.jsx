import { useState } from "react";
import { TripDetailPage } from "./tripDetail";
import { PilgrimageBookingModal } from "./bookingModal";

/* Holds the booking modal for the trip detail route, so the page
   itself stays a presentation component. */
export const TripDetailRoute = () => {
  const [bookingTrip, setBookingTrip] = useState(null);

  return (
    <>
      <TripDetailPage onBook={setBookingTrip} />
      <PilgrimageBookingModal
        pilgrimage={bookingTrip}
        open={Boolean(bookingTrip)}
        onClose={() => setBookingTrip(null)}
      />
    </>
  );
};

export default TripDetailRoute;
